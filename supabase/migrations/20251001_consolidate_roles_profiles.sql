-- 2025-10-01 Consolidate roles and profiles (clean, idempotent)
-- Creates/ensures: user_role enum, roles, profiles, user_roles, role_changes,
-- helper functions and triggers. Safe to re-run in development.

BEGIN;

-- Ensure pgcrypto (used elsewhere for UUID generation/seeds)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure enum for role values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin','supervisor','therapist','client');
  END IF;
END$$;

-- Roles lookup table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='roles') THEN
    CREATE TABLE public.roles (
      role_id serial PRIMARY KEY,
      role_name text NOT NULL UNIQUE
    );
    INSERT INTO public.roles (role_name) VALUES ('therapist'), ('client'), ('supervisor'), ('admin') ON CONFLICT DO NOTHING;
  END IF;
END$$;

-- Profiles table: create if missing, else add missing columns (non-destructive)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      role user_role NOT NULL DEFAULT 'client',
      first_name TEXT,
      last_name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      whatsapp_number TEXT,
      city TEXT,
      country TEXT,
      timezone TEXT DEFAULT 'UTC',
      patient_code TEXT UNIQUE,
      date_of_birth DATE,
      gender TEXT,
      professional_details JSONB DEFAULT '{}',
      verification_status text,
      license_number TEXT,
      password_set BOOLEAN DEFAULT false,
      created_by_therapist UUID REFERENCES public.profiles(id),
      profile_completion_percentage INTEGER DEFAULT 0,
      last_login_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
      ALTER TABLE public.profiles ADD COLUMN role user_role NOT NULL DEFAULT 'client';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name') THEN
      ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_name') THEN
      ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
      ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='patient_code') THEN
      ALTER TABLE public.profiles ADD COLUMN patient_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
      ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role)';
  END IF;
END$$;

-- user_roles mapping table (optional multi-role support)
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

-- role_changes audit table and trigger function to populate it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='role_changes') THEN
    CREATE TABLE public.role_changes (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id uuid NOT NULL,
      old_role text,
      new_role text,
      changed_by uuid,
      changed_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_role_changes_user_id ON public.role_changes(user_id);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.log_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.role_changes (user_id, old_role, new_role, changed_by)
        VALUES (NEW.id, OLD.role::text, NEW.role::text, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'trg_log_profile_role_change' AND n.nspname = 'public'
  ) THEN
    EXECUTE $sql$CREATE TRIGGER trg_log_profile_role_change AFTER UPDATE ON public.profiles FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role) EXECUTE PROCEDURE public.log_role_change()$sql$;
  END IF;
END$$;

-- helper: get_user_role (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET row_security = off AS
$fn$
  SELECT p.role::TEXT FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$fn$;

-- auto-create profile when auth.users row is created
CREATE OR REPLACE FUNCTION public.public_create_profile_for_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, role, email, created_at)
      VALUES (NEW.id, 'client', NEW.email::text, now());
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'trg_create_profile_on_auth_user' AND n.nspname = 'auth'
  ) THEN
    EXECUTE $sql$CREATE TRIGGER trg_create_profile_on_auth_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.public_create_profile_for_auth_user()$sql$;
  END IF;
END$$;

COMMIT;

-- Final note: this migration centralizes role/profile objects. Keep only this copy in version control.
