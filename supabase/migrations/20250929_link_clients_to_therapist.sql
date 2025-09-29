-- 20250929_link_clients_to_therapist.sql
-- Link two client profiles to a therapist via public.therapist_client_relations
-- Safe, idempotent migration: will insert relations only if they do not already exist.
-- Therapist: fb1f33f3-b392-4c99-b4cf-77075df22886
-- Clients:
--   3de362a5-692a-4fe6-9c3a-54f9ef9f3d71
--   44444444-4444-4444-4444-444444444444

-- == Inspection queries (optional) ==
-- Run these first to confirm schema and current state (uncomment to execute):
--
-- -- schema of therapist_client_relations
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'therapist_client_relations' ORDER BY ordinal_position;
--
-- -- check existing relations for the therapist
-- SELECT * FROM public.therapist_client_relations WHERE therapist_id = 'fb1f33f3-b392-4c99-b4cf-77075df22886';
--
-- -- check the profile rows for the clients
-- SELECT id, first_name, last_name, email, patient_code, created_at FROM public.profiles
-- WHERE id IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444');
--

BEGIN;

DO $$
DECLARE
  t_exists boolean;
  r_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'therapist_client_relations'
  ) INTO t_exists;

  IF NOT t_exists THEN
    RAISE NOTICE 'Table public.therapist_client_relations not found; skipping relation inserts.';
    RETURN;
  END IF;

  -- Relation 1
  SELECT EXISTS(
    SELECT 1 FROM public.therapist_client_relations
    WHERE therapist_id = 'fb1f33f3-b392-4c99-b4cf-77075df22886' AND client_id = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
  ) INTO r_exists;

  IF NOT r_exists THEN
    INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, relationship_type, assigned_at)
    VALUES ('fb1f33f3-b392-4c99-b4cf-77075df22886', '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71', 'active', 'primary', now());
    RAISE NOTICE 'Inserted therapist_client_relations for client 3de362a5...';
  ELSE
    RAISE NOTICE 'Relation already exists for client 3de362a5...';
  END IF;

  -- Relation 2
  SELECT EXISTS(
    SELECT 1 FROM public.therapist_client_relations
    WHERE therapist_id = 'fb1f33f3-b392-4c99-b4cf-77075df22886' AND client_id = '44444444-4444-4444-4444-444444444444'
  ) INTO r_exists;

  IF NOT r_exists THEN
    INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, relationship_type, assigned_at)
    VALUES ('fb1f33f3-b392-4c99-b4cf-77075df22886', '44444444-4444-4444-4444-444444444444', 'active', 'primary', now());
    RAISE NOTICE 'Inserted therapist_client_relations for client 44444444...';
  ELSE
    RAISE NOTICE 'Relation already exists for client 44444444...';
  END IF;

  -- Optionally insert into client_profiles mirror if present
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_profiles') THEN
    BEGIN
      INSERT INTO public.client_profiles (therapist_id, client_id)
      SELECT 'fb1f33f3-b392-4c99-b4cf-77075df22886', '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.client_profiles WHERE therapist_id = 'fb1f33f3-b392-4c99-b4cf-77075df22886' AND client_id = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      );
      INSERT INTO public.client_profiles (therapist_id, client_id)
      SELECT 'fb1f33f3-b392-4c99-b4cf-77075df22886', '44444444-4444-4444-4444-444444444444'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.client_profiles WHERE therapist_id = 'fb1f33f3-b392-4c99-b4cf-77075df22886' AND client_id = '44444444-4444-4444-4444-444444444444'
      );
      RAISE NOTICE 'Upserted client_profiles entries (if client_profiles existed).';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'client_profiles upsert skipped or failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Table client_profiles not found; skipping client_profiles inserts.';
  END IF;

END$$;

COMMIT;
