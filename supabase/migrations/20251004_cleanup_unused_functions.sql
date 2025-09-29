-- 2025-10-04: Draft cleanup migration — drop candidate unused functions
-- WARNING: This migration is conservative. It will only DROP functions in
-- the public schema that (a) match names in the candidate list below,
-- (b) exist in the database, and (c) have no dependent objects recorded in
-- pg_depend (excluding extension metadata). This prevents accidental
-- drops when triggers/views/policies depend on a function.
--
-- Before running:
--  1) Run a repo-wide search to confirm there are no code references to these
--     functions (frontend, serverless functions, or other SQL files).
--  2) Run this migration in a non-production/dev database first.
--
-- The migration uses dynamic discovery to find exact argument lists so
-- DROP FUNCTION will succeed even if signatures differ.

DO $$
DECLARE
  candidate_names text[] := ARRAY[
    -- Candidate function names found only in migration files (reviewed):
    'create_sample_therapist',
    'create_sample_client_with_case',
    'fn_template_items_count',
    'generate_verification_code',
    'update_enrollment_count',
    'increment_promo_usage',
    'calculate_promo_discount'
  ];
  r RECORD;
  dep_count int;
BEGIN
  RAISE NOTICE 'Starting cleanup run for % function name candidates', array_length(candidate_names, 1);

  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY(candidate_names)
  LOOP
    SELECT COALESCE(COUNT(*),0) INTO dep_count
    FROM pg_depend d
    WHERE d.refobjid = r.oid
      -- exclude extension/internal dependency entries
      AND d.deptype IS DISTINCT FROM 'e';

    IF dep_count = 0 THEN
      -- Safe to drop (no DB-level dependents). Drop by exact signature.
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s);', r.proname, r.args);
      RAISE NOTICE 'Dropped function: public.%I(%s)', r.proname, r.args;
    ELSE
      RAISE NOTICE 'Skipping function (has % dependent objects): public.%I(%s)', dep_count, r.proname, r.args;
    END IF;
  END LOOP;

  RAISE NOTICE 'Cleanup run complete. Manual repo-audit recommended.';
END$$;

-- Rollback: no-op. If you want an undo, implement backups or remove DROP lines and re-create from history.
