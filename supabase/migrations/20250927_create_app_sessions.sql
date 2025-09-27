-- Idempotent migration: create app_sessions table (if missing) with RLS
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_sessions') THEN
    CREATE TABLE public.app_sessions (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      app_id uuid REFERENCES public.gamified_apps(id) ON DELETE CASCADE,
      started_at timestamptz NOT NULL DEFAULT now(),
      last_active_at timestamptz NOT NULL DEFAULT now(),
      status text DEFAULT 'active',
      progress jsonb DEFAULT '{}'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT app_sessions_pkey PRIMARY KEY (id)
    );
    ALTER TABLE public.app_sessions OWNER TO postgres;
    EXECUTE $sql$ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY$sql$;

    -- Policy: only the owning user can access their sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_sessions' AND policyname='owner_access') THEN
      EXECUTE $sql$CREATE POLICY owner_access ON public.app_sessions FOR ALL TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text)$sql$;
    END IF;
  END IF;
END$$;

-- Index to support queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='app_sessions' AND indexname='idx_app_sessions_user_id') THEN
      CREATE INDEX idx_app_sessions_user_id ON public.app_sessions(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='app_sessions' AND indexname='idx_app_sessions_app_id') THEN
      CREATE INDEX idx_app_sessions_app_id ON public.app_sessions(app_id);
    END IF;
  END IF;
END$$;

COMMIT;
