-- Idempotent migration: create app_progress table (if missing) with RLS
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_progress') THEN
    CREATE TABLE public.app_progress (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES public.app_sessions(id) ON DELETE CASCADE,
      user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      app_id uuid REFERENCES public.gamified_apps(id) ON DELETE CASCADE,
      progress jsonb DEFAULT '{}'::jsonb,
      status text DEFAULT 'in_progress',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT app_progress_pkey PRIMARY KEY (id)
    );
    ALTER TABLE public.app_progress OWNER TO postgres;
    EXECUTE $sql$ALTER TABLE public.app_progress ENABLE ROW LEVEL SECURITY$sql$;

    -- Policy: restrict to owning user
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_progress' AND policyname='owner_access') THEN
      EXECUTE $sql$CREATE POLICY owner_access ON public.app_progress FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text)$sql$;
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_progress') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='app_progress' AND indexname='idx_app_progress_session_id') THEN
      CREATE INDEX idx_app_progress_session_id ON public.app_progress(session_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='app_progress' AND indexname='idx_app_progress_user_id') THEN
      CREATE INDEX idx_app_progress_user_id ON public.app_progress(user_id);
    END IF;
  END IF;
END$$;

COMMIT;
