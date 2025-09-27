-- Ensure ce_completions exists (idempotent)
BEGIN;

CREATE TABLE IF NOT EXISTS public.ce_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT,
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- lightweight RLS policy for therapists (if auth.uid is available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ce_completions' AND policyname='ce_completions_therapist_manage'
  ) THEN
    CREATE POLICY ce_completions_therapist_manage ON public.ce_completions
      FOR ALL TO authenticated
      USING (therapist_id = auth.uid())
      WITH CHECK (therapist_id = auth.uid());
  END IF;
END$$;

COMMIT;
