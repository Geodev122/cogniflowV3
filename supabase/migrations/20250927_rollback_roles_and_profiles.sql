-- Rollback: remove policies/triggers/tables added by 20250927_add_roles_and_profiles.sql
-- This rollback is conservative: it will only DROP objects if they exist and will not drop tables if they contain data.

BEGIN;

-- Drop trigger on auth.users if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'trg_create_profile_on_auth_user' AND n.nspname = 'auth'
  ) THEN
  EXECUTE $sql$DROP TRIGGER IF EXISTS trg_create_profile_on_auth_user ON auth.users$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'public_create_profile_for_auth_user') THEN
  EXECUTE $sql$DROP FUNCTION IF EXISTS public.public_create_profile_for_auth_user()$sql$;
  END IF;
END$$;

-- Drop policies on profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_owner_admin_supervisor') THEN
  EXECUTE $sql$DROP POLICY IF EXISTS profiles_select_owner_admin_supervisor ON public.profiles$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own') THEN
  EXECUTE $sql$DROP POLICY IF EXISTS profiles_insert_own ON public.profiles$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_owner_admin') THEN
  EXECUTE $sql$DROP POLICY IF EXISTS profiles_update_owner_admin ON public.profiles$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_owner_admin') THEN
  EXECUTE $sql$DROP POLICY IF EXISTS profiles_delete_owner_admin ON public.profiles$sql$;
  END IF;
END$$;

-- Disable RLS on profiles if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    IF (SELECT count(*) FROM public.profiles) = 0 THEN
  EXECUTE $sql$ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY$sql$;
  EXECUTE $sql$DROP TABLE IF EXISTS public.profiles$sql$;
    END IF;
  END IF;
END$$;

-- Drop user_roles and roles if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_roles') THEN
    IF (SELECT count(*) FROM public.user_roles) = 0 THEN
  EXECUTE $sql$ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY$sql$;
  EXECUTE $sql$DROP TABLE IF EXISTS public.user_roles$sql$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='roles') THEN
    IF (SELECT count(*) FROM public.roles) = 0 THEN
  EXECUTE $sql$DROP TABLE IF EXISTS public.roles$sql$;
    END IF;
  END IF;
END$$;

COMMIT;
