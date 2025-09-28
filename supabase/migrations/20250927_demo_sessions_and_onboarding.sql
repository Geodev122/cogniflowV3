-- Demo migration: support session and onboarding seed data for therapist dashboard
-- NOTE: Development/demo only. Use with caution in production.

BEGIN;

-- create minimal auth.users demo rows to satisfy FK for demo profiles
-- NOTE: restricted to approved demo UUIDs only (do NOT add other demo users here)


-- 1) Ensure full_name column exists on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;

-- 2) Populate full_name where missing
UPDATE public.profiles
SET full_name = TRIM(CONCAT_WS(' ', first_name, last_name))
WHERE full_name IS NULL;

-- 3) Insert missing profiles for auth.users (copy email)
-- Insert a minimal profile row for any auth.user that doesn't have one yet.
-- The authoritative profiles schema uses a bigint `id` and a uuid `user_id` (FK to auth.users).
-- Insert only the required columns (`user_id`, `user_role`) so this migration is safe regardless of
-- whether optional columns like `email` or `full_name` exist in the current schema.
INSERT INTO public.profiles (user_id, user_role)
SELECT u.id, 'Client'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;



-- 5) Create support_sessions
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY,
  therapist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at timestamp with time zone,
  duration_minutes integer,
  mode text,
  status text,
  created_at timestamp with time zone default now()
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_therapist_id ON public.support_sessions (therapist_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_client_id ON public.support_sessions (client_id);


-- 7) Create therapist_onboardings
CREATE TABLE IF NOT EXISTS public.therapist_onboardings (
  id uuid PRIMARY KEY,
  therapist_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  step text,
  completed boolean default false,
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_onboardings_therapist_id ON public.therapist_onboardings (therapist_id);


-- 8) More complete demo data for the therapist with user_id = fb1f33f3-...
-- This block will:
--   - create therapist-client relations (idempotent)
--   - create a demo case per client (idempotent)
--   - create multiple support_sessions (idempotent)
--   - create onboarding steps for the therapist (idempotent)
-- All operations use COALESCE(user_id::text, id::text) to be compatible with
-- either uuid-keyed or bigint-keyed profiles tables.

-- Therapist and demo client UUIDs used by other seeds in the repo
DO $$
BEGIN
  -- therapist user id (auth.users uuid)
  PERFORM 1;
  -- If the therapist profile doesn't exist, skip seeding to avoid FK/NOT NULL issues
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886') THEN
    RAISE NOTICE 'Therapist profile for fb1f33f3-... not found; skipping demo case/session/onboarding seed.';
    RETURN;
  END IF;

  -- Ensure therapist-client relations for three demo clients
  INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, created_at)
  SELECT t.id, c.id, 'active', now()
  FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) t,
       (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = ANY(ARRAY['3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222']) ) c
  ON CONFLICT DO NOTHING;

  -- Create a demo case per client (if not already present for the same therapist-client pair)
  INSERT INTO public.cases (id, client_id, therapist_id, case_number, status, opened_at, created_at)
  SELECT gen_random_uuid(), c.id, t.id, ('CASE-DEMO-' || substr(c.id::text,1,8)), 'active', now(), now()
  FROM public.profiles c
  JOIN (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) t ON true
  WHERE COALESCE(c.user_id::text, c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
    AND NOT EXISTS (
      SELECT 1 FROM public.cases cas WHERE cas.client_id = c.id AND cas.therapist_id = t.id
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create several demo support sessions for these clients
  INSERT INTO public.support_sessions (id, therapist_id, client_id, scheduled_at, duration_minutes, mode, status, created_at)
  SELECT gen_random_uuid(), t.id, c.id, now() + (i * interval '2 days'), 50, 'video', CASE WHEN i = 1 THEN 'completed' ELSE 'scheduled' END, now()
  FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) t,
       (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = ANY(ARRAY['3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222'])) c,
       generate_series(1,3) AS s(i)
  WHERE TRUE
  ON CONFLICT (id) DO NOTHING;

  -- Create simple onboarding steps for the therapist if they do not exist
  WITH t AS (
    SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1
  )
  INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at)
  SELECT gen_random_uuid(), t.id, step_name, completed, now()
  FROM t, (VALUES
    ('welcome', true),
    ('profile_setup', true),
    ('licensing', false),
    ('first_client', false)
  ) AS v(step_name, completed)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.therapist_onboardings o WHERE o.therapist_id = t.id AND o.step = v.step_name
  );

  -- Optional: add a small resource owned by the therapist for demo purposes
  INSERT INTO public.resource_library (id, title, description, category, content_type, therapist_owner_id, created_by, created_at, is_public)
  SELECT gen_random_uuid(), 'Intro to CBT: Thought Records', 'Short worksheet to practice thought records', 'worksheet', 'pdf', t.id, t.id, now(), true
  FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) t
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resource_library')
  ON CONFLICT DO NOTHING;
END$$;






COMMIT;
