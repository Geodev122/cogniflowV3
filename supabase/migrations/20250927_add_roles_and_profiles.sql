-- Migration: add roles, profiles, user_roles, RLS, helper function, and trigger
-- Idempotent where possible; safe to run multiple times

BEGIN;

-- Ensure pgcrypto exists for any uuid/gen usage
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create roles table (normalized optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='roles') THEN
    CREATE TABLE public.roles (
      role_id serial PRIMARY KEY,
      role_name text NOT NULL UNIQUE
    );
    INSERT INTO public.roles (role_name) VALUES ('Therapist'), ('Client'), ('Supervisor'), ('Admin') ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- Create profiles table (authoritative per-user role storage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    CREATE TABLE public.profiles (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      user_role text NOT NULL CHECK (user_role IN ('Therapist','Client','Supervisor','Admin')),
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
  END IF;
END$$;

-- Optional mapping table if a user can have multiple roles in future
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_roles') THEN
    CREATE TABLE public.user_roles (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role_id integer NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
      assigned_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
  END IF;
END$$;

-- Helper function to get the user's role (authoritative from profiles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
    CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT p.user_role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
    $$;
  END IF;
END$$;

-- Enable row level security on profiles and user-owned tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_roles') THEN
    EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- Policies for profiles: users can SELECT their own profile, Admins can do everything, Supervisors can SELECT
DO $$
BEGIN
  -- SELECT policy: owners and Admins/Supervisors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_owner_admin_supervisor') THEN
    CREATE POLICY profiles_select_owner_admin_supervisor ON public.profiles FOR SELECT USING (
      (user_id = auth.uid()) OR (public.get_user_role() = 'Admin') OR (public.get_user_role() = 'Supervisor')
    );
  END IF;

  -- INSERT: allow service_role or Admin to insert, or allow auth to create their own profile when none exists (with check)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (
      (user_id = auth.uid()) OR (public.get_user_role() = 'Admin')
    );
  END IF;

  -- UPDATE: owners and Admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_owner_admin') THEN
    CREATE POLICY profiles_update_owner_admin ON public.profiles FOR UPDATE USING (user_id = auth.uid() OR public.get_user_role() = 'Admin') WITH CHECK (user_id = auth.uid() OR public.get_user_role() = 'Admin');
  END IF;

  -- DELETE: owners and Admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_owner_admin') THEN
    CREATE POLICY profiles_delete_owner_admin ON public.profiles FOR DELETE USING (user_id = auth.uid() OR public.get_user_role() = 'Admin');
  END IF;
END$$;

-- Trigger to auto-create a profile row when a new auth.user is created
-- We create this trigger function in the public schema and attach it to auth.users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'public_create_profile_for_auth_user') THEN
    CREATE OR REPLACE FUNCTION public.public_create_profile_for_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      -- Only create if a profile does not already exist
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
        INSERT INTO public.profiles (user_id, user_role)
        VALUES (NEW.id, 'Client'); -- conservative default
      END IF;
      RETURN NEW;
    END;
    $$;
  END IF;

  -- create trigger if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'trg_create_profile_on_auth_user' AND n.nspname = 'auth'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_create_profile_on_auth_user
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.public_create_profile_for_auth_user();';
  END IF;
END$$;

-- Backfill helper: insert a profile for any existing auth.users missing a profile; uses safe default 'Client'
-- Note: This is not executed automatically; run manually in staging/production when ready
-- INSERT INTO public.profiles (user_id, user_role)
-- SELECT u.id, 'Client' FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE p.user_id IS NULL;

COMMIT;
