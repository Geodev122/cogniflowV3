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
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;



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






COMMIT;
