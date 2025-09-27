-- Demo migration: support session and onboarding seed data for therapist dashboard
-- NOTE: Development/demo only. Use with caution in production.

BEGIN;

-- Demo support session
-- Create a lightweight support_sessions table if it does not exist (safe default for demo)
CREATE TABLE IF NOT EXISTS public.support_sessions (
	id UUID PRIMARY KEY,
	therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
	client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
	scheduled_at timestamptz,
	duration_minutes integer,
	mode text,
	status text,
	created_at timestamptz default now()
);

INSERT INTO public.support_sessions (id, therapist_id, client_id, scheduled_at, duration_minutes, mode, status, created_at)
VALUES ('sess-demo-1', 'demo-therapist-0001', NULL, now() + interval '3 days', 50, 'video', 'scheduled', now())
ON CONFLICT (id) DO NOTHING;

-- Demo onboarding record (simple flag/entry to show onboarding completed/in-progress)
-- Create a minimal therapist_onboardings table if missing
CREATE TABLE IF NOT EXISTS public.therapist_onboardings (
	id UUID PRIMARY KEY,
	therapist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
	step text,
	completed boolean default false,
	updated_at timestamptz default now()
);

INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at)
VALUES ('onb-demo-1', 'demo-therapist-0001', 'profile', false, now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
