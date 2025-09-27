-- Migration: Ensure schema objects required by Therapist features exist
-- - creates NOLOGIN role 'therapist' (idempotent)
-- - ensures public.therapist_licenses, public.messages, public.ce_completions exist
-- - enables RLS and creates conservative policies scoped to auth.uid()
-- NOTE: this migration does NOT create a Storage bucket named 'licensing'. Please create the bucket via the Supabase Storage UI or `supabase storage` CLI if you need public/private settings.

BEGIN;

-- 1) Create a NOLOGIN role to avoid PostgREST SET ROLE runtime errors when a role header leaks
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'therapist') THEN
    CREATE ROLE therapist NOLOGIN;
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

-- 4) CE completions table (defensive create if missing)
CREATE TABLE IF NOT EXISTS public.ce_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours numeric NOT NULL,
  course_id text,
  notes text,
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

COMMIT;

-- End migration
