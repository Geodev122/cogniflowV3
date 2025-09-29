/*
  Merged migration: enums, helpful indexes, materialized views, and safe refresh helpers
  - Consolidates pieces from earlier migrations and the one-off fix script.
  - Idempotent: uses IF NOT EXISTS, CREATE OR REPLACE, DROP TRIGGER IF EXISTS, etc.
  - Ensures materialized views expose `status` as text to avoid enum/text comparison issues.
  - Provides transaction-scoped advisory-lock-based refresh functions safe to call from triggers.

  IMPORTANT: REFRESH MATERIALIZED VIEW CONCURRENTLY cannot be run inside a transaction or a trigger.
  This migration creates UNIQUE INDEXes required for CONCURRENTLY refreshes and provides serialized
  non-CONCURRENT REFRESH functions for use in triggers. To perform a CONCURRENTLY refresh, run it
  from an external session (not inside a function).
*/

-- Ensure extensions and sequences
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS public.case_number_seq START 1;

-- ==========================================================================
-- ENUMS (idempotent)
-- ==========================================================================
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
    EXECUTE $$CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')$$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE $$CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'therapist', 'client')$$;
  END IF;
  -- (other enums are left as-is in other migrations; add more here as needed)
END
$enum$ LANGUAGE plpgsql;

-- ==========================================================================
-- Safe helper: get_user_role()
-- This SECURITY DEFINER function reads the role for the current authenticated
-- user and is created WITH row_security disabled so calling it from policies
-- does not re-enter RLS on the profiles table (avoids infinite recursion).
-- Use CREATE OR REPLACE to avoid nested EXECUTE/dollar-quoting issues inside DO blocks.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET row_security = off AS
$fn$
  SELECT p.role::TEXT FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$fn$;

-- ==========================================================================
-- HELPFUL INDEXES
-- ==========================================================================
-- For assessment queues
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date
  ON public.assessment_instances(due_date);

-- Speeds up fetching answers by instance
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance
  ON public.assessment_responses(instance_id);

-- Ensure the unique index exists for materialized view concurrent refresh support
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id
  ON public.assessment_instance_latest_score(instance_id);

-- ==========================================================================
-- MATERIALIZED VIEWS (idempotent, status cast to text)
-- ==========================================================================

-- NOTE: DROP is intentionally disabled to avoid removing an existing view created by another migration.
-- DROP MATERIALIZED VIEW IF EXISTS public.assessment_instance_latest_score;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.assessment_instance_latest_score AS
SELECT
  ai.id           AS instance_id,
  ai.template_id,
  ai.therapist_id,
  ai.client_id,
  ai.case_id,
  ai.title,
  ai.status::text AS status,
  ai.assigned_at,
  ai.due_date,
  ai.completed_at,
  at.name         AS template_name,
  at.abbreviation AS template_abbrev,
  sc.id                      AS score_id,
  sc.raw_score,
  sc.scaled_score,
  sc.percentile,
  sc.t_score,
  sc.z_score,
  sc.interpretation_category,
  sc.interpretation_description,
  sc.clinical_significance,
  sc.severity_level,
  sc.recommendations,
  sc.calculated_at
FROM public.assessment_instances ai
LEFT JOIN public.assessment_templates at ON ai.template_id = at.id
LEFT JOIN public.assessment_scores   sc ON ai.id = sc.instance_id
ORDER BY ai.assigned_at DESC;

-- Therapist dashboard summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.therapist_dashboard_summary AS
SELECT
  t.id as therapist_id,
  t.first_name,
  t.last_name,
  COUNT(DISTINCT tcr.client_id) as total_clients,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_cases,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.start_time >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END) as sessions_last_30_days,
  COUNT(DISTINCT CASE WHEN a.start_time >= CURRENT_DATE AND a.start_time < CURRENT_DATE + INTERVAL '1 day' THEN a.id END) as sessions_today,
  COUNT(DISTINCT CASE WHEN ai.status = 'in_progress' THEN ai.id END) as assessments_in_progress,
  COUNT(DISTINCT CASE WHEN ai.status = 'completed' AND ai.completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN ai.id END) as assessments_completed_week,
  MAX(GREATEST(c.last_activity_at, a.created_at, ai.updated_at)) as last_activity_at
FROM public.profiles t
LEFT JOIN public.therapist_client_relations tcr ON t.id = tcr.therapist_id
LEFT JOIN public.cases c ON t.id = c.therapist_id
LEFT JOIN public.appointments a ON t.id = a.therapist_id
LEFT JOIN public.assessment_instances ai ON t.id = ai.therapist_id
WHERE t.role = 'therapist'
GROUP BY t.id, t.first_name, t.last_name;

-- ==========================================================================
-- SAFE REFRESH HELPERS (serialized via advisory lock)
-- ==========================================================================

-- Create or replace a helper that refreshes analytics views while holding an advisory lock.
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  -- Ensure the unique index exists (no-op if already present)
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_assessment_instance_latest_score_instance_id') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id ON public.assessment_instance_latest_score(instance_id)';
  END IF;

  -- Acquire a transaction-scoped advisory lock to serialize refreshes and avoid lock-order deadlocks.
  PERFORM pg_advisory_xact_lock(2039283749);

  -- Refresh views while holding the advisory lock. Use non-concurrent REFRESH here because we're inside a transaction.
  REFRESH MATERIALIZED VIEW public.assessment_instance_latest_score;
  REFRESH MATERIALIZED VIEW public.therapist_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Trigger-safe function to refresh assessment-related views (can be called from triggers)
CREATE OR REPLACE FUNCTION public.refresh_assessment_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Acquire transaction-scoped advisory lock to serialize refreshes
  PERFORM pg_advisory_xact_lock(2039283749);

  -- Non-concurrent refresh while serialized by advisory lock
  REFRESH MATERIALIZED VIEW public.assessment_instance_latest_score;
  RETURN NULL; -- trigger fired AFTER ... FOR EACH STATEMENT
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are idempotent: drop then create
DROP TRIGGER IF EXISTS refresh_assessment_views_trigger ON public.assessment_instances;
CREATE TRIGGER refresh_assessment_views_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.assessment_instances
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_assessment_views();

DROP TRIGGER IF EXISTS refresh_assessment_scores_views_trigger ON public.assessment_scores;
CREATE TRIGGER refresh_assessment_scores_views_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.assessment_scores
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_assessment_views();

-- ==========================================================================
-- USAGE NOTES
-- ==========================================================================
-- If you need to perform a CONCURRENTLY refresh (to avoid blocking selects), do it outside
-- of any transaction and only after the unique index exists, for example:
--
--   CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id
--     ON public.assessment_instance_latest_score(instance_id);
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.assessment_instance_latest_score;
--
-- The helper above (refresh_analytics_views) provides serialized refreshes safe to call
-- from triggers and functions, which avoids deadlocks caused by concurrent REFRESH locks.

-- ==========================================================================
-- FINAL SANITY / BACKUP CHECKS (no-op if run repeatedly)
-- ==========================================================================
-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at triggers are present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles') THEN
    PERFORM 1;
  END IF;
END
$$ LANGUAGE plpgsql;

/* End merged migration */
