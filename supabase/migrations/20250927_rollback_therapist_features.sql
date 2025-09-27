-- Rollback migration for therapist features adjustment
-- This script attempts to undo the changes made by 20250927_adjust_schema_for_therapist_features.sql
-- It is conservative: it will only DROP tables if they are empty, remove policies/indexes/columns we added, and drop the 'therapist' role if present.

BEGIN;

-- Remove policies we created (if exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='therapist_licenses' AND policyname='therapist_licenses_select_policy') THEN
    DROP POLICY IF EXISTS therapist_licenses_select_policy ON public.therapist_licenses;
  END IF;
  DROP POLICY IF EXISTS therapist_licenses_insert_policy ON public.therapist_licenses;
  DROP POLICY IF EXISTS therapist_licenses_delete_policy ON public.therapist_licenses;
  DROP POLICY IF EXISTS messages_select_policy ON public.messages;
  DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
  DROP POLICY IF EXISTS ce_completions_select_policy ON public.ce_completions;
  DROP POLICY IF EXISTS ce_completions_insert_policy ON public.ce_completions;
EXCEPTION WHEN others THEN
  -- ignore
END;
$$;

-- Remove indexes we added (if exist)
DROP INDEX IF EXISTS idx_therapist_licenses_status;
DROP INDEX IF EXISTS idx_therapist_licenses_expires;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_recipient_id;
DROP INDEX IF EXISTS idx_ce_completions_therapist_id;

-- Remove columns we added to therapist_licenses
ALTER TABLE IF EXISTS public.therapist_licenses
  DROP COLUMN IF EXISTS license_name,
  DROP COLUMN IF EXISTS license_number,
  DROP COLUMN IF EXISTS issuing_authority,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS state_province,
  DROP COLUMN IF EXISTS original_filename,
  DROP COLUMN IF EXISTS issued_date,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS verification_notes;

-- Remove FK constraint for verified_by if exists
ALTER TABLE IF EXISTS public.therapist_licenses DROP CONSTRAINT IF EXISTS therapist_licenses_verified_by_fkey;

-- Attempt to DROP tables we created only if they are empty (prevent accidental data loss)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    IF (SELECT count(*) FROM public.messages) = 0 THEN
      DROP TABLE public.messages;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ce_completions') THEN
    IF (SELECT count(*) FROM public.ce_completions) = 0 THEN
      DROP TABLE public.ce_completions;
    END IF;
  END IF;
  -- For therapist_licenses we are more conservative: don't drop table automatically because it likely contains data
END
$$;

-- Drop role 'therapist' if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='therapist') THEN
    PERFORM pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'therapist';
    DROP ROLE IF EXISTS therapist;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END;
$$;

COMMIT;
