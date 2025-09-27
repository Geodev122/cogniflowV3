-- Idempotent migration: create gamified_apps table (if missing) with RLS and basic policies
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='gamified_apps') THEN
    CREATE TABLE public.gamified_apps (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      config jsonb,
      is_active boolean NOT NULL DEFAULT true,
      sort_order integer DEFAULT 0,
      created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT gamified_apps_pkey PRIMARY KEY (id)
    );
    ALTER TABLE public.gamified_apps OWNER TO postgres;
    EXECUTE $sql$ALTER TABLE public.gamified_apps ENABLE ROW LEVEL SECURITY$sql$;

    -- Allow authenticated users to read active apps
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gamified_apps' AND policyname='public_read_active') THEN
      EXECUTE $sql$CREATE POLICY public_read_active ON public.gamified_apps FOR SELECT TO authenticated USING (is_active = true)$sql$;
    END IF;

    -- Allow creators (created_by) to manage their entries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gamified_apps' AND policyname='creator_manage') THEN
      EXECUTE $sql$CREATE POLICY creator_manage ON public.gamified_apps FOR ALL TO authenticated USING (created_by::text = auth.uid()::text) WITH CHECK (created_by::text = auth.uid()::text)$sql$;
    END IF;
  END IF;
END$$;

-- Create an index to support common filtering by is_active
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='gamified_apps') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='gamified_apps' AND indexname='idx_gamified_apps_is_active') THEN
      CREATE INDEX idx_gamified_apps_is_active ON public.gamified_apps(is_active);
    END IF;
  END IF;
END$$;

-- Seed a sample app for local/dev
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='gamified_apps') THEN
    IF (SELECT count(*) FROM public.gamified_apps) = 0 THEN
      INSERT INTO public.gamified_apps (title, description, config)
      VALUES ('Sample Gamified App', 'Demo activity for local testing', '{"levels":[],"rewards":[]}');
    END IF;
  END IF;
END$$;

COMMIT;
