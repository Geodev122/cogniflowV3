-- Add is_active to assessment_library if missing (idempotent)
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_library') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='assessment_library' AND column_name='is_active'
    ) THEN
      ALTER TABLE public.assessment_library
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
  ELSE
    -- If the table doesn't exist yet, create a minimal table with is_active to prevent callers from failing.
    CREATE TABLE public.assessment_library (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      questions jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT assessment_library_pkey PRIMARY KEY (id)
    );
    EXECUTE $sql$ALTER TABLE public.assessment_library ENABLE ROW LEVEL SECURITY$sql$;
  END IF;
END$$;

-- Index to support common queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_library') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='assessment_library' AND indexname='idx_assessment_library_is_active') THEN
      CREATE INDEX idx_assessment_library_is_active ON public.assessment_library(is_active);
    END IF;
  END IF;
END$$;

COMMIT;
