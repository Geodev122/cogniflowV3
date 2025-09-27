```sql
-- Demo migration: support session and onboarding seed data for therapist dashboard
-- NOTE: Development/demo only. Use with caution in production.

BEGIN;

-- 1) Ensure profiles table exists and matches auth.users IDs 
CREATE TABLE IF NOT EXISTS public.profiles ( id uuid PRIMARY KEY, first_name text, last_name text, email text, full_name text );

-- 2) Populate full_name where missing 
UPDATE public.profiles SET full_name = TRIM(CONCAT_WS(' ', first_name, last_name)) WHERE full_name IS NULL;

-- 3) Ensure profiles for the corresponding auth.users exist. 
-- This inserts a profile row for any auth.user without a profile, copying email. 
INSERT INTO public.profiles (id, email, full_name) SELECT u.id, u.email, NULL FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;

-- 4) Add demo profiles only if corresponding auth.users exist. 
-- These UUIDs are examples; ensure auth.users contains them or remove these inserts. 
INSERT INTO public.profiles (id, full_name, email) VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'Demo Therapist', 'therapist@example.com'), ('44444444-4444-4444-4444-444444444444'::uuid, 'Demo Client', 'client@example.com') ON CONFLICT (id) DO NOTHING;

-- 5) Create support_sessions table (with FK indexes) 
CREATE TABLE IF NOT EXISTS public.support_sessions ( id uuid PRIMARY KEY, therapist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, scheduled_at timestamp with time zone, duration_minutes integer, mode text, status text, created_at timestamp with time zone default now() );

-- Index foreign keys for performance 
CREATE INDEX IF NOT EXISTS idx_support_sessions_therapist_id ON public.support_sessions (therapist_id); CREATE INDEX IF NOT EXISTS idx_support_sessions_client_id ON public.support_sessions (client_id);

-- 6) Seed demo support_session referencing seeded profiles 
INSERT INTO public.support_sessions (id, therapist_id, client_id, scheduled_at, duration_minutes, mode, status, created_at) VALUES ( '11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, now() + interval '3 days', 50, 'video', 'scheduled', now() ) ON CONFLICT (id) DO NOTHING;

-- 7) Create therapist_onboardings table (single definition) 
CREATE TABLE IF NOT EXISTS public.therapist_onboardings ( id uuid PRIMARY KEY, therapist_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, step text, completed boolean default false, updated_at timestamptz default now() );

-- Index for therapist_id 
CREATE INDEX IF NOT EXISTS idx_therapist_onboardings_therapist_id ON public.therapist_onboardings (therapist_id);

-- 8) Seed onboarding rows using existing profile UUIDs 
INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at) VALUES ('33333333-3333-3333-3333-333333333333'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'profile', false, now()), ('55555555-5555-5555-5555-555555555555'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'welcome', false, now()) ON CONFLICT (id) DO NOTHING;

-- 9) Safe demo onboarding record: uses valid UUIDs. 
Replace with actual UUIDs if needed. INSERT INTO public.therapist_onboardings (id, therapist_id, step, completed, updated_at) SELECT '33333333-0000-0000-0000-000000000001'::uuid, p.id, 'profile', false, now() FROM public.profiles p WHERE p.email = 'therapist@example.com' ON CONFLICT (id) DO NOTHING;

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

```
-- Archived: demo therapist seed (moved from active migrations)
-- Original file preserved for history. See README for demo migration guidance.

-- ...original content archived...
