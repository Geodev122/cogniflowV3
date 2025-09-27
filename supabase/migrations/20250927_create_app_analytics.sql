-- Create `app_analytics` table (idempotent)
-- This migration is defensive: it creates the table if missing, adds indexes, enables RLS,
-- and adds a conservative policy matching older migrations that expect
-- CREATE POLICY "app_analytics_access" ON app_analytics FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- NOTE: avoid strict FK constraints here to keep this migration safe to run even when
-- `profiles` isn't present yet in some DB states. The app expects app_analytics.user_id to
-- contain auth.uid() values (uuid strings). If you prefer a FK, add it in a later migration
-- once `profiles` is guaranteed present.

CREATE TABLE IF NOT EXISTS public.app_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  app_name text,
  event_type text,
  payload jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_user_id ON public.app_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_app_analytics_event_type ON public.app_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_created_at ON public.app_analytics(created_at);

-- Enable Row Level Security
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

-- Conservative owner-only policy: allow authenticated users to manage their own analytics rows
DO $$
BEGIN
  -- create policy only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_analytics' AND policyname = 'app_analytics_access'
  ) THEN
    EXECUTE 'CREATE POLICY app_analytics_access ON public.app_analytics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END;
$$;

-- Small comment: this table is intentionally permissive in schema (no FK) so migrations can run
-- across different DB states. If you want a strict FK (user_id -> profiles.id), add that as
-- a targeted migration after `profiles` exists in your target DB.
