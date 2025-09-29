-- supabase/sql/fix_assessment_refreshes.sql
-- Safe fixes for materialized-view refreshes and index used for CONCURRENT refresh
-- Paste and run this in your Supabase SQL editor (or psql) as a one-off to install safe functions.

-- 1) Ensure unique index exists (safe no-op if already present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id
  ON public.assessment_instance_latest_score(instance_id);

-- 2) Serialized refresh function for analytics views
-- This function acquires a transaction-scoped advisory lock so multiple concurrent
-- refresh callers will serialize rather than deadlock each other.
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  -- Ensure unique index exists (defensive)
  PERFORM 1 FROM pg_class WHERE relname = 'idx_assessment_instance_latest_score_instance_id';
  IF NOT FOUND THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id ON public.assessment_instance_latest_score(instance_id)';
  END IF;

  -- Use a transaction-scoped advisory lock to serialize refreshes across sessions.
  -- Using the same key everywhere involved in refreshes prevents deadlock cycles.
  PERFORM pg_advisory_xact_lock(2039283749);

  REFRESH MATERIALIZED VIEW public.assessment_instance_latest_score;
  REFRESH MATERIALIZED VIEW public.therapist_dashboard_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Trigger-safe refresh function used by assessment-related triggers
CREATE OR REPLACE FUNCTION public.refresh_assessment_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Serialize with the same advisory lock key as above
  PERFORM pg_advisory_xact_lock(2039283749);
  REFRESH MATERIALIZED VIEW public.assessment_instance_latest_score;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Optional: helper note for running CONCURRENT refreshes (must be run outside
-- of transaction / not from inside functions or triggers). Run in a standalone session:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.assessment_instance_latest_score;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.therapist_dashboard_summary;

-- 5) Quick verification queries you can run after applying the script
-- Check the status column type
-- SELECT status, pg_typeof(status) FROM public.assessment_instance_latest_score LIMIT 1;

-- Check that functions and index exist
-- SELECT proname FROM pg_proc WHERE proname LIKE 'refresh_%';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'assessment_instance_latest_score';

-- End of file
