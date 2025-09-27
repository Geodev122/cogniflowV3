-- Create custom_forms table if missing, with RLS and a basic owner policy
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='custom_forms') THEN
    CREATE TABLE public.custom_forms (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      therapist_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      schema jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT custom_forms_pkey PRIMARY KEY (id)
    );
    ALTER TABLE public.custom_forms OWNER TO postgres;
    EXECUTE $sql$ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY$sql$;

    -- Policy: owners (therapist_id) can perform all actions; authenticated users may read active forms if needed
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_forms' AND policyname='owner_manage') THEN
      EXECUTE $sql$CREATE POLICY owner_manage ON public.custom_forms FOR ALL TO authenticated USING (therapist_id::text = auth.uid()::text) WITH CHECK (therapist_id::text = auth.uid()::text)$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_forms' AND policyname='public_read_active') THEN
      EXECUTE $sql$CREATE POLICY public_read_active ON public.custom_forms FOR SELECT TO authenticated USING (is_active = true)$sql$;
    END IF;
  END IF;
END$$;

-- Seed a sample custom form for local/dev if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='custom_forms') THEN
    IF (SELECT count(*) FROM public.custom_forms) = 0 THEN
      INSERT INTO public.custom_forms (title, description, schema)
      VALUES ('Sample Intake Form', 'A simple intake form for testing', '{"fields": [{"name":"first_name","type":"text"},{"name":"last_name","type":"text"}]}'::jsonb);
    END IF;
  END IF;
END$$;

COMMIT;
