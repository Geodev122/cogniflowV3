-- Fixed DO blocks for functions: use distinct dollar tags for EXECUTE and for function body to avoid nested $$ collisions

-- update_updated_at_column function
DO $fix_fn1$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $body$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn1$ LANGUAGE plpgsql;

-- generate_case_number function
DO $fix_fn2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_case_number') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION generate_case_number()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.case_number IS NULL THEN
        NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('case_number_seq')::TEXT, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn2$ LANGUAGE plpgsql;

-- generate_patient_code function
DO $fix_fn3$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_patient_code') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION generate_patient_code()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
        NEW.patient_code := 'PT' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn3$ LANGUAGE plpgsql;

-- Final corrected non-destructive migration

-- 1) Create missing ENUMs safely
DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE $q$CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'therapist', 'client')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
    EXECUTE $q$CREATE TYPE case_status AS ENUM ('active', 'paused', 'closed', 'archived', 'transferred')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    EXECUTE $q$CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    EXECUTE $q$CREATE TYPE appointment_type AS ENUM ('individual', 'group', 'family', 'assessment', 'consultation', 'intake')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
    EXECUTE $q$CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_category') THEN
    EXECUTE $q$CREATE TYPE assessment_category AS ENUM ('depression', 'anxiety', 'trauma', 'stress', 'wellbeing', 'personality', 'substance', 'eating', 'sleep', 'general')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scoring_method') THEN
    EXECUTE $q$CREATE TYPE scoring_method AS ENUM ('sum', 'average', 'weighted_sum', 'custom')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_level') THEN
    EXECUTE $q$CREATE TYPE evidence_level AS ENUM ('research_based', 'clinical_consensus', 'expert_opinion')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    EXECUTE $q$CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'crisis')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    EXECUTE $q$CREATE TYPE severity_level AS ENUM ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe', 'very_severe')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinical_significance') THEN
    EXECUTE $q$CREATE TYPE clinical_significance AS ENUM ('subclinical', 'mild', 'moderate', 'significant', 'severe', 'critical')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
    EXECUTE $q$CREATE TYPE communication_type AS ENUM ('email', 'phone', 'text', 'whatsapp', 'in_person', 'crisis', 'reminder')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
    EXECUTE $q$CREATE TYPE communication_direction AS ENUM ('outgoing', 'incoming')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_status') THEN
    EXECUTE $q$CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    EXECUTE $q$CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    EXECUTE $q$CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
    EXECUTE $q$CREATE TYPE license_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    EXECUTE $q$CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    EXECUTE $q$CREATE TYPE content_type AS ENUM ('pdf', 'video', 'audio', 'interactive', 'link', 'text', 'worksheet', 'protocol', 'course')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_category') THEN
    EXECUTE $q$CREATE TYPE resource_category AS ENUM ('assessment', 'worksheet', 'educational', 'intervention', 'protocol', 'legal', 'template')$q$;
  END IF;
END
$enum$ LANGUAGE plpgsql;

-- 2) Extend public.profiles with missing columns (non-destructive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'client';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS patient_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_patient_code ON public.profiles(patient_code);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_details JSONB;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_therapist UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3) Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- 4) Add CHECK constraints safely
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_email') THEN
    EXECUTE $q$ALTER TABLE public.profiles ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_phone') THEN
    EXECUTE $q$ALTER TABLE public.profiles ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$')$q$;
  END IF;
END
$chk$ LANGUAGE plpgsql;

-- 5) Ensure utility functions referenced exist; create minimal versions if absent
-- create sequence if missing
CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

-- create functions using properly nested dollar tags via EXECUTE with a single tag $fn$
DO $fns$
BEGIN
  -- update_updated_at_column
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE $fn$
    CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $body$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $fn$;
  END IF;

  -- generate_case_number
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_case_number') THEN
    EXECUTE $fn$
    CREATE FUNCTION generate_case_number() RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.case_number IS NULL THEN
        NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('case_number_seq')::TEXT, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $fn$;
  END IF;

  -- generate_patient_code
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_patient_code') THEN
    EXECUTE $fn$
    CREATE FUNCTION generate_patient_code() RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
        NEW.patient_code := 'PT' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $fn$;
  END IF;
END
$fns$ LANGUAGE plpgsql;

-- 6) Attach triggers only if not already present
DO $trg$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    EXECUTE $q$CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()$q$;
  END IF;
END
$trg$ LANGUAGE plpgsql;

-- End of alignment migration


-- addition
-- non-destructive schema alignment (adds missing types, columns, indexes, constraints, triggers/functions)

-- 1) Create missing ENUMs safely (check pg_type then EXECUTE CREATE TYPE)
DO $do1$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE $$CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'therapist', 'client')$$;
  END IF;
END
$do1$ LANGUAGE plpgsql;

DO $do2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
    EXECUTE $$CREATE TYPE case_status AS ENUM ('active', 'paused', 'closed', 'archived', 'transferred')$$;
  END IF;
END
$do2$ LANGUAGE plpgsql;

DO $do3$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    EXECUTE $$CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')$$;
  END IF;
END
$do3$ LANGUAGE plpgsql;

DO $do4$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    EXECUTE $$CREATE TYPE appointment_type AS ENUM ('individual', 'group', 'family', 'assessment', 'consultation', 'intake')$$;
  END IF;
END
$do4$ LANGUAGE plpgsql;

DO $do5$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
    EXECUTE $$CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')$$;
  END IF;
END
$do5$ LANGUAGE plpgsql;

DO $do6$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_category') THEN
    EXECUTE $$CREATE TYPE assessment_category AS ENUM ('depression', 'anxiety', 'trauma', 'stress', 'wellbeing', 'personality', 'substance', 'eating', 'sleep', 'general')$$;
  END IF;
END
$do6$ LANGUAGE plpgsql;

DO $do7$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scoring_method') THEN
    EXECUTE $$CREATE TYPE scoring_method AS ENUM ('sum', 'average', 'weighted_sum', 'custom')$$;
  END IF;
END
$do7$ LANGUAGE plpgsql;

DO $do8$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_level') THEN
    EXECUTE $$CREATE TYPE evidence_level AS ENUM ('research_based', 'clinical_consensus', 'expert_opinion')$$;
  END IF;
END
$do8$ LANGUAGE plpgsql;

DO $do9$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    EXECUTE $$CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'crisis')$$;
  END IF;
END
$do9$ LANGUAGE plpgsql;

DO $do10$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    EXECUTE $$CREATE TYPE severity_level AS ENUM ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe', 'very_severe')$$;
  END IF;
END
$do10$ LANGUAGE plpgsql;

DO $do11$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinical_significance') THEN
    EXECUTE $$CREATE TYPE clinical_significance AS ENUM ('subclinical', 'mild', 'moderate', 'significant', 'severe', 'critical')$$;
  END IF;
END
$do11$ LANGUAGE plpgsql;

DO $do12$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
    EXECUTE $$CREATE TYPE communication_type AS ENUM ('email', 'phone', 'text', 'whatsapp', 'in_person', 'crisis', 'reminder')$$;
  END IF;
END
$do12$ LANGUAGE plpgsql;

DO $do13$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
    EXECUTE $$CREATE TYPE communication_direction AS ENUM ('outgoing', 'incoming')$$;
  END IF;
END
$do13$ LANGUAGE plpgsql;

DO $do14$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_status') THEN
    EXECUTE $$CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed')$$;
  END IF;
END
$do14$ LANGUAGE plpgsql;

DO $do15$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    EXECUTE $$CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled')$$;
  END IF;
END
$do15$ LANGUAGE plpgsql;

DO $do16$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    EXECUTE $$CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired')$$;
  END IF;
END
$do16$ LANGUAGE plpgsql;

DO $do17$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
    EXECUTE $$CREATE TYPE license_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired')$$;
  END IF;
END
$do17$ LANGUAGE plpgsql;

DO $do18$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    EXECUTE $$CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive')$$;
  END IF;
END
$do18$ LANGUAGE plpgsql;

DO $do19$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    EXECUTE $$CREATE TYPE content_type AS ENUM ('pdf', 'video', 'audio', 'interactive', 'link', 'text', 'worksheet', 'protocol', 'course')$$;
  END IF;
END
$do19$ LANGUAGE plpgsql;

DO $do20$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_category') THEN
    EXECUTE $$CREATE TYPE resource_category AS ENUM ('assessment', 'worksheet', 'educational', 'intervention', 'protocol', 'legal', 'template')$$;
  END IF;
END
$do20$ LANGUAGE plpgsql;

-- 2) Extend public.profiles with missing columns (non-destructive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'client';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
-- add patient_code without inline UNIQUE, create unique index separately
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS patient_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_patient_code ON public.profiles(patient_code);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_details JSONB;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_therapist UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3) Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- 4) Add CHECK constraints safely
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_email') THEN
    EXECUTE $$ALTER TABLE public.profiles ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')$$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_phone') THEN
    EXECUTE $$ALTER TABLE public.profiles ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$')$$;
  END IF;
END
$chk$ LANGUAGE plpgsql;

-- 5) Ensure utility functions referenced exist; create minimal versions if absent
-- update_updated_at_column function
DO $fix_fn1$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $body$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn1$ LANGUAGE plpgsql;

-- generate_case_number function
DO $fix_fn2$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_case_number') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION generate_case_number()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.case_number IS NULL THEN
        NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('case_number_seq')::TEXT, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn2$ LANGUAGE plpgsql;

-- generate_patient_code function
DO $fix_fn3$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_patient_code') THEN
    EXECUTE $create_fn$
    CREATE FUNCTION generate_patient_code()
    RETURNS TRIGGER AS $body$
    BEGIN
      IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
        NEW.patient_code := 'PT' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql;
    $create_fn$;
  END IF;
END
$fix_fn3$ LANGUAGE plpgsql;
