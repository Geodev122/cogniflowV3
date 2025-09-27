-- Migration: create resources table for continuing education / resource library
-- Idempotent: only creates table and sample rows if they don't already exist

BEGIN;

-- Ensure pgcrypto exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='resources') THEN
    CREATE TABLE public.resources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      provider text,
      hours integer,
      description text,
      url text,
      content_type text,
      category text,
      content jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_resources_content_type ON public.resources(content_type);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
  END IF;
END$$;

-- Seed a couple of sample course rows if table is empty
DO $$
BEGIN
  IF (SELECT count(*) FROM public.resources) = 0 THEN
    INSERT INTO public.resources (title, provider, hours, description, url, content_type, category)
    VALUES
      ('Foundations of Evidence-Based Therapy', 'Thera Academy', 8, 'An 8-hour certificate course covering core evidence-based approaches.', 'https://example.com/ebt-course', 'course', 'educational'),
      ('Clinical Ethics and Boundaries', 'PracticeSafe', 3, 'A short course on ethics and client boundaries for practicing therapists.', 'https://example.com/ethics', 'course', 'educational');
  END IF;
END$$;

COMMIT;
