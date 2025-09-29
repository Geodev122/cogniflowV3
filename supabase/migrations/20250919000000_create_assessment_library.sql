
CREATE TABLE IF NOT EXISTS public.assessment_library (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  questions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_library OWNER TO postgres;

-- Add primary key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_library_pkey'
      AND conrelid = 'public.assessment_library'::regclass
  ) THEN
    ALTER TABLE ONLY public.assessment_library
      ADD CONSTRAINT assessment_library_pkey PRIMARY KEY (id);
  END IF;
END
$$;

ALTER TABLE public.assessment_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow therapists to read all assessments" ON public.assessment_library;
CREATE POLICY "Allow therapists to read all assessments" ON public.assessment_library FOR SELECT TO authenticated USING (
  (public.get_user_role() = 'therapist')
);

DROP POLICY IF EXISTS "Allow users to read their own assessments" ON public.assessment_library;
DO $$
BEGIN
  -- Only create this policy if the assessment_instances table exists and has user_id column
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assessment_instances') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assessment_instances' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DROP POLICY IF EXISTS "Allow users to read their own assessments" ON public.assessment_library';
      EXECUTE $policy$
        CREATE POLICY "Allow users to read their own assessments" ON public.assessment_library
          FOR SELECT TO authenticated USING (
            auth.uid() IN (
              SELECT ai.user_id FROM public.assessment_instances ai WHERE ai.assessment_id = public.assessment_library.id
            )
          );
      $policy$;
    ELSE
      RAISE NOTICE 'Skipping allow_users_read_own policy: assessment_instances.user_id column not found';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping allow_users_read_own policy: assessment_instances table not found';
  END IF;
END
$$;