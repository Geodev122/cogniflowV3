-- Migration: Ensure schema objects required by Therapist features exist
-- - creates NOLOGIN role 'therapist' (idempotent)
-- - ensures public.therapist_licenses, public.messages, public.ce_completions exist
-- - enables RLS and creates conservative policies scoped to auth.uid()
-- NOTE: this migration does NOT create a Storage bucket named 'licensing'. Please create the bucket via the Supabase Storage UI or `supabase storage` CLI if you need public/private settings.

BEGIN;

-- Ensure pgcrypto exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create a NOLOGIN role to avoid PostgREST SET ROLE runtime errors when a role header leaks
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'therapist') THEN
    -- Try to create the role, but swallow permission errors so the migration
    -- remains safe to run in managed environments where CREATE ROLE is
    -- restricted (for example, Supabase managed Postgres instances).
    BEGIN
      CREATE ROLE therapist NOLOGIN;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping CREATE ROLE therapist (insufficient privileges or role already managed externally): %', SQLERRM;
    END;
  END IF;
END
$$;

-- 2) therapist_licenses table (stores uploaded license file metadata)
CREATE TABLE IF NOT EXISTS public.therapist_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_licenses_therapist_id ON public.therapist_licenses (therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_licenses_status ON public.therapist_licenses (status);
CREATE INDEX IF NOT EXISTS idx_therapist_licenses_expires ON public.therapist_licenses (expires_on);

ALTER TABLE IF EXISTS public.therapist_licenses ENABLE ROW LEVEL SECURITY;

-- Policies: allow therapists to operate on their own rows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'therapist_licenses' AND policyname = 'therapist_licenses_select_policy') THEN
    CREATE POLICY therapist_licenses_select_policy ON public.therapist_licenses
      USING (therapist_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'therapist_licenses' AND policyname = 'therapist_licenses_insert_policy') THEN
    CREATE POLICY therapist_licenses_insert_policy ON public.therapist_licenses
      FOR INSERT WITH CHECK (therapist_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'therapist_licenses' AND policyname = 'therapist_licenses_delete_policy') THEN
    CREATE POLICY therapist_licenses_delete_policy ON public.therapist_licenses
      FOR DELETE USING (therapist_id = auth.uid());
  END IF;
END
$$;

-- Align therapist_licenses with expected columns from current DB snapshot: add optional metadata columns if they are missing
ALTER TABLE public.therapist_licenses
  ADD COLUMN IF NOT EXISTS license_name text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS issuing_authority text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state_province text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS issued_date date,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- Ensure FK for verified_by (if column exists and profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='therapist_licenses' AND column_name='verified_by') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.therapist_licenses'::regclass AND contype = 'f' AND conname = 'therapist_licenses_verified_by_fkey') THEN
        ALTER TABLE public.therapist_licenses ADD CONSTRAINT therapist_licenses_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);
      END IF;
    EXCEPTION WHEN others THEN
      -- ignore
    END;
  END IF;
END
$$;

-- 3) messages table (app-level messages; OK if you already have a messages implementation in another schema)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages (recipient_id);

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_select_policy') THEN
    CREATE POLICY messages_select_policy ON public.messages
      USING (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_policy') THEN
    CREATE POLICY messages_insert_policy ON public.messages
      FOR INSERT WITH CHECK (sender_id = auth.uid());
  END IF;
END
$$;

-- Ensure sender/recipient indexes exist and foreign keys (idempotent)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages (recipient_id);

DO $$
BEGIN
  -- Add FK constraints only if profiles table exists and constraint missing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'f' AND conname = 'messages_sender_id_fkey') THEN
      ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'f' AND conname = 'messages_recipient_id_fkey') THEN
      ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

-- 4) CE completions table (defensive create if missing)
CREATE TABLE IF NOT EXISTS public.ce_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours numeric(5,2) NOT NULL DEFAULT 0,
  course_id text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_completions_therapist_id ON public.ce_completions (therapist_id);

ALTER TABLE IF EXISTS public.ce_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ce_completions' AND policyname = 'ce_completions_select_policy') THEN
    CREATE POLICY ce_completions_select_policy ON public.ce_completions
      USING (therapist_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ce_completions' AND policyname = 'ce_completions_insert_policy') THEN
    CREATE POLICY ce_completions_insert_policy ON public.ce_completions
      FOR INSERT WITH CHECK (therapist_id = auth.uid());
  END IF;
END
$$;

-- Ensure ce_completions has expected columns/indexes
CREATE INDEX IF NOT EXISTS idx_ce_completions_therapist_id ON public.ce_completions (therapist_id);

ALTER TABLE public.ce_completions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;


COMMIT;

-- End migration
