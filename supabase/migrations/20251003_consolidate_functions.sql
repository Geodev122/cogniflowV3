-- 20251003_consolidate_functions.sql
-- Idempotent consolidation of common DB helper functions used by triggers/policies.
-- Purpose: provide canonical, CREATE OR REPLACE implementations so historical
-- migrations can be left intact and the runtime DB uses a single authoritative
-- implementation for each helper.

BEGIN;

-- Ensure supporting sequence exists for case numbers
CREATE SEQUENCE IF NOT EXISTS public.case_number_seq START 1;

-- 1) update_updated_at_column: generic trigger to set updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := COALESCE(NEW.updated_at, now());
  RETURN NEW;
END;
$$;

-- 2) generate_case_number: trigger to set case_number if missing
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.case_number IS NULL OR length(trim(NEW.case_number)) = 0 THEN
    NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 3) generate_patient_code: trigger-style generator (non-deterministic fallback)
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.patient_code IS NULL OR length(trim(NEW.patient_code)) = 0 THEN
    IF COALESCE(NEW.role::text, '') = 'client' THEN
      NEW.patient_code := 'PT' || LPAD((floor(random()*900000+100000))::text, 6, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) RPC: deterministic patient code generator and ensure RPC
CREATE OR REPLACE FUNCTION public.generate_patient_code(p_uuid uuid)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  code text;
BEGIN
  -- Deterministic-ish code based on md5 of uuid; prefix PT and uppercase
  code := 'PT' || upper(substring(md5(p_uuid::text) from 1 for 9));
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_patient_code(p_profile uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  existing text;
  v_code text;
BEGIN
  SELECT patient_code INTO existing FROM public.profiles WHERE id = p_profile;
  IF existing IS NOT NULL AND length(trim(existing)) > 0 THEN
    RETURN existing;
  END IF;
  v_code := public.generate_patient_code(p_profile);
  BEGIN
    UPDATE public.profiles SET patient_code = v_code WHERE id = p_profile AND (patient_code IS NULL OR length(trim(patient_code)) = 0);
  EXCEPTION WHEN others THEN
    -- If update fails for concurrency, return any current value
    SELECT patient_code INTO existing FROM public.profiles WHERE id = p_profile;
    IF existing IS NOT NULL THEN
      RETURN existing;
    END IF;
  END;
  RETURN v_code;
END;
$$;

-- 5) refresh_analytics_views: safe refresh helper using advisory lock
-- If an incompatible function with a different return type exists, drop it first.
DO $$
DECLARE
  rec RECORD;
  dep_count int;
BEGIN
  FOR rec IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'refresh_analytics_views' AND n.nspname = 'public'
      AND p.prorettype <> 'pg_catalog.void'::regtype
  LOOP
    SELECT count(*) INTO dep_count
    FROM pg_depend d
    WHERE d.refclassid = 'pg_proc'::regclass AND d.refobjid = rec.oid;

    IF dep_count > 0 THEN
      RAISE NOTICE 'Found incompatible function public.refresh_analytics_views() (oid=%) with % dependent object(s); skipping DROP to avoid breaking dependencies', rec.oid, dep_count;
    ELSE
      RAISE NOTICE 'Dropping incompatible function public.refresh_analytics_views() (oid=%) to allow replacement', rec.oid;
      EXECUTE 'DROP FUNCTION public.refresh_analytics_views()';
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  rec RECORD;
  dep_count int;
  ok boolean := true;
BEGIN
  -- If an incompatible function exists and has dependents, skip creating a new signature
  FOR rec IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'refresh_analytics_views' AND n.nspname = 'public'
      AND p.prorettype <> 'pg_catalog.void'::regtype
  LOOP
    SELECT count(*) INTO dep_count
    FROM pg_depend d
    WHERE d.refclassid = 'pg_proc'::regclass AND d.refobjid = rec.oid;

    IF dep_count > 0 THEN
      RAISE NOTICE 'Found incompatible function public.refresh_analytics_views() (oid=%) with % dependent object(s); skipping creation to avoid breaking dependencies', rec.oid, dep_count;
      ok := false;
      EXIT;
    ELSE
      -- safe to drop the incompatible function so we can recreate the desired signature
      RAISE NOTICE 'Dropping incompatible function public.refresh_analytics_views() (oid=%) to allow replacement', rec.oid;
      EXECUTE 'DROP FUNCTION IF EXISTS public.refresh_analytics_views()';
    END IF;
  END LOOP;

  IF ok THEN
    EXECUTE $create$
    CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
    RETURNS void
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      got_lock boolean := false;
    BEGIN
      -- Use an advisory lock to avoid concurrent refreshes
      got_lock := pg_try_advisory_lock(43123);
      IF NOT got_lock THEN
        RAISE NOTICE 'refresh_analytics_views: lock busy, skipping refresh';
        RETURN;
      END IF;
      BEGIN
        -- Refresh commonly-used materialized views if they exist
        IF to_regclass('public.vw_assessment_analytics') IS NOT NULL THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_assessment_analytics;
        END IF;
        IF to_regclass('public.vw_case_analytics') IS NOT NULL THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_case_analytics;
        END IF;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'refresh_analytics_views: refresh error %', SQLERRM;
      END;
      PERFORM pg_advisory_unlock(43123);
    END;
    $fn$;
    $create$;
  END IF;
END
$$;

-- 6) refresh_assessment_views: convenience wrapper
-- If an incompatible function with a different return type exists, drop it first.
DO $$
DECLARE
  rec RECORD;
  dep_count int;
BEGIN
  FOR rec IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'refresh_assessment_views' AND n.nspname = 'public'
      AND p.prorettype <> 'pg_catalog.void'::regtype
  LOOP
    SELECT count(*) INTO dep_count
    FROM pg_depend d
    WHERE d.refclassid = 'pg_proc'::regclass AND d.refobjid = rec.oid;

    IF dep_count > 0 THEN
      RAISE NOTICE 'Found incompatible function public.refresh_assessment_views() (oid=%) with % dependent object(s); skipping DROP to avoid breaking dependencies', rec.oid, dep_count;
    ELSE
      RAISE NOTICE 'Dropping incompatible function public.refresh_assessment_views() (oid=%) to allow replacement', rec.oid;
      EXECUTE 'DROP FUNCTION public.refresh_assessment_views()';
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  rec RECORD;
  dep_count int;
  ok boolean := true;
BEGIN
  -- If an incompatible function exists and has dependents, skip creating a new signature
  FOR rec IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'refresh_assessment_views' AND n.nspname = 'public'
      AND p.prorettype <> 'pg_catalog.void'::regtype
  LOOP
    SELECT count(*) INTO dep_count
    FROM pg_depend d
    WHERE d.refclassid = 'pg_proc'::regclass AND d.refobjid = rec.oid;

    IF dep_count > 0 THEN
      RAISE NOTICE 'Found incompatible function public.refresh_assessment_views() (oid=%) with % dependent object(s); skipping creation to avoid breaking dependencies', rec.oid, dep_count;
      ok := false;
      EXIT;
    ELSE
      -- safe to drop the incompatible function so we can recreate the desired signature
      RAISE NOTICE 'Dropping incompatible function public.refresh_assessment_views() (oid=%) to allow replacement', rec.oid;
      EXECUTE 'DROP FUNCTION IF EXISTS public.refresh_assessment_views()';
    END IF;
  END LOOP;

  IF ok THEN
    EXECUTE $create$
    CREATE OR REPLACE FUNCTION public.refresh_assessment_views()
    RETURNS void
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      PERFORM public.refresh_analytics_views();
      -- Additional refreshes for assessment-specific views (if present)
      IF to_regclass('public.assessment_summary') IS NOT NULL THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.assessment_summary;
      END IF;
    END;
    $fn$;
    $create$;
  END IF;
END
$$;

COMMIT;
