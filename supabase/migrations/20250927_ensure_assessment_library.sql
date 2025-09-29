-- Migration: ensure assessment_library exists (idempotent)
-- Creates table, PK, RLS and policies, and seeds sample rows if empty

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_library') THEN
    CREATE TABLE public.assessment_library (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      questions jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.assessment_library OWNER TO postgres;
    ALTER TABLE ONLY public.assessment_library ADD CONSTRAINT assessment_library_pkey PRIMARY KEY (id);

    -- Enable RLS
    EXECUTE $sql$ALTER TABLE public.assessment_library ENABLE ROW LEVEL SECURITY$sql$;

    -- Allow therapists to read all assessments
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='assessment_library' AND policyname='allow_therapists_read_all'
    ) THEN
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
        EXECUTE $sql$
          CREATE POLICY allow_therapists_read_all
          ON public.assessment_library
          FOR SELECT
          TO authenticated
          USING ((public.get_user_role())::text ILIKE 'therapist')
        $sql$;
      ELSE
        EXECUTE $sql$
          CREATE POLICY allow_therapists_read_all
          ON public.assessment_library
          FOR SELECT
          TO authenticated
          USING ((coalesce(current_setting('jwt.claims.role', true), '')::text) ILIKE 'therapist')
        $sql$;
      END IF;
    ELSE
      RAISE NOTICE 'Skipping allow_therapists_read_all policy: already exists';
    END IF;

    -- Allow users to read their own assessment instances (if assessment_instances exists and has user_id)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='assessment_instances') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='assessment_library' AND policyname='allow_users_read_own'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='assessment_instances' AND column_name='user_id'
        ) THEN
          EXECUTE $sql$
            CREATE POLICY allow_users_read_own
            ON public.assessment_library
            FOR SELECT
            TO authenticated
            USING (
              auth.uid() IN (
                SELECT ai.user_id FROM public.assessment_instances ai WHERE ai.assessment_id = assessment_library.id
              )
            )
          $sql$;
        ELSE
          RAISE NOTICE 'Skipping allow_users_read_own policy: assessment_instances.user_id column not found';
        END IF;
      END IF;
    END IF;

  END IF;
END
$$;

-- seed a couple of sample assessments if empty (helpful for local/dev)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='assessment_library') THEN
    IF (SELECT count(*) FROM public.assessment_library) = 0 THEN
      INSERT INTO public.assessment_library (name, description, questions)
      VALUES
        ('Adult Depression Screen', 'PHQ-9 style screening', '[{"q":"Little interest or pleasure in doing things?"}]'::jsonb),
        ('General Anxiety Screen', 'GAD-7 style screening', '[{"q":"Feeling nervous, anxious or on edge?"}]'::jsonb);
    END IF;
  END IF;
END
$$;

COMMIT;