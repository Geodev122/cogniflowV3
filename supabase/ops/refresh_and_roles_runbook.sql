-- Operator runbook: create unique index for CONCURRENT refresh, ensure hardened get_user_role(), and install serialized refresh helpers
-- Run these commands in staging first. Any CONCURRENT REFRESH must be run outside a transaction.

-- 1) Create unique index needed for REFRESH MATERIALIZED VIEW CONCURRENTLY (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname = 'idx_assessment_instance_latest_score_instance_id'
  ) THEN
    EXECUTE $sql$CREATE UNIQUE INDEX CONCURRENTLY idx_assessment_instance_latest_score_instance_id ON public.assessment_instance_latest_score(instance_id)$sql$;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Index creation skipped or deferred (may require exclusive locks or duplicates): %', SQLERRM;
END$$;

-- 2) Hardened get_user_role() - create idempotently outside DO $$ wrappers if your migration tooling requires it
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET row_security = off
AS $fn$
  SELECT COALESCE(p.user_role, p.role)::TEXT
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$fn$;

-- 3) Serialized refresh helper (uses advisory lock to avoid concurrent REFRESH conflicts when run inside transactions)
CREATE OR REPLACE FUNCTION public.refresh_materialized_view_serialized(mv_name text)
RETURNS VOID
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- use a stable advisory lock id (choose a numeric constant unlikely to collide)
  PERFORM pg_advisory_xact_lock(1234567890);
  EXECUTE format('REFRESH MATERIALIZED VIEW %s', mv_name);
END;
$fn$;

-- 4) Notes for operator
-- * After creating the unique index above, run REFRESH MATERIALIZED VIEW CONCURRENTLY <mv_name> outside a transaction to avoid blocking other sessions.
-- * If you cannot run CREATE INDEX CONCURRENTLY in your environment (some managed services restrict it), create the index without CONCURRENTLY during a maintenance window.
-- * Review SECURITY DEFINER functions (like get_user_role) for side effects and ensure the owner is a role with minimal privileges.
-- * Test these steps in staging and verify with: SELECT * FROM pg_matviews; and SELECT * FROM pg_indexes WHERE indexname LIKE 'idx_assessment_%';
