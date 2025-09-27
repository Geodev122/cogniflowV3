-- Consolidated additions: ensure small tables referenced by code exist
-- Generated: 2025-09-27
-- Idempotent and guarded

BEGIN;

-- session_agenda (referenced by session/agenda UI)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='session_agenda') THEN
    CREATE TABLE public.session_agenda (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
      therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      source TEXT,
      source_id UUID,
      title TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_session_agenda_case_id ON public.session_agenda(case_id);
    CREATE INDEX IF NOT EXISTS idx_session_agenda_therapist_id ON public.session_agenda(therapist_id);
  END IF;
END $$;

-- therapist_profiles (lightweight onboarding/profile extension used by some UI)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_profiles') THEN
    CREATE TABLE public.therapist_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      bio TEXT,
      specialties TEXT[],
      availability JSONB,
      settings JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_therapist_profiles_profile_id ON public.therapist_profiles(profile_id);
  END IF;
END $$;

-- subscriptions & membership_plans (payments/memberships)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='membership_plans') THEN
    CREATE TABLE public.membership_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT UNIQUE,
      name TEXT,
      price NUMERIC(10,2) DEFAULT 0,
      billing_interval TEXT,
      benefits JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    CREATE TABLE public.subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
      plan_name TEXT,
      status TEXT DEFAULT 'active',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
  END IF;
END $$;

-- support_sessions & therapist_onboardings (demo-onboarding/support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_sessions') THEN
    CREATE TABLE public.support_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ,
      duration_minutes INT,
      mode TEXT,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_support_sessions_therapist_id ON public.support_sessions(therapist_id);
    CREATE INDEX IF NOT EXISTS idx_support_sessions_client_id ON public.support_sessions(client_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_onboardings') THEN
    CREATE TABLE public.therapist_onboardings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      therapist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      step TEXT,
      completed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_therapist_onboardings_therapist_id ON public.therapist_onboardings(therapist_id);
  END IF;
END $$;

COMMIT;

ANALYZE;
