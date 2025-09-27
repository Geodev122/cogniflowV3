-- Demo migration: support session and onboarding seed data for therapist dashboard
-- NOTE: Development/demo only. Use with caution in production.

BEGIN;

-- create minimal auth.users demo rows to satisfy FK for demo profiles
INSERT INTO auth.users (id, email, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222222'::uuid, 'dazzlt.uk@gmail.com', now()),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'client@example.com', now())
ON CONFLICT (id) DO NOTHING;

-- 1) Ensure full_name column exists on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;

-- 2) Populate full_name where missing
UPDATE public.profiles
SET full_name = TRIM(CONCAT_WS(' ', first_name, last_name))
WHERE full_name IS NULL;

-- 3) Insert missing profiles for auth.users (copy email)
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4) Add demo profiles (UUIDs cast)
INSERT INTO public.profiles (id, full_name, email)
VALUES
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Demo Therapist', 'dazzlt.uk@gmail.com'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Demo Client', 'client@example.com')
ON CONFLICT (id) DO NOTHING;

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

-- 6) Seed demo support_session
INSERT INTO public.support_sessions (id, therapist_id, client_id, scheduled_at, duration_minutes, mode, status, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  now() + interval '3 days',
  50,
  'video',
  'scheduled',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 7) Create therapist_onboardings
CREATE TABLE IF NOT EXISTS public.therapist_onboardings (
  id uuid PRIMARY KEY,
  therapist_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  step text,
  completed boolean default false,
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_onboardings_therapist_id ON public.therapist_onboardings (therapist_id);

-- 8) Seed onboarding rows
INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at)
VALUES
  ('33333333-3333-3333-3333-333333333333'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'profile', false, now()),
  ('55555555-5555-5555-5555-555555555555'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'welcome', false, now())
ON CONFLICT (id) DO NOTHING;

-- 9) Safe demo onboarding using existing profile
INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at)
SELECT '33333333-0000-0000-0000-000000000001'::uuid, p.id, 'profile', false, now()
FROM public.profiles p
WHERE p.email = 'dazzlt.uk@gmail.com'
ON CONFLICT (id) DO NOTHING;


COMMIT;
