-- RLS policies on public.cases to ensure only assigned therapists with accepted assignments can create/update/delete
-- Generated: 2025-09-20

BEGIN;

-- Only create policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN

    -- Drop existing named policies so this migration is idempotent
    PERFORM (CASE WHEN TRUE THEN NULL END);
    EXECUTE 'DROP POLICY IF EXISTS allow_insert_if_assignment_accepted ON public.cases';
    EXECUTE 'DROP POLICY IF EXISTS allow_update_if_assignment_accepted ON public.cases';
    EXECUTE 'DROP POLICY IF EXISTS allow_delete_if_assignment_accepted ON public.cases';

    -- INSERT: require an accepted assignment linking therapist (auth.uid()) to the client
    EXECUTE $pol$
    CREATE POLICY allow_insert_if_assignment_accepted ON public.cases
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.client_id = NEW.client_id
            AND a.therapist_id = auth.uid()
            AND a.status = 'accepted'
        )
      );
    $pol$;

    -- UPDATE: allow therapist to update only their own cases and only if they are assigned and accepted
    EXECUTE $pol$
    CREATE POLICY allow_update_if_assignment_accepted ON public.cases
      FOR UPDATE TO authenticated
      USING (
        therapist_id = auth.uid() AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.client_id = public.cases.client_id
            AND a.therapist_id = auth.uid()
            AND a.status = 'accepted'
        )
      )
      WITH CHECK (
        therapist_id = auth.uid()
      );
    $pol$;

    -- DELETE: same restriction as update
    EXECUTE $pol$
    CREATE POLICY allow_delete_if_assignment_accepted ON public.cases
      FOR DELETE TO authenticated
      USING (
        therapist_id = auth.uid() AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.client_id = public.cases.client_id
            AND a.therapist_id = auth.uid()
            AND a.status = 'accepted'
        )
      );
    $pol$;

  ELSE
    RAISE NOTICE 'Skipping cases RLS migration: public.cases table not found.';
  END IF;
END$$;

COMMIT;
