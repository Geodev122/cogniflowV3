-- Optional migration: create a NOLOGIN DB role named 'therapist'
-- Purpose: temporary mitigation for environments where upstream proxies or headers cause PostgREST to attempt SET ROLE 'therapist'.
-- WARNING: Prefer removing the header at the proxy/edge. This migration is a stop-gap and should be removed once the header source is fixed.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'therapist') THEN
    PERFORM format('CREATE ROLE %I NOLOGIN', 'therapist');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'create therapist role: %', SQLERRM;
END$$;

COMMIT;

-- To rollback manually (requires superuser):
-- DROP ROLE IF EXISTS therapist;
