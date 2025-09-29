-- 20251002_normalize_roles.sql
-- Idempotent migration to normalize role values in the DB to the canonical
-- lowercase enum values ('admin','supervisor','therapist','client').
-- This avoids editing historical migration files and makes runtime data
-- consistent with the canonical consolidation migration.

BEGIN;

-- 1) Ensure canonical enum exists
DO $do_enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE $$CREATE TYPE user_role AS ENUM ('admin','supervisor','therapist','client')$$;
  END IF;
END
$do_enum$ LANGUAGE plpgsql;

-- 2) Normalize values in public.profiles
DO $normalize$
DECLARE
  col_type text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    RAISE NOTICE 'profiles.role column not present, skipping normalization.';
    RETURN;
  END IF;

  SELECT data_type || COALESCE('('||udt_name||')','') INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  LIMIT 1;

  -- If column is already enum user_role or text-like, handle safely
  BEGIN
    -- Try the common case: cast to text, lowercase, and cast back to enum
    UPDATE public.profiles
    SET role = lower(role::text)::user_role
    WHERE role IS NOT NULL AND role::text <> lower(role::text);
    RAISE NOTICE 'Normalized profiles.role using direct enum/text cast.';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Direct enum cast failed, falling back to two-step normalization.';

    -- Fallback: create a temporary text column, normalize there, then convert
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_tmp text;
    UPDATE public.profiles SET role_tmp = lower(COALESCE(role::text, '')) WHERE role_tmp IS NULL OR role_tmp <> lower(COALESCE(role::text, ''));

    -- Ensure the enum exists (again, safe)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      EXECUTE $$CREATE TYPE user_role AS ENUM ('admin','supervisor','therapist','client')$$;
    END IF;

    -- Try to alter type if needed (if role currently text-like)
    BEGIN
      ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING (CASE WHEN role_tmp = '' THEN 'client' ELSE role_tmp END::user_role);
    EXCEPTION WHEN others THEN
      -- If alter fails, attempt to overwrite enum-backed column values from role_tmp
      UPDATE public.profiles SET role = CASE WHEN role_tmp = '' THEN 'client' ELSE role_tmp END::user_role WHERE role_tmp IS NOT NULL;
    END;

    -- Cleanup
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS role_tmp;
    RAISE NOTICE 'Fallback normalization complete.';
  END;
END
$normalize$ LANGUAGE plpgsql;

-- 3) Sanity check: ensure no uppercase role strings remain in text columns referencing role
-- (This only checks; does not alter other tables.)
DO $check$
DECLARE r_count int;
BEGIN
  SELECT COUNT(*) INTO r_count FROM public.profiles WHERE role::text <> lower(role::text);
  IF r_count > 0 THEN
    RAISE NOTICE 'profiles.role still has % non-lowercase values (investigate).', r_count;
  ELSE
    RAISE NOTICE 'profiles.role values are normalized.';
  END IF;
END
$check$ LANGUAGE plpgsql;

COMMIT;
