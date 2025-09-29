/*
  production old — complementary patch to production new
  - Adds missing helpful indexes
  - Adds RLS policies not present in the new file (worksheets, exercises, progress, vip_offers, profiles INSERT)
  - Adds an updated_at trigger for appointments (new file didn’t add it)
  - Adds a unique index on the materialized view to support future concurrent refresh
  - Adds the 'assessment_files' storage bucket only (no conflicting policies)
*/

-- ============================================================================
-- MISSING/HELPFUL INDEXES (not created by production new)
-- ============================================================================

-- For due-date driven assessment queues
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date
  ON public.assessment_instances(due_date);

-- Speeds up fetching answers by instance
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance
  ON public.assessment_responses(instance_id);

-- Support CONCURRENT REFRESH later (created once; no trigger here)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id
  ON public.assessment_instance_latest_score(instance_id);

-- ============================================================================
-- TRIGGERS MISSED IN NEW
-- ============================================================================

-- New file defines public.update_updated_at_column(), but didn’t add for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLICIES THAT AREN’T IN THE NEW FILE (kept complementary)
-- ============================================================================

-- PROFILES: allow therapists to create client profiles
DROP POLICY IF EXISTS "Therapists can create client profiles" ON public.profiles;
CREATE POLICY "Therapists can create client profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client'
    AND created_by_therapist = (SELECT auth.uid())
  );

-- CBT WORKSHEETS
DROP POLICY IF EXISTS "Therapists can manage CBT worksheets" ON public.cbt_worksheets;
CREATE POLICY "Therapists can manage CBT worksheets"
  ON public.cbt_worksheets
  FOR ALL
  TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read their worksheets" ON public.cbt_worksheets;
CREATE POLICY "Clients can read their worksheets"
  ON public.cbt_worksheets
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can update their worksheet responses" ON public.cbt_worksheets;
CREATE POLICY "Clients can update their worksheet responses"
  ON public.cbt_worksheets
  FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- THERAPEUTIC EXERCISES
DROP POLICY IF EXISTS "Therapists can manage therapeutic exercises" ON public.therapeutic_exercises;
CREATE POLICY "Therapists can manage therapeutic exercises"
  ON public.therapeutic_exercises
  FOR ALL
  TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read their exercises" ON public.therapeutic_exercises;
CREATE POLICY "Clients can read their exercises"
  ON public.therapeutic_exercises
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can update exercise progress" ON public.therapeutic_exercises;
CREATE POLICY "Clients can update exercise progress"
  ON public.therapeutic_exercises
  FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- PROGRESS TRACKING
DROP POLICY IF EXISTS "Therapists can read client progress" ON public.progress_tracking;
CREATE POLICY "Therapists can read client progress"
  ON public.progress_tracking
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT tcr.client_id
      FROM public.therapist_client_relations tcr
      WHERE tcr.therapist_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can read their own progress" ON public.progress_tracking;
CREATE POLICY "Clients can read their own progress"
  ON public.progress_tracking
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can insert progress data" ON public.progress_tracking;
CREATE POLICY "System can insert progress data"
  ON public.progress_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- VIP OFFERS (none defined in new)
DROP POLICY IF EXISTS "Active VIP offers are readable by therapists" ON public.vip_offers;
CREATE POLICY "Active VIP offers are readable by therapists"
  ON public.vip_offers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'therapist'
  );

-- ============================================================================
-- STORAGE BUCKET COMPLEMENT (new created others; keep assessment_files)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment_files', 'assessment_files', false)
ON CONFLICT (id) DO NOTHING;


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


/*
  # Production CBT Practice Management Database Schema
  
  ## Overview
  This migration creates a comprehensive, production-ready database schema for a CBT practice management platform.
  
  ## Core Modules Supported
  1. **User Management & Authentication** - Therapists, clients, supervisors, admins
  2. **Practice Management** - Cases, sessions, documentation, workspace
  3. **Assessment System** - Templates, instances, responses, scoring, reports
  4. **Resource Management** - Library, templates, protocols, educational content
  5. **Communication & Collaboration** - Messages, supervision, referrals
  6. **Professional Services** - Licensing, compliance, clinic rentals
  7. **Analytics & Reporting** - Progress tracking, KPIs, audit trails
  
  ## Security Features
  - Row Level Security (RLS) on all tables
  - Role-based access control
  - Audit logging for compliance
  - Data versioning for critical documents
  
  ## Performance Features
  - Strategic indexes for query optimization
  - Materialized views for analytics
  - Efficient foreign key relationships
  - Optimized RLS policies
*/

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'therapist', 'client');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
    CREATE TYPE case_status AS ENUM ('active', 'paused', 'closed', 'archived', 'transferred');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    CREATE TYPE appointment_type AS ENUM ('individual', 'group', 'family', 'assessment', 'consultation', 'intake');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
    CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_category') THEN
    CREATE TYPE assessment_category AS ENUM ('depression', 'anxiety', 'trauma', 'stress', 'wellbeing', 'personality', 'substance', 'eating', 'sleep', 'general');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scoring_method') THEN
    CREATE TYPE scoring_method AS ENUM ('sum', 'average', 'weighted_sum', 'custom');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_level') THEN
    CREATE TYPE evidence_level AS ENUM ('research_based', 'clinical_consensus', 'expert_opinion');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'crisis');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    CREATE TYPE severity_level AS ENUM ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe', 'very_severe');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinical_significance') THEN
    CREATE TYPE clinical_significance AS ENUM ('subclinical', 'mild', 'moderate', 'significant', 'severe', 'critical');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
    CREATE TYPE communication_type AS ENUM ('email', 'phone', 'text', 'whatsapp', 'in_person', 'crisis', 'reminder');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_direction') THEN
    CREATE TYPE communication_direction AS ENUM ('outgoing', 'incoming');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_status') THEN
    CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
    CREATE TYPE license_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('pdf', 'video', 'audio', 'interactive', 'link', 'text', 'worksheet', 'protocol', 'course');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_category') THEN
    CREATE TYPE resource_category AS ENUM ('assessment', 'worksheet', 'educational', 'intervention', 'protocol', 'legal', 'template');
  END IF;
END;
$$;

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Enhanced profiles table with comprehensive user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  
  -- Basic information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp_number TEXT,
  
  -- Location data
  city TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Client-specific fields
  patient_code TEXT UNIQUE,
  date_of_birth DATE,
  gender TEXT,
  
  -- Professional fields (for therapists)
  professional_details JSONB,
  verification_status verification_status DEFAULT 'pending',
  license_number TEXT,
  
  -- Account management
  password_set BOOLEAN DEFAULT false,
  created_by_therapist UUID REFERENCES profiles(id),
  profile_completion_percentage INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapist-client relationships with status tracking
CREATE TABLE IF NOT EXISTS therapist_client_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  relationship_type TEXT DEFAULT 'primary',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(therapist_id, client_id)
);

-- Multi-therapist case assignments (for supervision, consultation)
CREATE TABLE IF NOT EXISTS therapist_case_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL, -- FK added after cases table
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary', -- 'primary', 'supervisor', 'consultant'
  access_level TEXT DEFAULT 'full', -- 'full', 'read_only', 'summary_only'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CASE MANAGEMENT SYSTEM
-- ============================================================================

-- Comprehensive cases table
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Case identification
  case_number TEXT UNIQUE NOT NULL,
  case_code TEXT, -- Legacy support
  
  -- Case status and phase
  status case_status DEFAULT 'active',
  current_phase TEXT,
  priority INTEGER DEFAULT 1,
  
  -- Clinical data
  diagnosis_codes TEXT[],
  formulation TEXT,
  intake_data JSONB,
  treatment_plan JSONB,
  
  -- Flexible data storage
  data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for therapist_case_relations
DO $$
BEGIN
  -- Add fk_therapist_case_relations_case_id only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'fk_therapist_case_relations_case_id'
      AND n.nspname = 'public'
      AND t.relname = 'therapist_case_relations'
  ) THEN
    ALTER TABLE public.therapist_case_relations
    ADD CONSTRAINT fk_therapist_case_relations_case_id
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Detailed client profiles with clinical information
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Demographics
  address TEXT,
  occupation TEXT,
  marital_status TEXT,
  
  -- Clinical information
  medical_history TEXT,
  current_medications TEXT,
  presenting_concerns TEXT,
  therapy_history TEXT,
  
  -- Risk assessment
  risk_level risk_level DEFAULT 'low',
  suicide_risk_assessment JSONB,
  
  -- Clinical notes and intake
  notes TEXT,
  intake_completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, therapist_id)
);

-- Case summaries for supervision and reporting
CREATE TABLE IF NOT EXISTS case_summaries (
  case_id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  last_highlight TEXT,
  ai_summary TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  
  -- Tracking
  updated_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ASSESSMENT SYSTEM
-- ============================================================================

-- Assessment templates (psychometric instruments)
CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  name TEXT NOT NULL,
  abbreviation TEXT,
  category assessment_category NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Assessment structure
  questions JSONB NOT NULL,
  scoring_config JSONB NOT NULL,
  interpretation_rules JSONB NOT NULL,
  clinical_cutoffs JSONB DEFAULT '{}',
  
  -- Metadata
  instructions TEXT,
  estimated_duration_minutes INTEGER,
  evidence_level evidence_level DEFAULT 'clinical_consensus',
  domains TEXT[],
  tags TEXT[],
  
  -- Management
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  
  -- Schema flexibility
  schema JSONB, -- For complex assessment structures
  scoring JSONB, -- Alternative scoring configuration
  items_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment instances (assigned assessments)
CREATE TABLE IF NOT EXISTS assessment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Assignment details
  title TEXT NOT NULL,
  instructions TEXT,
  status assessment_status DEFAULT 'assigned',
  
  -- Scheduling
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Configuration
  reminder_frequency TEXT DEFAULT 'none',
  progress INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment responses (individual question answers)
CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  item_id TEXT NOT NULL, -- For compatibility
  
  -- Response data
  response_value JSONB,
  response_text TEXT,
  response_timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_final BOOLEAN DEFAULT false,
  
  -- Metadata
  payload JSONB,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(instance_id, question_id)
);

-- Assessment scores and interpretations
CREATE TABLE IF NOT EXISTS assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  
  -- Scores
  raw_score NUMERIC NOT NULL,
  scaled_score NUMERIC,
  percentile NUMERIC,
  t_score NUMERIC,
  z_score NUMERIC,
  
  -- Interpretation
  interpretation_category TEXT,
  interpretation_description TEXT,
  clinical_significance clinical_significance,
  severity_level severity_level,
  recommendations TEXT,
  
  -- Clinical notes
  therapist_notes TEXT,
  ai_insights TEXT,
  
  -- Metadata
  auto_generated BOOLEAN DEFAULT true,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(instance_id) -- One score per instance (latest)
);

-- Assessment reports (compiled results)
CREATE TABLE IF NOT EXISTS assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Report details
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  
  -- Generation info
  generated_by TEXT, -- 'therapist', 'system', 'ai'
  template_used TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SESSION MANAGEMENT
-- ============================================================================

-- Appointments and sessions
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Scheduling
  appointment_date TIMESTAMPTZ NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  
  -- Session details
  appointment_type appointment_type DEFAULT 'individual',
  status session_status DEFAULT 'scheduled',
  title TEXT,
  location TEXT,
  
  -- Clinical notes
  notes TEXT,
  session_summary TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session notes with versioning
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Session identification
  session_index INTEGER,
  session_date DATE,
  
  -- Content
  content JSONB NOT NULL,
  note_type TEXT DEFAULT 'session',
  
  -- Status
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES session_notes(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for upsert operations
  UNIQUE(therapist_id, case_id, session_index)
);

-- Session agenda for workspace planning
CREATE TABLE IF NOT EXISTS session_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Source tracking
  source TEXT, -- 'treatment_plan', 'assessment', 'client_activity', 'manual'
  source_id UUID, -- ID of the source object
  
  -- Agenda item
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  
  -- Status
  completed_at TIMESTAMPTZ,
  
  -- Data
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TREATMENT PLANNING
-- ============================================================================

-- Treatment plans with versioning
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Plan details
  title TEXT NOT NULL,
  case_formulation TEXT,
  treatment_approach TEXT,
  estimated_duration TEXT,
  
  -- Plan structure
  goals JSONB DEFAULT '[]',
  interventions JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  
  -- Status and versioning
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES treatment_plans(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapy goals with progress tracking
CREATE TABLE IF NOT EXISTS therapy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  
  -- Goal details
  goal_text TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- SMART goal components
  specific_criteria TEXT,
  measurable_criteria TEXT,
  achievable_criteria TEXT,
  relevant_criteria TEXT,
  time_bound_criteria TEXT,
  
  -- Progress tracking
  target_date DATE,
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  
  -- Clinical notes
  notes TEXT,
  interventions_used TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment plan phases for structured therapy
CREATE TABLE IF NOT EXISTS treatment_plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
  
  -- Phase details
  phase TEXT NOT NULL,
  description TEXT,
  session_index INTEGER,
  
  -- Scheduling
  planned_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  goals JSONB DEFAULT '[]',
  interventions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WORKSHEETS AND EXERCISES
-- ============================================================================

-- CBT worksheets and thought records
CREATE TABLE IF NOT EXISTS cbt_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Worksheet details
  type TEXT NOT NULL, -- 'thought_record', 'behavioral_experiment', 'mood_log'
  title TEXT NOT NULL,
  instructions TEXT,
  
  -- Content and responses
  content JSONB,
  responses JSONB,
  
  -- Status
  status TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapeutic exercises and games
CREATE TABLE IF NOT EXISTS therapeutic_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Exercise details
  exercise_type TEXT NOT NULL, -- 'breathing', 'mindfulness', 'cognitive_restructuring'
  title TEXT NOT NULL,
  description TEXT,
  
  -- Game configuration
  game_config JSONB DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'beginner',
  
  -- Progress tracking
  progress JSONB DEFAULT '{}',
  status TEXT DEFAULT 'assigned',
  
  -- Usage tracking
  last_played_at TIMESTAMPTZ,
  total_sessions INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worksheets library (templates)
CREATE TABLE IF NOT EXISTS worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Worksheet details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- Content
  content JSONB,
  template_data JSONB,
  
  -- Management
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worksheet assignments
CREATE TABLE IF NOT EXISTS worksheet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Assignment details
  instructions TEXT,
  due_date TIMESTAMPTZ,
  
  -- Response data
  responses JSONB,
  status TEXT DEFAULT 'assigned',
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROGRESS TRACKING
-- ============================================================================

-- Progress metrics and tracking
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Metric details
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  
  -- Source tracking
  source_type TEXT NOT NULL, -- 'manual', 'psychometric', 'exercise', 'session'
  source_id UUID,
  
  -- Context
  session_phase TEXT,
  notes TEXT,
  
  -- Timestamps
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-between session activities
CREATE TABLE IF NOT EXISTS in_between_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Task details
  task_type TEXT NOT NULL, -- 'mood_log', 'thought_record', 'assessment_checkin', 'homework'
  task_title TEXT NOT NULL,
  task_data JSONB,
  
  -- Client response
  client_response JSONB,
  mood_rating INTEGER,
  client_notes TEXT,
  
  -- Status
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client activities (broader activity tracking)
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Activity details
  session_phase TEXT,
  kind TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  details TEXT,
  
  -- Data
  payload JSONB DEFAULT '{}',
  
  -- Tracking
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESOURCE LIBRARY
-- ============================================================================

-- Comprehensive resource library
CREATE TABLE IF NOT EXISTS resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  title TEXT NOT NULL,
  description TEXT,
  category resource_category,
  subcategory TEXT,
  
  -- Content details
  content_type content_type,
  content_url TEXT,
  media_url TEXT,
  storage_path TEXT,
  external_url TEXT,
  
  -- Classification
  tags TEXT[],
  difficulty_level TEXT,
  evidence_level evidence_level,
  target_audience TEXT[],
  
  -- Access control
  is_public BOOLEAN DEFAULT false,
  therapist_owner_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form assignments (generic assignment system)
CREATE TABLE IF NOT EXISTS form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Assignment details
  form_type TEXT NOT NULL, -- 'psychometric', 'worksheet', 'exercise', 'homework'
  form_id UUID, -- Reference to specific form/template
  title TEXT NOT NULL,
  instructions TEXT,
  
  -- Scheduling
  due_date DATE,
  reminder_frequency TEXT DEFAULT 'none',
  
  -- Status
  status TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy psychometric forms (for backward compatibility)
CREATE TABLE IF NOT EXISTS psychometric_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Form details
  form_type TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB,
  
  -- Response data
  responses JSONB,
  score NUMERIC,
  interpretation TEXT,
  
  -- Status
  status TEXT DEFAULT 'assigned',
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMMUNICATION SYSTEM
-- ============================================================================

-- Communication logs
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type communication_type NOT NULL,
  subject TEXT,
  content TEXT,
  
  -- Direction and status
  direction communication_direction NOT NULL,
  status communication_status DEFAULT 'draft',
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client requests (therapy termination, referrals, etc.)
CREATE TABLE IF NOT EXISTS client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Request details
  type TEXT NOT NULL, -- 'end_therapy', 'referral', 'schedule_change', 'emergency'
  message TEXT,
  priority INTEGER DEFAULT 1,
  
  -- Status tracking
  status request_status DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent management
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Consent details
  title TEXT NOT NULL,
  body TEXT,
  consent_type TEXT,
  
  -- Legal tracking
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  witness_id UUID REFERENCES profiles(id),
  
  -- Document management
  document_url TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUPERVISION AND COLLABORATION
-- ============================================================================

-- Supervision flags for case review
CREATE TABLE IF NOT EXISTS supervision_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_note_id UUID REFERENCES session_notes(id),
  
  -- Flag details
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  
  -- Status
  status request_status DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supervision discussion threads
CREATE TABLE IF NOT EXISTS supervision_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Thread details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- Status
  status request_status DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supervision messages within threads
CREATE TABLE IF NOT EXISTS supervision_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES supervision_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'file', 'assessment_link'
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Status
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFESSIONAL MANAGEMENT
-- ============================================================================

-- Therapist licensing and compliance
CREATE TABLE IF NOT EXISTS therapist_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- License details
  license_name TEXT NOT NULL,
  license_number TEXT,
  issuing_authority TEXT,
  country TEXT NOT NULL,
  state_province TEXT,
  
  -- File management
  file_path TEXT NOT NULL,
  original_filename TEXT,
  
  -- Validity
  issued_date DATE,
  expires_on DATE,
  
  -- Verification status
  status license_status DEFAULT 'submitted',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  
  -- Notes
  notes TEXT,
  verification_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Plan details
  plan_name TEXT NOT NULL,
  plan_price NUMERIC,
  billing_interval TEXT DEFAULT 'monthly',
  
  -- Status
  status subscription_status DEFAULT 'active',
  
  -- Billing periods
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice tracking
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  
  -- Invoice details
  number TEXT,
  amount_due NUMERIC,
  amount_paid NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  
  -- URLs
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  
  -- Timestamps
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic space rentals
CREATE TABLE IF NOT EXISTS clinic_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  
  -- Space details
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  amenities TEXT[],
  
  -- Pricing
  pricing_hourly NUMERIC,
  pricing_daily NUMERIC,
  pricing_monthly NUMERIC,
  tailored_available BOOLEAN DEFAULT false,
  
  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp TEXT,
  
  -- Management
  external_managed BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  -- Media
  images TEXT[],
  virtual_tour_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic rental requests
CREATE TABLE IF NOT EXISTS clinic_rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES clinic_spaces(id) ON DELETE CASCADE,
  
  -- Request details
  request_type TEXT NOT NULL, -- 'hourly', 'daily', 'monthly', 'tailored'
  preferred_date DATE,
  duration_hours INTEGER,
  recurring_schedule JSONB,
  
  -- Requirements
  notes TEXT,
  special_requirements TEXT[],
  
  -- Status
  status request_status DEFAULT 'open',
  admin_response TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIP opportunities and offers
CREATE TABLE IF NOT EXISTS vip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Offer details
  title TEXT NOT NULL,
  body TEXT,
  offer_type TEXT,
  
  -- Call to action
  cta_label TEXT,
  cta_url TEXT,
  
  -- Targeting
  target_audience TEXT[],
  eligibility_criteria JSONB,
  
  -- Validity
  expires_on DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Management
  created_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND COMPLIANCE
-- ============================================================================

-- Comprehensive audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and action
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  
  -- Resource tracking
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Context
  client_id UUID REFERENCES profiles(id),
  case_id UUID REFERENCES cases(id),
  session_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}',
  old_values JSONB,
  new_values JSONB,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_last_seen (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  context JSONB,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice analytics (aggregated metrics)
CREATE TABLE IF NOT EXISTS practice_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  
  -- Metrics
  total_clients INTEGER DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  new_clients INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  assessments_completed INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_session_rating NUMERIC,
  client_retention_rate NUMERIC,
  no_show_rate NUMERIC,
  
  -- Revenue metrics
  total_revenue NUMERIC DEFAULT 0,
  average_session_fee NUMERIC,
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core relationship indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);

-- Case management indexes
CREATE INDEX IF NOT EXISTS idx_cases_therapist_id ON cases(therapist_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);

-- Assessment system indexes
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist_id ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client_id ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_assigned_at ON assessment_instances(assigned_at);

-- Session management indexes
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_progress_tracking_client_id ON progress_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_recorded_at ON progress_tracking(recorded_at);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_metric_type ON progress_tracking(metric_type);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communication_logs_therapist_id ON communication_logs(therapist_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_client_id ON communication_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- PARTIAL INDEXES FOR ACTIVE / UPCOMING RECORDS (IMMUTABLE-SAFE)
-- ============================================================================

-- Active cases (no functions in predicate)
CREATE INDEX IF NOT EXISTS idx_active_cases
  ON public.cases (therapist_id)
  WHERE status = 'active';

-- Pending assessments (no functions in predicate)
CREATE INDEX IF NOT EXISTS idx_pending_assessments
  ON public.assessment_instances (therapist_id)
  WHERE status IN ('assigned', 'in_progress');

-- ---------------------------------------------------------------------------
-- Upcoming appointments: avoid NOW() in index predicate (42P17). We keep a
-- materialized boolean column updated by trigger, and index on that.
-- ---------------------------------------------------------------------------

-- 1) Ensure the helper column exists
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_upcoming boolean DEFAULT false;

-- 2) Trigger function to maintain the boolean at DML time
CREATE OR REPLACE FUNCTION public.set_appointments_is_upcoming()
RETURNS trigger AS $$
BEGIN
  -- An appointment is "upcoming" if it is scheduled and its start_time is in the future
  NEW.is_upcoming := (NEW.status = 'scheduled' AND NEW.start_time > now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Create (or replace) the trigger
DROP TRIGGER IF EXISTS trg_set_appointments_is_upcoming ON public.appointments;
CREATE TRIGGER trg_set_appointments_is_upcoming
BEFORE INSERT OR UPDATE OF status, start_time ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_appointments_is_upcoming();

-- 4) Backfill existing rows once
UPDATE public.appointments
SET is_upcoming = (status = 'scheduled' AND start_time > now())
WHERE is_upcoming IS DISTINCT FROM (status = 'scheduled' AND start_time > now());

-- Fix: remove any indexes that use NOW() in predicate and create a safe partial index
DROP INDEX IF EXISTS public.idx_upcoming_appointments;
DROP INDEX IF EXISTS idx_upcoming_appointments;

-- Create safe partial index using the trigger-maintained boolean column
CREATE INDEX IF NOT EXISTS idx_upcoming_appointments
  ON public.appointments (therapist_id, start_time)
  WHERE is_upcoming = true AND status = 'scheduled';


-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Assessment results with latest scores
-- Recreate with safe alias (avoid reserved keyword ASC)
-- NOTE: DROP disabled to avoid removing the view if another migration already created it
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
  ai.due_date,          -- keep if your table has it; otherwise remove this line
  ai.completed_at,

  -- Template info
  at.name         AS template_name,
  at.abbreviation AS template_abbrev,

  -- Latest score (alias changed from asc -> sc)
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
CREATE MATERIALIZED VIEW IF NOT EXISTS therapist_dashboard_summary AS
SELECT 
  t.id as therapist_id,
  t.first_name,
  t.last_name,
  
  -- Client counts
  COUNT(DISTINCT tcr.client_id) as total_clients,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_cases,
  
  -- Session counts
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.start_time >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END) as sessions_last_30_days,
  COUNT(DISTINCT CASE WHEN a.start_time >= CURRENT_DATE AND a.start_time < CURRENT_DATE + INTERVAL '1 day' THEN a.id END) as sessions_today,
  
  -- Assessment counts
  COUNT(DISTINCT CASE WHEN ai.status = 'in_progress' THEN ai.id END) as assessments_in_progress,
  COUNT(DISTINCT CASE WHEN ai.status = 'completed' AND ai.completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN ai.id END) as assessments_completed_week,
  
  -- Last activity
  MAX(GREATEST(c.last_activity_at, a.created_at, ai.updated_at)) as last_activity_at

FROM profiles t
LEFT JOIN therapist_client_relations tcr ON t.id = tcr.therapist_id
LEFT JOIN cases c ON t.id = c.therapist_id
LEFT JOIN appointments a ON t.id = a.therapist_id
LEFT JOIN assessment_instances ai ON t.id = ai.therapist_id
WHERE t.role = 'therapist'
GROUP BY t.id, t.first_name, t.last_name;

-- ============================================================================
-- TRIGGERS FOR AUTOMATION (idempotent)
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at triggers are dropped first (idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;
DROP TRIGGER IF EXISTS update_client_profiles_updated_at ON public.client_profiles;
DROP TRIGGER IF EXISTS update_assessment_instances_updated_at ON public.assessment_instances;
DROP TRIGGER IF EXISTS update_session_notes_updated_at ON public.session_notes;
DROP TRIGGER IF EXISTS update_treatment_plans_updated_at ON public.treatment_plans;

-- Recreate updated_at triggers (safe to run multiple times)
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_instances_updated_at
BEFORE UPDATE ON public.assessment_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at
BEFORE UPDATE ON public.session_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
BEFORE UPDATE ON public.treatment_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- Case number generation (idempotent)
-- ============================================================================

-- Sequence for case numbers (create if not exists)
CREATE SEQUENCE IF NOT EXISTS public.case_number_seq START 1;

-- Case number generation function
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.case_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger is dropped then created (idempotent)
DROP TRIGGER IF EXISTS generate_case_number_trigger ON public.cases;
CREATE TRIGGER generate_case_number_trigger
BEFORE INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.generate_case_number();


-- ============================================================================
-- Patient code generation (idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
    NEW.patient_code := 'PT' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_patient_code_trigger ON public.profiles;
CREATE TRIGGER generate_patient_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_patient_code();


-- ============================================================================
-- Case activity update (single function + idempotent triggers)
-- ============================================================================

-- Single, schema-qualified function that updates cases.last_activity_at
CREATE OR REPLACE FUNCTION public.update_case_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cases
  SET last_activity_at = NOW()
  WHERE id = COALESCE(NEW.case_id, OLD.case_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop triggers first to avoid "already exists" errors, then create
DROP TRIGGER IF EXISTS update_case_activity_sessions ON public.session_notes;
CREATE TRIGGER update_case_activity_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.session_notes
FOR EACH ROW EXECUTE FUNCTION public.update_case_activity();

DROP TRIGGER IF EXISTS update_case_activity_assessments ON public.assessment_instances;
CREATE TRIGGER update_case_activity_assessments
AFTER INSERT OR UPDATE OR DELETE ON public.assessment_instances
FOR EACH ROW EXECUTE FUNCTION public.update_case_activity();

--revision
-- Fix: remove volatile functions from index predicates
BEGIN;

-- Ensure is_upcoming column exists (idempotent)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT false;

-- Ensure trigger function sets is_upcoming when start_time or status changes
CREATE OR REPLACE FUNCTION public.set_appointments_is_upcoming()
RETURNS TRIGGER AS $$
BEGIN
  -- upcoming if scheduled and start_time in the future
  NEW.is_upcoming := (NEW.status = 'scheduled' AND NEW.start_time > now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_appointments_is_upcoming ON public.appointments;
CREATE TRIGGER trg_set_appointments_is_upcoming
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_appointments_is_upcoming();

-- Backfill existing rows
UPDATE public.appointments
SET is_upcoming = (status = 'scheduled' AND start_time > now())
WHERE is_upcoming IS DISTINCT FROM (status = 'scheduled' AND start_time > now());

-- Drop any older indexes that used NOW() in predicate
DROP INDEX IF EXISTS idx_upcoming_appointments;

-- Create a safe partial index that uses only immutable columns/expressions
-- Use the boolean maintained by trigger instead of NOW()
CREATE INDEX IF NOT EXISTS idx_upcoming_appointments ON public.appointments(therapist_id, start_time)
WHERE is_upcoming = true AND status = 'scheduled';

COMMIT;

-- Note: avoid using NOW() or other non-IMMUTABLE functions in index predicates.
-- If you need the index to reflect time progression, schedule a periodic job to refresh is_upcoming (eg. nightly) or rely on the trigger for DML updates.

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_client_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_case_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapeutic_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_between_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychometric_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================ 
-- PROFILES POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles; CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Therapists can read assigned clients" ON public.profiles; CREATE POLICY "Therapists can read assigned clients" ON public.profiles FOR SELECT TO authenticated USING ( EXISTS ( SELECT 1 FROM public.therapist_client_relations tcr WHERE tcr.therapist_id = (SELECT auth.uid()) AND tcr.client_id = public.profiles.id ) );

DROP POLICY IF EXISTS "Supervisors can read therapist profiles" ON public.profiles; CREATE POLICY "Supervisors can read therapist profiles" ON public.profiles FOR SELECT TO authenticated USING ( (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' AND role IN ('therapist', 'client') );

-- ============================================================================ 
-- CASE MANAGEMENT POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Therapists can manage own cases" ON public.cases; CREATE POLICY "Therapists can manage own cases" ON public.cases FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read own cases" ON public.cases; CREATE POLICY "Clients can read own cases" ON public.cases FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Supervisors can read flagged cases" ON public.cases; CREATE POLICY "Supervisors can read flagged cases" ON public.cases FOR SELECT TO authenticated USING ( (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' AND EXISTS ( SELECT 1 FROM public.supervision_flags sf WHERE sf.case_id = public.cases.id ) );

DROP POLICY IF EXISTS "Multi-therapist case access" ON public.cases; CREATE POLICY "Multi-therapist case access" ON public.cases FOR SELECT TO authenticated USING ( EXISTS ( SELECT 1 FROM public.therapist_case_relations tcr WHERE tcr.case_id = public.cases.id AND tcr.therapist_id = (SELECT auth.uid()) ) );

-- ============================================================================ 
-- CLIENT PROFILES POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Therapists can manage client profiles" ON public.client_profiles; CREATE POLICY "Therapists can manage client profiles" ON public.client_profiles FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read own profile" ON public.client_profiles; CREATE POLICY "Clients can read own profile" ON public.client_profiles FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()));

-- ============================================================================ 
-- ASSESSMENT SYSTEM POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Public assessment templates" ON public.assessment_templates; CREATE POLICY "Public assessment templates" ON public.assessment_templates FOR SELECT TO authenticated USING (is_public = true OR created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Therapists can manage assessment instances" ON public.assessment_instances; CREATE POLICY "Therapists can manage assessment instances" ON public.assessment_instances FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can access assigned assessments" ON public.assessment_instances; CREATE POLICY "Clients can access assigned assessments" ON public.assessment_instances FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can update assessment progress" ON public.assessment_instances; CREATE POLICY "Clients can update assessment progress" ON public.assessment_instances FOR UPDATE TO authenticated USING (client_id = (SELECT auth.uid())) WITH CHECK (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Assessment responses access" ON public.assessment_responses; CREATE POLICY "Assessment responses access" ON public.assessment_responses FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.assessment_instances ai WHERE ai.id = public.assessment_responses.instance_id AND (ai.therapist_id = (SELECT auth.uid()) OR ai.client_id = (SELECT auth.uid())) ) );

DROP POLICY IF EXISTS "Assessment scores access" ON public.assessment_scores; CREATE POLICY "Assessment scores access" ON public.assessment_scores FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.assessment_instances ai WHERE ai.id = public.assessment_scores.instance_id AND (ai.therapist_id = (SELECT auth.uid()) OR ai.client_id = (SELECT auth.uid())) ) );

-- ============================================================================ 
-- SESSION MANAGEMENT POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Appointment access" ON public.appointments; CREATE POLICY "Appointment access" ON public.appointments FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Session notes therapist access" ON public.session_notes; CREATE POLICY "Session notes therapist access" ON public.session_notes FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Session agenda access" ON public.session_agenda; CREATE POLICY "Session agenda access" ON public.session_agenda FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

-- ============================================================================ 
-- RESOURCE LIBRARY POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Resource library access" ON public.resource_library; CREATE POLICY "Resource library access" ON public.resource_library FOR SELECT TO authenticated USING ( is_public = true OR therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()) );

DROP POLICY IF EXISTS "Therapists can create resources" ON public.resource_library; CREATE POLICY "Therapists can create resources" ON public.resource_library FOR INSERT TO authenticated WITH CHECK ( (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'therapist' );

DROP POLICY IF EXISTS "Therapists can update own resources" ON public.resource_library; CREATE POLICY "Therapists can update own resources" ON public.resource_library FOR UPDATE TO authenticated USING (therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())) WITH CHECK (therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));

-- ============================================================================ 
-- COMMUNICATION POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Communication logs access" ON public.communication_logs; CREATE POLICY "Communication logs access" ON public.communication_logs FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Client requests access" ON public.client_requests; CREATE POLICY "Client requests access" ON public.client_requests FOR ALL TO authenticated USING (client_id = (SELECT auth.uid()) OR therapist_id = (SELECT auth.uid())) WITH CHECK (client_id = (SELECT auth.uid()) OR therapist_id = (SELECT auth.uid()));

-- ============================================================================ 
-- SUPERVISION POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Supervision flags access" ON public.supervision_flags; CREATE POLICY "Supervision flags access" ON public.supervision_flags FOR ALL TO authenticated USING ( therapist_id = (SELECT auth.uid()) OR flagged_by = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' ) WITH CHECK ( therapist_id = (SELECT auth.uid()) OR flagged_by = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' );

DROP POLICY IF EXISTS "Supervision threads access" ON public.supervision_threads; CREATE POLICY "Supervision threads access" ON public.supervision_threads FOR ALL TO authenticated USING ( therapist_id = (SELECT auth.uid()) OR supervisor_id = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' ) WITH CHECK ( therapist_id = (SELECT auth.uid()) OR supervisor_id = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'supervisor' );

-- ============================================================================ 
-- PROFESSIONAL MANAGEMENT POLICIES 
-- ============================================================================ 

DROP POLICY IF EXISTS "Therapist licenses own access" ON public.therapist_licenses; CREATE POLICY "Therapist licenses own access" ON public.therapist_licenses FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Subscriptions own access" ON public.subscriptions; CREATE POLICY "Subscriptions own access" ON public.subscriptions FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Invoices own access" ON public.invoices; CREATE POLICY "Invoices own access" ON public.invoices FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clinic spaces public read" ON public.clinic_spaces; CREATE POLICY "Clinic spaces public read" ON public.clinic_spaces FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS "Clinic rental requests access" ON public.clinic_rental_requests; CREATE POLICY "Clinic rental requests access" ON public.clinic_rental_requests FOR ALL TO authenticated USING ( therapist_id = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin' ) WITH CHECK ( therapist_id = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin' );

-- ============================================================================ 
-- AUDIT AND ANALYTICS POLICIES
-- ============================================================================ 

DROP POLICY IF EXISTS "Audit logs access" ON public.audit_logs; CREATE POLICY "Audit logs access" ON public.audit_logs FOR SELECT TO authenticated USING ( user_id = (SELECT auth.uid()) OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('supervisor', 'admin') );

DROP POLICY IF EXISTS "User last seen own access" ON public.user_last_seen; CREATE POLICY "User last seen own access" ON public.user_last_seen FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Practice analytics own access" ON public.practice_analytics; CREATE POLICY "Practice analytics own access" ON public.practice_analytics FOR ALL TO authenticated USING (therapist_id = (SELECT auth.uid())) WITH CHECK (therapist_id = (SELECT auth.uid()));

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record.first_name IS NOT NULL AND profile_record.last_name IS NOT NULL THEN
    completion_score := completion_score + 20;
  END IF;
  
  IF profile_record.email IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.phone IS NOT NULL OR profile_record.whatsapp_number IS NOT NULL THEN
    completion_score := completion_score + 10;
  END IF;
  
  IF profile_record.professional_details IS NOT NULL AND profile_record.role = 'therapist' THEN
    completion_score := completion_score + 30;
  END IF;
  
  IF profile_record.verification_status = 'verified' THEN
    completion_score := completion_score + 30;
  END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get therapist's clients with case info
CREATE OR REPLACE FUNCTION get_therapist_clients(therapist_id UUID)
RETURNS TABLE (
  client_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  case_count BIGINT,
  last_session TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    COALESCE(p.phone, p.whatsapp_number),
    COUNT(c.id),
    MAX(a.start_time),
    p.created_at
  FROM profiles p
  JOIN therapist_client_relations tcr ON p.id = tcr.client_id
  LEFT JOIN cases c ON p.id = c.client_id AND c.therapist_id = therapist_id
  LEFT JOIN appointments a ON p.id = a.client_id AND a.therapist_id = therapist_id
  WHERE tcr.therapist_id = get_therapist_clients.therapist_id
  GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone, p.whatsapp_number, p.created_at
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get case statistics for dashboard
CREATE OR REPLACE FUNCTION get_case_statistics(therapist_id UUID)
RETURNS TABLE (
  total_cases BIGINT,
  active_cases BIGINT,
  completed_assessments BIGINT,
  pending_assessments BIGINT,
  sessions_this_month BIGINT,
  clients_seen_this_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id),
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END),
    COUNT(DISTINCT CASE WHEN ai.status = 'completed' THEN ai.id END),
    COUNT(DISTINCT CASE WHEN ai.status IN ('assigned', 'in_progress') THEN ai.id END),
    COUNT(DISTINCT CASE WHEN a.start_time >= DATE_TRUNC('month', CURRENT_DATE) AND a.status = 'completed' THEN a.id END),
    COUNT(DISTINCT CASE WHEN a.start_time >= CURRENT_DATE - INTERVAL '7 days' THEN a.client_id END)
  FROM cases c
  LEFT JOIN assessment_instances ai ON c.id = ai.case_id
  LEFT JOIN appointments a ON c.id = a.case_id
  WHERE c.therapist_id = get_case_statistics.therapist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh materialized views function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  -- Ensure unique index exists for concurrent refresh
  PERFORM 1 FROM pg_class WHERE relname = 'idx_assessment_instance_latest_score_instance_id';
  IF NOT FOUND THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id ON public.assessment_instance_latest_score(instance_id)';
  END IF;

  -- Serialize refreshes using an advisory transaction lock to avoid deadlocks
  -- Keep the lock id aligned with the merged migration to avoid surprise collisions.
  PERFORM pg_advisory_xact_lock(2039283749);
  -- If the merged helper exists, call it; otherwise refresh directly (fully-qualified)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_analytics_views') THEN
    PERFORM public.refresh_analytics_views();
  ELSE
    REFRESH MATERIALIZED VIEW public.assessment_instance_latest_score;
    REFRESH MATERIALIZED VIEW public.therapist_dashboard_summary;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for file management
INSERT INTO storage.buckets (id, name, public) VALUES 
('resource_files', 'resource_files', true),
('licensing', 'licensing', false),
('session_recordings', 'session_recordings', false),
('client_documents', 'client_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Idempotent storage policy creation for storage.objects
DROP POLICY IF EXISTS "Public resource files" ON storage.objects;
CREATE POLICY "Public resource files" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'resource_files');

DROP POLICY IF EXISTS "Therapists can upload resources" ON storage.objects;
CREATE POLICY "Therapists can upload resources" ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'resource_files'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'therapist'
  );

DROP POLICY IF EXISTS "Therapists can manage licensing docs" ON storage.objects;
CREATE POLICY "Therapists can manage licensing docs" ON storage.objects
  FOR ALL
  TO public
  USING (
    bucket_id = 'licensing'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'therapist'
  );

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_therapist_client_relations_composite ON therapist_client_relations(therapist_id, client_id);
CREATE INDEX IF NOT EXISTS idx_cases_therapist_status ON cases(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client_status ON assessment_instances(client_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_session_notes_case_session ON session_notes(case_id, session_index);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_active_cases ON cases(therapist_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_pending_assessments ON assessment_instances(therapist_id) WHERE status IN ('assigned', 'in_progress');


-- Fix: remove volatile partial index (uses NOW()) and create safe trigger-maintained boolean index
DROP INDEX IF EXISTS public.idx_upcoming_appointments;
DROP INDEX IF EXISTS idx_upcoming_appointments;

CREATE INDEX IF NOT EXISTS idx_upcoming_appointments
  ON public.appointments (therapist_id, start_time)
  WHERE is_upcoming = true AND status = 'scheduled';

-- ============================================================================
-- DATA VALIDATION CONSTRAINTS
-- ============================================================================
-- Idempotent constraint additions

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_email'
      AND n.nspname = 'public'
      AND t.relname = 'profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT valid_email CHECK (email ~* ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'')';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_phone'
      AND n.nspname = 'public'
      AND t.relname = 'profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ ''^\\+?[1-9]\\d{1,14}$'')';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_progress'
      AND n.nspname = 'public'
      AND t.relname = 'therapy_goals'
  ) THEN
    EXECUTE 'ALTER TABLE public.therapy_goals ADD CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_raw_score'
      AND n.nspname = 'public'
      AND t.relname = 'assessment_scores'
  ) THEN
    EXECUTE 'ALTER TABLE public.assessment_scores ADD CONSTRAINT valid_raw_score CHECK (raw_score >= 0)';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_percentile'
      AND n.nspname = 'public'
      AND t.relname = 'assessment_scores'
  ) THEN
    EXECUTE 'ALTER TABLE public.assessment_scores ADD CONSTRAINT valid_percentile CHECK (percentile IS NULL OR (percentile >= 0 AND percentile <= 100))';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_appointment_duration'
      AND n.nspname = 'public'
      AND t.relname = 'appointments'
  ) THEN
    EXECUTE 'ALTER TABLE public.appointments ADD CONSTRAINT valid_appointment_duration CHECK (end_time > start_time)';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'valid_duration_minutes'
      AND n.nspname = 'public'
      AND t.relname = 'appointments'
  ) THEN
    EXECUTE 'ALTER TABLE public.appointments ADD CONSTRAINT valid_duration_minutes CHECK (duration_minutes > 0 AND duration_minutes <= 480)';
  END IF;
END;
$$;

-- Comments (safe to run multiple times)
COMMENT ON TABLE public.profiles IS 'Core user profiles supporting therapists, clients, supervisors, and admins';
COMMENT ON TABLE public.cases IS 'Central case management with treatment tracking and clinical data';
COMMENT ON TABLE public.assessment_templates IS 'Psychometric assessment instruments and scoring configurations';
COMMENT ON TABLE public.assessment_instances IS 'Individual assessment assignments with progress tracking';
COMMENT ON TABLE public.session_notes IS 'Clinical session documentation with versioning support';
COMMENT ON TABLE public.resource_library IS 'Comprehensive library of therapeutic resources and materials';
COMMENT ON TABLE public.supervision_flags IS 'Case flagging system for supervisor review and consultation';
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for compliance and security';

COMMENT ON COLUMN public.profiles.professional_details IS 'JSONB field storing therapist qualifications, specializations, and practice information';
COMMENT ON COLUMN public.cases.treatment_plan IS 'JSONB field storing structured treatment plan with goals and interventions';
COMMENT ON COLUMN public.assessment_templates.questions IS 'JSONB array of assessment questions with type, options, and validation rules';
COMMENT ON COLUMN public.assessment_templates.scoring_config IS 'JSONB configuration for scoring method, weights, and calculations';
COMMENT ON COLUMN public.session_notes.content IS 'JSONB field storing structured session notes, interventions, and observations';


/*
  # Populate Assessment Templates with Standard Instruments
  
  1. Depression Assessments
    - PHQ-9 (Patient Health Questionnaire)
    - BDI-II (Beck Depression Inventory)
    
  2. Anxiety Assessments  
    - GAD-7 (Generalized Anxiety Disorder)
    - BAI (Beck Anxiety Inventory)
    
  3. Trauma Assessments
    - PCL-5 (PTSD Checklist for DSM-5)
    
  4. Wellbeing Assessments
    - SWLS (Satisfaction with Life Scale)
    - CD-RISC-10 (Connor-Davidson Resilience Scale)
    - MAAS (Mindful Attention Awareness Scale)
    
  5. Stress and Burnout
    - PSS-10 (Perceived Stress Scale)
    - MBI (Maslach Burnout Inventory)
*/
BEGIN;

/* Helper: cast-safe, idempotent insert pattern:
   INSERT INTO assessment_templates(<cols>)
   SELECT <constants...>
   WHERE NOT EXISTS (SELECT 1 FROM assessment_templates WHERE abbreviation = '<ABBR>' AND version = '<VER>');
*/

-- =============================================================================
-- PHQ-9
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression'::assessment_category,
  '9-item depression screener and severity measure.',
  '1.0',
  $$[
    {"id":"phq9_1","text":"Little interest or pleasure in doing things","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_2","text":"Feeling down, depressed, or hopeless","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_3","text":"Trouble falling or staying asleep, or sleeping too much","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_4","text":"Feeling tired or having little energy","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_5","text":"Poor appetite or overeating","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_6","text":"Feeling bad about yourself — or that you are a failure or have let yourself or your family down","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_7","text":"Trouble concentrating on things, such as reading the newspaper or watching television","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_8","text":"Moving or speaking so slowly that other people could have noticed — or the opposite: being so fidgety or restless that you have been moving around a lot more than usual","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_9","text":"Thoughts that you would be better off dead, or of hurting yourself","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true}
  ]$$::jsonb,
  $${
    "method":"sum","max_score":27,"min_score":0,"reverse_scored_items":[]
  }$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":4,"label":"Minimal","description":"Minimal symptoms.","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor; continue wellness."},
      {"min":5,"max":9,"label":"Mild","description":"Mild depression.","severity":"mild","clinical_significance":"mild","recommendations":"Consider counseling / lifestyle steps."},
      {"min":10,"max":14,"label":"Moderate","description":"Moderate depression.","severity":"moderate","clinical_significance":"moderate","recommendations":"Therapy recommended; consider med eval."},
      {"min":15,"max":19,"label":"Moderately Severe","description":"Marked functional impact.","severity":"moderately_severe","clinical_significance":"significant","recommendations":"Prompt therapy + med eval; consider higher level of care."},
      {"min":20,"max":27,"label":"Severe","description":"Severe depression.","severity":"severe","clinical_significance":"severe","recommendations":"Immediate comprehensive treatment; address safety."}
    ]
  }$$::jsonb,
  $${
    "clinical_cutoff":10,
    "suicide_risk_item":"phq9_9",
    "suicide_risk_threshold":1,
    "optimal_range":[0,4]
  }$$::jsonb,
  $$Over the last 2 weeks, how often have you been bothered by the following problems?$$,
  5,
  'research_based'::evidence_level,
  true,false,
  9,
  ARRAY['depression']::text[],
  ARRAY['standard','screening']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PHQ-9' AND version='1.0');

-- =============================================================================
-- GAD-7
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Generalized Anxiety Disorder 7-item',
  'GAD-7',
  'anxiety'::assessment_category,
  '7-item anxiety screener and severity measure.',
  '1.0',
  $$[
    {"id":"gad7_1","text":"Feeling nervous, anxious, or on edge","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_2","text":"Not being able to stop or control worrying","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_3","text":"Worrying too much about different things","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_4","text":"Trouble relaxing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_5","text":"Being so restless that it is hard to sit still","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_6","text":"Becoming easily annoyed or irritable","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_7","text":"Feeling afraid as if something awful might happen","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":21,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":4,"label":"Minimal","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain coping skills."},
      {"min":5,"max":9,"label":"Mild","severity":"mild","clinical_significance":"mild","recommendations":"Psychoeducation; stress management."},
      {"min":10,"max":14,"label":"Moderate","severity":"moderate","clinical_significance":"moderate","recommendations":"CBT recommended."},
      {"min":15,"max":21,"label":"Severe","severity":"severe","clinical_significance":"severe","recommendations":"Prompt treatment; consider med eval."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":10,"optimal_range":[0,4]}$$::jsonb,
  $$Over the last 2 weeks, how often have you been bothered by the following problems?$$,
  3,
  'research_based'::evidence_level,
  true,false,
  7,
  ARRAY['anxiety']::text[],
  ARRAY['standard','screening']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='GAD-7' AND version='1.0');

-- =============================================================================
-- BDI-II (full, 21 items, 0–3 per item)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Beck Depression Inventory-II',
  'BDI-II',
  'depression'::assessment_category,
  '21-item self-report of depression severity (adolescents and adults).',
  '2.0',
  $$[
    {"id":"bdi_1","text":"Sadness","type":"single_choice","options":["I do not feel sad.","I feel sad much of the time.","I am sad all the time.","I am so sad or unhappy that I can’t stand it."],"required":true},
    {"id":"bdi_2","text":"Pessimism","type":"single_choice","options":["I am not discouraged about my future.","I feel more discouraged about my future than I used to be.","I do not expect things to work out for me.","I feel my future is hopeless and will only get worse."],"required":true},
    {"id":"bdi_3","text":"Past failure","type":"single_choice","options":["I do not feel like a failure.","I have failed more than I should have.","As I look back, I see a lot of failures.","I feel I am a total failure as a person."],"required":true},
    {"id":"bdi_4","text":"Loss of pleasure","type":"single_choice","options":["I get as much pleasure as I ever did.","I don’t enjoy things as much as I used to.","I get very little pleasure from the things I used to enjoy.","I can’t get any pleasure from the things I used to enjoy."],"required":true},
    {"id":"bdi_5","text":"Guilty feelings","type":"single_choice","options":["I don’t feel particularly guilty.","I feel guilty over many things I have done or should have done.","I feel quite guilty most of the time.","I feel guilty all of the time."],"required":true},
    {"id":"bdi_6","text":"Punishment feelings","type":"single_choice","options":["I don’t feel I am being punished.","I feel I may be punished.","I expect to be punished.","I feel I am being punished."],"required":true},
    {"id":"bdi_7","text":"Self-dislike","type":"single_choice","options":["I feel the same about myself as ever.","I have lost confidence in myself.","I am disappointed in myself.","I dislike myself."],"required":true},
    {"id":"bdi_8","text":"Self-criticalness","type":"single_choice","options":["I don’t criticize or blame myself more than usual.","I am more critical of myself than I used to be.","I criticize myself for all of my faults.","I blame myself for everything bad that happens."],"required":true},
    {"id":"bdi_9","text":"Suicidal thoughts or wishes","type":"single_choice","options":["I don’t have any thoughts of killing myself.","I have thoughts of killing myself, but I would not carry them out.","I would like to kill myself.","I would kill myself if I had the chance."],"required":true},
    {"id":"bdi_10","text":"Crying","type":"single_choice","options":["I don’t cry any more than I used to.","I cry more than I used to.","I cry over every little thing.","I feel like crying, but I can’t."],"required":true},
    {"id":"bdi_11","text":"Agitation","type":"single_choice","options":["I am no more restless or wound up than usual.","I feel more restless or wound up than usual.","I am so restless or agitated that it’s hard to stay still.","I am so restless or agitated that I have to keep moving or doing something."],"required":true},
    {"id":"bdi_12","text":"Loss of interest","type":"single_choice","options":["I have not lost interest in other people or activities.","I am less interested than I used to be in other people or things.","I have lost most of my interest in other people or things.","It’s hard to get interested in anything."],"required":true},
    {"id":"bdi_13","text":"Indecisiveness","type":"single_choice","options":["I make decisions about as well as ever.","I find it more difficult to make decisions than usual.","I have much greater difficulty in making decisions than I used to.","I have trouble making any decisions."],"required":true},
    {"id":"bdi_14","text":"Worthlessness","type":"single_choice","options":["I do not feel I am worthless.","I don’t consider myself as worthwhile and useful as I used to.","I feel more worthless as compared to others.","I feel utterly worthless."],"required":true},
    {"id":"bdi_15","text":"Loss of energy","type":"single_choice","options":["I have as much energy as ever.","I have less energy than I used to have.","I don’t have enough energy to do very much.","I don’t have enough energy to do anything."],"required":true},
    {"id":"bdi_16","text":"Changes in sleeping pattern","type":"single_choice","options":["I have not experienced any change in my sleeping.","I sleep somewhat more/less than usual.","I sleep a lot more/less than usual.","I sleep most of the day / I wake up 1–2 hours early and can’t get back to sleep."],"required":true},
    {"id":"bdi_17","text":"Irritability","type":"single_choice","options":["I am no more irritable than usual.","I am more irritable than usual.","I am much more irritable than usual.","I am irritable all the time."],"required":true},
    {"id":"bdi_18","text":"Changes in appetite","type":"single_choice","options":["I have not experienced any change in my appetite.","My appetite is somewhat greater/less than usual.","My appetite is much greater/less than before.","I have no appetite at all / I crave food all the time."],"required":true},
    {"id":"bdi_19","text":"Concentration difficulty","type":"single_choice","options":["I can concentrate as well as ever.","I can’t concentrate as well as usual.","It’s hard to keep my mind on anything for very long.","I find I can’t concentrate on anything."],"required":true},
    {"id":"bdi_20","text":"Tiredness or fatigue","type":"single_choice","options":["I am no more tired or fatigued than usual.","I get more tired or fatigued more easily than usual.","I am too tired or fatigued to do a lot of the things I used to do.","I am too tired or fatigued to do most of the things I used to do."],"required":true},
    {"id":"bdi_21","text":"Loss of interest in sex","type":"single_choice","options":["I have not noticed any recent change in my interest in sex.","I am less interested in sex than I used to be.","I am much less interested in sex now.","I have lost interest in sex completely."],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":63,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":13,"label":"Minimal","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor mood; wellness steps."},
      {"min":14,"max":19,"label":"Mild","severity":"mild","clinical_significance":"mild","recommendations":"Consider counseling / lifestyle."},
      {"min":20,"max":28,"label":"Moderate","severity":"moderate","clinical_significance":"moderate","recommendations":"Therapy recommended; consider med eval."},
      {"min":29,"max":63,"label":"Severe","severity":"severe","clinical_significance":"severe","recommendations":"Comprehensive treatment; consider higher level of care."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":14,"optimal_range":[0,13]}$$::jsonb,
  $$Read each group and pick the one statement that best describes how you felt over the past two weeks, including today.$$,
  8,
  'research_based'::evidence_level,
  true,false,
  21,
  ARRAY['depression']::text[],
  ARRAY['standard','severity']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='BDI-II' AND version='2.0');

-- =============================================================================
-- SWLS
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing'::assessment_category,
  '5-item global life satisfaction scale.',
  '1.0',
  $$[
    {"id":"swls_1","text":"In most ways my life is close to my ideal.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_2","text":"The conditions of my life are excellent.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_3","text":"I am satisfied with my life.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_4","text":"So far I have gotten the important things I want in life.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_5","text":"If I could live my life over, I would change almost nothing.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":35,"min_score":5,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":5,"max":9,"label":"Extremely Dissatisfied","severity":"severe","clinical_significance":"severe","recommendations":"Comprehensive review and planning."},
      {"min":10,"max":14,"label":"Dissatisfied","severity":"moderate","clinical_significance":"moderate","recommendations":"Identify domains for improvement."},
      {"min":15,"max":19,"label":"Slightly Dissatisfied","severity":"mild","clinical_significance":"mild","recommendations":"Set targeted goals."},
      {"min":20,"max":24,"label":"Neutral","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain and explore growth."},
      {"min":25,"max":29,"label":"Satisfied","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain positives."},
      {"min":30,"max":35,"label":"Extremely Satisfied","severity":"minimal","clinical_significance":"subclinical","recommendations":"Sustain strategies."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate your agreement with each statement using the 1–7 scale.$$,
  3,
  'research_based'::evidence_level,
  true,false,
  5,
  ARRAY['wellbeing']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='SWLS' AND version='1.0');

-- =============================================================================
-- PSS-10
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Perceived Stress Scale-10',
  'PSS-10',
  'stress'::assessment_category,
  '10-item perceived stress scale.',
  '1.0',
  $$[
    {"id":"pss_1","text":"In the last month, how often have you been upset because of something that happened unexpectedly?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_2","text":"...unable to control the important things in your life?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_3","text":"...felt nervous and stressed?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_4","text":"...felt confident about your ability to handle personal problems?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_5","text":"...felt things were going your way?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_6","text":"...found that you could not cope with all the things that you had to do?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_7","text":"...been able to control irritations in your life?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_8","text":"...felt that you were on top of things?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_9","text":"...been angered because of things outside of your control?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_10","text":"...felt difficulties were piling up so high that you could not overcome them?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":40,"min_score":0,"reverse_scored_items":["pss_4","pss_5","pss_7","pss_8"]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":13,"label":"Low Stress","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain coping strategies."},
      {"min":14,"max":26,"label":"Moderate Stress","severity":"moderate","clinical_significance":"moderate","recommendations":"Add stress-management skills."},
      {"min":27,"max":40,"label":"High Stress","severity":"severe","clinical_significance":"significant","recommendations":"Intervention recommended; consider therapy."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":20}$$::jsonb,
  $$Think about your feelings and thoughts during the last month and indicate how often you felt a certain way.$$,
  5,
  'research_based'::evidence_level,
  true,false,
  10,
  ARRAY['stress']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PSS-10' AND version='1.0');

-- =============================================================================
-- PCL-5 (full, 20 items, 0–4 each, total 0–80)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'PTSD Checklist for DSM-5',
  'PCL-5',
  'trauma'::assessment_category,
  '20-item self-report measure of DSM-5 PTSD symptoms.',
  '1.0',
  $$[
    {"id":"pcl5_1","text":"Repeated, disturbing, and unwanted memories of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_2","text":"Repeated, disturbing dreams of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_3","text":"Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_4","text":"Feeling very upset when something reminded you of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_5","text":"Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_6","text":"Avoiding memories, thoughts, or feelings related to the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_7","text":"Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_8","text":"Trouble remembering important parts of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_9","text":"Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_10","text":"Blaming yourself or someone else for the stressful experience or what happened after it?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_11","text":"Having strong negative feelings such as fear, horror, anger, guilt, or shame?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_12","text":"Loss of interest in activities that you used to enjoy?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_13","text":"Feeling distant or cut off from other people?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_14","text":"Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_15","text":"Irritable behavior, angry outbursts, or acting aggressively?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_16","text":"Taking too many risks or doing things that could cause you harm?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_17","text":"Being “superalert” or watchful or on guard?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_18","text":"Feeling jumpy or easily startled?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_19","text":"Having difficulty concentrating?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_20","text":"Trouble falling or staying asleep?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":80,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":32,"label":"Below Clinical Threshold","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor; provide psychoeducation."},
      {"min":33,"max":80,"label":"Probable PTSD","severity":"severe","clinical_significance":"significant","recommendations":"Comprehensive trauma assessment; consider evidence-based PTSD treatment."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":33}$$::jsonb,
  $$Below is a list of problems people sometimes have after a very stressful experience. Indicate how much you have been bothered by each problem in the past month.$$,
  7,
  'research_based'::evidence_level,
  true,false,
  20,
  ARRAY['trauma','intrusions','avoidance','cognitions_mood','arousal']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PCL-5' AND version='1.0');

-- =============================================================================
-- CD-RISC-10
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Connor-Davidson Resilience Scale-10',
  'CD-RISC-10',
  'wellbeing'::assessment_category,
  '10-item measure of resilience.',
  '1.0',
  $$[
    {"id":"cdrisc_1","text":"I am able to adapt when changes occur.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_2","text":"I have at least one close and secure relationship that helps me when I am stressed.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_3","text":"When there are no clear solutions to my problems, sometimes fate or God can help.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_4","text":"I can deal with whatever comes my way.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_5","text":"Past successes give me confidence in dealing with new challenges.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_6","text":"I see the humorous side of things.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_7","text":"Having to cope with stress can make me stronger.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_8","text":"I tend to bounce back after illness, injury, or other hardships.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_9","text":"Things happen for a reason.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_10","text":"I can achieve my goals even when there are obstacles.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":40,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":20,"label":"Lower Resilience","severity":"moderate","clinical_significance":"moderate","recommendations":"Develop resilience skills."},
      {"min":21,"max":30,"label":"Moderate Resilience","severity":"mild","clinical_significance":"mild","recommendations":"Continue building skills and support."},
      {"min":31,"max":40,"label":"High Resilience","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain practices; consider mentoring."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate how true each statement has been for you over the last month.$$,
  4,
  'research_based'::evidence_level,
  true,false,
  10,
  ARRAY['resilience']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='CD-RISC-10' AND version='1.0');

-- =============================================================================
-- MAAS (15 items, average score 1–6)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Mindful Attention Awareness Scale',
  'MAAS',
  'wellbeing'::assessment_category,
  '15-item dispositional mindfulness scale (average score).',
  '1.0',
  $$[
    {"id":"maas_1","text":"I could be experiencing some emotion and not be conscious of it until some time later.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_2","text":"I break or spill things because of carelessness, not paying attention, or thinking of something else.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_3","text":"I find it difficult to stay focused on what is happening in the present.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_4","text":"I tend to walk quickly to get where I am going without paying attention to what I experience along the way.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_5","text":"I tend not to notice feelings of physical tension or discomfort until they really grab my attention.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_6","text":"I forget a person’s name almost as soon as I’ve been told it for the first time.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_7","text":"It seems I am “running on automatic,” without much awareness of what I’m doing.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_8","text":"I rush through activities without being really attentive to them.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_9","text":"I get so focused on the goal I want to achieve that I lose touch with what I am doing right now to get there.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_10","text":"I do jobs or tasks automatically, without being aware of what I’m doing.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_11","text":"I find myself listening to someone with one ear, doing something else at the same time.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_12","text":"I drive places on ‘automatic pilot’ and then wonder why I went there.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_13","text":"I find myself preoccupied with the future or the past.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_14","text":"I find myself doing things without paying attention.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_15","text":"I snack without being aware that I’m eating.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true}
  ]$$::jsonb,
  $${"method":"average","max_score":6,"min_score":1,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":1.0,"max":3.0,"label":"Lower Mindfulness","severity":"moderate","clinical_significance":"moderate","recommendations":"Mindfulness training recommended."},
      {"min":3.1,"max":4.5,"label":"Moderate Mindfulness","severity":"mild","clinical_significance":"mild","recommendations":"Continue regular practice."},
      {"min":4.6,"max":6.0,"label":"High Mindfulness","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain advanced practice."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate how frequently or infrequently you currently have each experience.$$,
  4,
  'research_based'::evidence_level,
  true,false,
  15,
  ARRAY['mindfulness']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='MAAS' AND version='1.0');

-- =============================================================================
-- BAI (Beck Anxiety Inventory) — 21 items, 0–3 each, total 0–63
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Beck Anxiety Inventory',
  'BAI',
  'anxiety'::assessment_category,
  '21-item measure of anxiety symptom severity.',
  '1.0',
  $$[
    {"id":"bai_1","text":"Numbness or tingling","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_2","text":"Feeling hot","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_3","text":"Wobbliness in legs","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_4","text":"Unable to relax","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_5","text":"Fear of worst happening","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_6","text":"Dizzy or lightheaded","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_7","text":"Heart pounding/racing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_8","text":"Unsteady","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_9","text":"Terrified","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_10","text":"Nervous","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_11","text":"Feeling of choking","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_12","text":"Hands trembling","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_13","text":"Shaky/unsteady","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_14","text":"Fear of losing control","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_15","text":"Difficulty breathing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_16","text":"Fear of dying","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_17","text":"Scared","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_18","text":"Indigestion","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_19","text":"Faint/lightheaded","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_20","text":"Face flushed","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_21","text":"Sweating (not due to heat/exercise)","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":63,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":7,"label":"Minimal Anxiety","severity":"minimal","clinical_significance":"subclinical","recommendations":"Reassurance; monitor."},
      {"min":8,"max":15,"label":"Mild Anxiety","severity":"mild","clinical_significance":"mild","recommendations":"Psychoeducation; self-help; brief CBT."},
      {"min":16,"max":25,"label":"Moderate Anxiety","severity":"moderate","clinical_significance":"moderate","recommendations":"CBT recommended; consider med eval."},
      {"min":26,"max":63,"label":"Severe Anxiety","severity":"severe","clinical_significance":"severe","recommendations":"Prompt treatment; consider combined therapy/meds."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":16}$$::jsonb,
  $$Rate how much you have been bothered by each symptom during the past week, including today.$$,
  5,
  'research_based'::evidence_level,
  true,false,
  21,
  ARRAY['anxiety']::text[],
  ARRAY['standard','severity']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='BAI' AND version='1.0');

-- =============================================================================
-- MBI (Maslach Burnout Inventory – HSS, 22 items, 0–6; three subscales)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Maslach Burnout Inventory – Human Services Survey',
  'MBI-HSS',
  'stress'::assessment_category,
  '22-item burnout inventory with Emotional Exhaustion (EE), Depersonalization (DP), and Personal Accomplishment (PA) subscales.',
  '1.0',
  $$[
    {"id":"mbi_1","text":"I feel emotionally drained from my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_2","text":"I feel used up at the end of the workday.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_3","text":"I feel fatigued when I get up in the morning and have to face another day on the job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_4","text":"I can easily understand how my clients feel about things.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_5","text":"I feel I treat some clients as if they were impersonal objects.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_6","text":"Working with people all day is really a strain for me.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_7","text":"I deal very effectively with the problems of my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_8","text":"I feel burned out from my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_9","text":"I feel I’m positively influencing other people’s lives through my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_10","text":"I’ve become more callous toward people since I took this job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_11","text":"I worry that this job is hardening me emotionally.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_12","text":"I feel very energetic.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_13","text":"I feel frustrated by my job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_14","text":"I feel I’m working too hard on my job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_15","text":"I don’t really care what happens to some clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_16","text":"Working with people directly puts too much stress on me.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_17","text":"I can easily create a relaxed atmosphere with my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_18","text":"I feel exhilarated after working closely with my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_19","text":"I have accomplished many worthwhile things in this job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_20","text":"I feel like I’m at the end of my rope.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_21","text":"In my work, I deal with emotional problems very calmly.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_22","text":"I feel clients blame me for some of their problems.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true}
  ]$$::jsonb,
  $${
    "method":"custom",
    "subscales":{
      "EE":{"label":"Emotional Exhaustion","items":["mbi_1","mbi_2","mbi_3","mbi_6","mbi_8","mbi_13","mbi_14","mbi_16","mbi_20"],"range":[0,54]},
      "DP":{"label":"Depersonalization","items":["mbi_5","mbi_10","mbi_11","mbi_15","mbi_22"],"range":[0,30]},
      "PA":{"label":"Personal Accomplishment","items":["mbi_4","mbi_7","mbi_9","mbi_12","mbi_17","mbi_18","mbi_19","mbi_21"],"range":[0,48],"direction":"higher_is_better"}
    }
  }$$::jsonb,
  $${
    "by_subscale":[
      {"domain":"EE","ranges":[{"min":0,"max":16,"label":"Low EE"},{"min":17,"max":26,"label":"Moderate EE"},{"min":27,"max":54,"label":"High EE"}]},
      {"domain":"DP","ranges":[{"min":0,"max":6,"label":"Low DP"},{"min":7,"max":12,"label":"Moderate DP"},{"min":13,"max":30,"label":"High DP"}]},
      {"domain":"PA","ranges":[{"min":0,"max":31,"label":"Low PA"},{"min":32,"max":38,"label":"Moderate PA"},{"min":39,"max":48,"label":"High PA"}]}
    ],
    "notes":"Higher EE/DP indicate greater burnout; lower PA indicates greater burnout."
  }$$::jsonb,
  $${}$$::jsonb,
  $$How often do you experience each feeling about your work? Rate from 0 (Never) to 6 (Every day).$$,
  10,
  'research_based'::evidence_level,
  true,false,
  22,
  ARRAY['burnout','EE','DP','PA']::text[],
  ARRAY['standard','subscales']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='MBI-HSS' AND version='1.0');

COMMIT;





/*
  # Complete CBT Practice Management Database Schema
  
  1. Core Tables
    - Enhanced user profiles with complete professional data
    - Cases with full lifecycle management
    - Comprehensive assessment system
    - Session and appointment management
    - Communication and documentation tracking
  
  2. Security
    - Row Level Security on all tables
    - Role-based access policies
    - Audit logging for compliance
    
  3. Performance
    - Optimized indexes for common queries
    - Materialized views for analytics
    - Efficient foreign key relationships
    
  4. Compliance
    - HIPAA-ready audit trails
    - Data retention policies
    - Secure file storage integration
*/

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('therapist', 'client', 'supervisor', 'admin');
CREATE TYPE case_status AS ENUM ('active', 'paused', 'closed', 'archived');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE appointment_type AS ENUM ('individual', 'group', 'family', 'assessment', 'consultation');
CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled');
CREATE TYPE communication_type AS ENUM ('email', 'phone', 'text', 'whatsapp', 'in_person', 'crisis', 'reminder');
CREATE TYPE communication_direction AS ENUM ('outgoing', 'incoming');
CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'crisis');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive');
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled');
CREATE TYPE license_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired');

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Enhanced profiles table with complete professional data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  city TEXT,
  country TEXT,
  patient_code TEXT UNIQUE,
  password_set BOOLEAN DEFAULT false,
  created_by_therapist UUID REFERENCES profiles(id),
  professional_details JSONB,
  verification_status verification_status DEFAULT 'pending',
  profile_completion_percentage INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Therapist-client relationships
CREATE TABLE IF NOT EXISTS therapist_client_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  relationship_type TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(therapist_id, client_id)
);

-- Extended client profiles with clinical data
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  medical_history TEXT,
  current_medications TEXT,
  presenting_concerns TEXT,
  therapy_history TEXT,
  risk_level risk_level DEFAULT 'low',
  notes TEXT,
  intake_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, therapist_id)
);

-- ============================================================================
-- CASE MANAGEMENT SYSTEM
-- ============================================================================

-- Cases with complete lifecycle management
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL UNIQUE,
  status case_status DEFAULT 'active',
  current_phase TEXT,
  diagnosis_codes TEXT[],
  formulation TEXT,
  intake_data JSONB,
  treatment_plan JSONB,
  data JSONB,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Multiple therapists per case (supervision, consultation)
CREATE TABLE IF NOT EXISTS therapist_case_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborator',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, therapist_id)
);

-- Treatment plans with versioning
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  case_formulation TEXT,
  treatment_approach TEXT,
  estimated_duration TEXT,
  goals JSONB DEFAULT '[]',
  interventions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Therapy goals with progress tracking
CREATE TABLE IF NOT EXISTS therapy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  target_date DATE,
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Case summaries for supervision
CREATE TABLE IF NOT EXISTS case_summaries (
  case_id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  last_highlight TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ASSESSMENT SYSTEM
-- ============================================================================

-- Assessment templates (psychometric instruments)
CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  category TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  questions JSONB NOT NULL,
  scoring_config JSONB NOT NULL,
  interpretation_rules JSONB NOT NULL,
  clinical_cutoffs JSONB DEFAULT '{}',
  instructions TEXT,
  estimated_duration_minutes INTEGER DEFAULT 10,
  evidence_level TEXT DEFAULT 'research_based',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  schema JSONB,
  scoring JSONB,
  items_count INTEGER,
  domains TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment instances (assigned assessments)
CREATE TABLE IF NOT EXISTS assessment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  status assessment_status DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  reminder_frequency TEXT DEFAULT 'none',
  progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment responses
CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  response_value JSONB,
  response_text TEXT,
  response_timestamp TIMESTAMPTZ DEFAULT now(),
  is_final BOOLEAN DEFAULT false,
  payload JSONB,
  answered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, question_id)
);

-- Assessment scores and interpretations
CREATE TABLE IF NOT EXISTS assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  raw_score NUMERIC NOT NULL,
  scaled_score NUMERIC,
  percentile NUMERIC,
  t_score NUMERIC,
  z_score NUMERIC,
  interpretation_category TEXT,
  interpretation_description TEXT,
  clinical_significance TEXT,
  severity_level TEXT,
  recommendations TEXT,
  therapist_notes TEXT,
  auto_generated BOOLEAN DEFAULT true,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id)
);

-- Assessment reports for compiled results
CREATE TABLE IF NOT EXISTS assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  generated_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SESSION AND APPOINTMENT MANAGEMENT
-- ============================================================================

-- Appointments with comprehensive scheduling
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  appointment_date TIMESTAMPTZ NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  appointment_type appointment_type DEFAULT 'individual',
  status appointment_status DEFAULT 'scheduled',
  title TEXT,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session notes with structured content
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  session_index INTEGER,
  content JSONB NOT NULL,
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(therapist_id, case_id)
);

-- Session agenda for workspace planning
CREATE TABLE IF NOT EXISTS session_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT,
  source_id UUID,
  title TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- CBT WORKSHEETS AND EXERCISES
-- ============================================================================

-- CBT worksheets
CREATE TABLE IF NOT EXISTS cbt_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  responses JSONB DEFAULT '{}',
  status TEXT DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Therapeutic exercises and games
CREATE TABLE IF NOT EXISTS therapeutic_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_config JSONB DEFAULT '{}',
  progress JSONB DEFAULT '{}',
  status TEXT DEFAULT 'assigned',
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Worksheets library
CREATE TABLE IF NOT EXISTS worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  category TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Worksheet assignments
CREATE TABLE IF NOT EXISTS worksheet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responses JSONB DEFAULT '{}',
  status TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PROGRESS TRACKING AND ANALYTICS
-- ============================================================================

-- Progress tracking for metrics
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In-between session activities
CREATE TABLE IF NOT EXISTS in_between_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_data JSONB DEFAULT '{}',
  client_response JSONB,
  mood_rating INTEGER,
  client_notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client activities for workspace
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  session_phase TEXT,
  kind TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  details TEXT,
  payload JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- COMMUNICATION SYSTEM
-- ============================================================================

-- Communication logs
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  communication_type communication_type NOT NULL,
  subject TEXT,
  content TEXT,
  direction communication_direction NOT NULL,
  status communication_status DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Client requests (therapy termination, referrals, etc.)
CREATE TABLE IF NOT EXISTS client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT,
  status request_status DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Consent management
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  consent_type TEXT DEFAULT 'general',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RESOURCE MANAGEMENT
-- ============================================================================

-- Resource library
CREATE TABLE IF NOT EXISTS resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  content_type TEXT,
  content_url TEXT,
  media_url TEXT,
  storage_path TEXT,
  external_url TEXT,
  tags TEXT[],
  difficulty_level TEXT,
  evidence_level TEXT DEFAULT 'research_based',
  is_public BOOLEAN DEFAULT false,
  therapist_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form assignments (generic assignment system)
CREATE TABLE IF NOT EXISTS form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  form_id UUID,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  reminder_frequency TEXT DEFAULT 'none',
  status TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- LEGACY COMPATIBILITY TABLES
-- ============================================================================

-- Psychometric forms (legacy compatibility)
CREATE TABLE IF NOT EXISTS psychometric_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB DEFAULT '[]',
  responses JSONB DEFAULT '{}',
  score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'assigned',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SUPERVISION AND COMPLIANCE
-- ============================================================================

-- Supervision flags
CREATE TABLE IF NOT EXISTS supervision_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_note_id UUID REFERENCES session_notes(id),
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status request_status DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supervision threads
CREATE TABLE IF NOT EXISTS supervision_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES profiles(id),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status request_status DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Therapist licenses
CREATE TABLE IF NOT EXISTS therapist_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_name TEXT NOT NULL,
  license_number TEXT,
  issuing_authority TEXT,
  country TEXT NOT NULL,
  state_province TEXT,
  file_path TEXT NOT NULL,
  expires_on DATE,
  status license_status DEFAULT 'submitted',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- BILLING AND SUBSCRIPTIONS
-- ============================================================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  plan_name TEXT NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  number TEXT,
  amount_due INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- CLINIC MANAGEMENT
-- ============================================================================

-- Clinic spaces for rental
CREATE TABLE IF NOT EXISTS clinic_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  amenities TEXT[],
  pricing_hourly NUMERIC,
  pricing_daily NUMERIC,
  tailored_available BOOLEAN DEFAULT false,
  whatsapp TEXT,
  external_managed BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clinic rental requests
CREATE TABLE IF NOT EXISTS clinic_rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES clinic_spaces(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  preferred_date DATE,
  duration_hours INTEGER,
  notes TEXT,
  status request_status DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VIP offers and opportunities
CREATE TABLE IF NOT EXISTS vip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_url TEXT,
  target_audience TEXT[],
  expires_on DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- AUDIT AND COMPLIANCE
-- ============================================================================

-- Audit logs for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  client_id UUID REFERENCES profiles(id),
  case_id UUID REFERENCES cases(id),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_last_seen (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  context JSONB,
  seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Treatment plan phases for timeline
CREATE TABLE IF NOT EXISTS treatment_plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  planned_date DATE,
  session_index INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core relationship indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_therapist_client_relations_therapist ON therapist_client_relations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_client_relations_client ON therapist_client_relations(client_id);

-- Case management indexes
CREATE INDEX IF NOT EXISTS idx_cases_therapist ON cases(therapist_id);
CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);

-- Assessment system indexes
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON assessment_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance ON assessment_responses(instance_id);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_progress_tracking_client ON progress_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_recorded_at ON progress_tracking(recorded_at);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_metric_type ON progress_tracking(metric_type);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communication_logs_therapist ON communication_logs(therapist_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_client ON communication_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_client_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_case_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapeutic_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_between_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychometric_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_phases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Therapists can read client profiles they're linked to
CREATE POLICY "Therapists can read linked client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT therapist_id FROM therapist_client_relations 
      WHERE client_id = profiles.id
    )
  );

-- Therapists can create client profiles
CREATE POLICY "Therapists can create client profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client' AND 
    created_by_therapist = auth.uid()
  );

-- ============================================================================
-- THERAPIST-CLIENT RELATIONS POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage their client relations"
  ON therapist_client_relations FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can view their therapist relations"
  ON therapist_client_relations FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- ============================================================================
-- CLIENT PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage their client profiles"
  ON client_profiles FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read their own profile"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- ============================================================================
-- CASES POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage their cases"
  ON cases FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read their cases"
  ON cases FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- ============================================================================
-- ASSESSMENT SYSTEM POLICIES
-- ============================================================================

-- Assessment templates are readable by all authenticated users
CREATE POLICY "Assessment templates are readable by authenticated users"
  ON assessment_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Therapists can manage assessment instances
CREATE POLICY "Therapists can manage assessment instances"
  ON assessment_instances FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Clients can read their assigned assessments
CREATE POLICY "Clients can read their assessments"
  ON assessment_instances FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Assessment responses
CREATE POLICY "Therapists can read assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    instance_id IN (
      SELECT id FROM assessment_instances WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Clients can manage their assessment responses"
  ON assessment_responses FOR ALL
  TO authenticated
  USING (
    instance_id IN (
      SELECT id FROM assessment_instances WHERE client_id = auth.uid()
    )
  )
  WITH CHECK (
    instance_id IN (
      SELECT id FROM assessment_instances WHERE client_id = auth.uid()
    )
  );

-- Assessment scores
CREATE POLICY "Therapists can manage assessment scores"
  ON assessment_scores FOR ALL
  TO authenticated
  USING (
    instance_id IN (
      SELECT id FROM assessment_instances WHERE therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    instance_id IN (
      SELECT id FROM assessment_instances WHERE therapist_id = auth.uid()
    )
  );

-- ============================================================================
-- APPOINTMENTS AND SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage their appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Therapists can manage session notes"
  ON session_notes FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can manage session agenda"
  ON session_agenda FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- ============================================================================
-- CBT WORKSHEETS AND EXERCISES POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage CBT worksheets"
  ON cbt_worksheets FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read and update their worksheets"
  ON cbt_worksheets FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update their worksheet responses"
  ON cbt_worksheets FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Therapists can manage therapeutic exercises"
  ON therapeutic_exercises FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read and update their exercises"
  ON therapeutic_exercises FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update exercise progress"
  ON therapeutic_exercises FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- ============================================================================
-- PROGRESS TRACKING POLICIES
-- ============================================================================

CREATE POLICY "Therapists can read client progress"
  ON progress_tracking FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM therapist_client_relations WHERE therapist_id = auth.uid()
    )
  );

CREATE POLICY "Clients can read their own progress"
  ON progress_tracking FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "System can insert progress data"
  ON progress_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- COMMUNICATION POLICIES
-- ============================================================================

CREATE POLICY "Therapists can manage their communications"
  ON communication_logs FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can read their communications"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create requests"
  ON client_requests FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can read their requests"
  ON client_requests FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Therapists can read and update client requests"
  ON client_requests FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- ============================================================================
-- RESOURCE LIBRARY POLICIES
-- ============================================================================

CREATE POLICY "Public resources are readable by all"
  ON resource_library FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Therapists can read their own resources"
  ON resource_library FOR SELECT
  TO authenticated
  USING (therapist_owner_id = auth.uid());

CREATE POLICY "Therapists can manage their resources"
  ON resource_library FOR ALL
  TO authenticated
  USING (therapist_owner_id = auth.uid())
  WITH CHECK (therapist_owner_id = auth.uid());

-- ============================================================================
-- SUPERVISION AND COMPLIANCE POLICIES
-- ============================================================================

CREATE POLICY "Therapists can create supervision flags"
  ON supervision_flags FOR INSERT
  TO authenticated
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can read their supervision flags"
  ON supervision_flags FOR SELECT
  TO authenticated
  USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can manage their supervision threads"
  ON supervision_threads FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can manage their licenses"
  ON therapist_licenses FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- ============================================================================
-- BILLING POLICIES
-- ============================================================================

CREATE POLICY "Users can read their own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- CLINIC MANAGEMENT POLICIES
-- ============================================================================

CREATE POLICY "Clinic spaces are readable by therapists"
  ON clinic_spaces FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'therapist'
    )
  );

CREATE POLICY "Therapists can create rental requests"
  ON clinic_rental_requests FOR INSERT
  TO authenticated
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can read their rental requests"
  ON clinic_rental_requests FOR SELECT
  TO authenticated
  USING (therapist_id = auth.uid());

-- ============================================================================
-- VIP OFFERS POLICIES
-- ============================================================================

CREATE POLICY "Active VIP offers are readable by therapists"
  ON vip_offers FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'therapist'
    )
  );

-- ============================================================================
-- AUDIT POLICIES
-- ============================================================================

CREATE POLICY "Users can read their own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage their last seen data"
  ON user_last_seen FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_instances_updated_at BEFORE UPDATE ON assessment_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := 'CASE-' || EXTRACT(YEAR FROM now()) || '-' || 
                      LPAD((SELECT COALESCE(MAX(CAST(SPLIT_PART(case_number, '-', 3) AS INTEGER)), 0) + 1 
                            FROM cases 
                            WHERE case_number LIKE 'CASE-' || EXTRACT(YEAR FROM now()) || '-%')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_generate_case_number BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Auto-generate patient codes
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
    NEW.patient_code := 'PT' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 3) AS INTEGER)), 100000) + 1 
                                     FROM profiles 
                                     WHERE patient_code IS NOT NULL)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_generate_patient_code BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_patient_code();

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Assessment results summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS assessment_instance_latest_score AS
SELECT 
  ai.id as instance_id,
  ai.template_id,
  ai.therapist_id,
  ai.client_id,
  ai.case_id,
  ai.title,
  ai.status::text AS status,
  ai.assigned_at,
  ai.due_date,
  ai.completed_at,
  at.name as template_name,
  at.abbreviation as template_abbrev,
  ascore.id as score_id,
  ascore.raw_score,
  ascore.scaled_score,
  ascore.percentile,
  ascore.t_score,
  ascore.z_score,
  ascore.interpretation_category,
  ascore.interpretation_description,
  ascore.clinical_significance,
  ascore.severity_level,
  ascore.recommendations,
  ascore.calculated_at
FROM assessment_instances ai
LEFT JOIN assessment_templates at ON ai.template_id = at.id
LEFT JOIN assessment_scores ascore ON ai.id = ascore.instance_id
WHERE ai.status IN ('completed', 'in_progress', 'assigned');

-- Refresh the materialized view
-- Create a trigger-safe refresh function if it doesn't already exist. This keeps
-- behavior consistent with the merged migration and avoids replacing a canonical
-- implementation in another migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_assessment_views') THEN
    CREATE FUNCTION refresh_assessment_views()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Use the same advisory lock id as the merged migration to serialize refreshes.
      PERFORM pg_advisory_xact_lock(2039283749);
      REFRESH MATERIALIZED VIEW assessment_instance_latest_score;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id 
ON assessment_instance_latest_score(instance_id);

-- Trigger to refresh view when assessment data changes
-- Ensure triggers are idempotent: drop and recreate to point at the (possibly existing)
-- trigger-safe refresh function.
DROP TRIGGER IF EXISTS refresh_assessment_views_trigger ON assessment_instances;
CREATE TRIGGER refresh_assessment_views_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assessment_instances
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_assessment_views();

DROP TRIGGER IF EXISTS refresh_assessment_scores_views_trigger ON assessment_scores;
CREATE TRIGGER refresh_assessment_scores_views_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assessment_scores
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_assessment_views();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
('resource_files', 'resource_files', true),
('licensing', 'licensing', false),
('assessment_files', 'assessment_files', false),
('session_recordings', 'session_recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Therapists can upload resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resource_files');

CREATE POLICY "Therapists can upload licenses"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'licensing');

CREATE POLICY "Public resources are readable"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resource_files');

CREATE POLICY "Therapists can read their licenses"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'licensing' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record.first_name IS NOT NULL AND profile_record.last_name IS NOT NULL THEN
    completion_score := completion_score + 20;
  END IF;
  
  IF profile_record.professional_details IS NOT NULL THEN
    completion_score := completion_score + 30;
  END IF;
  
  IF profile_record.verification_status = 'verified' THEN
    completion_score := completion_score + 25;
  END IF;
  
  IF profile_record.professional_details->>'bio' IS NOT NULL AND 
     LENGTH(profile_record.professional_details->>'bio') > 150 THEN
    completion_score := completion_score + 15;
  END IF;
  
  IF profile_record.professional_details->'practice_locations' IS NOT NULL AND
     jsonb_array_length(profile_record.professional_details->'practice_locations') > 0 THEN
    completion_score := completion_score + 10;
  END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get therapist's clients
CREATE OR REPLACE FUNCTION get_therapist_clients(therapist_id UUID)
RETURNS TABLE(
  client_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.created_at
  FROM profiles p
  INNER JOIN therapist_client_relations tcr ON p.id = tcr.client_id
  WHERE tcr.therapist_id = $1 AND p.role = 'client'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get case statistics
CREATE OR REPLACE FUNCTION get_case_statistics(therapist_id UUID)
RETURNS TABLE(
  total_cases BIGINT,
  active_cases BIGINT,
  completed_assessments BIGINT,
  pending_assessments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM cases WHERE cases.therapist_id = $1),
    (SELECT COUNT(*) FROM cases WHERE cases.therapist_id = $1 AND status = 'active'),
    (SELECT COUNT(*) FROM assessment_instances WHERE therapist_id = $1 AND status = 'completed'),
    (SELECT COUNT(*) FROM assessment_instances WHERE therapist_id = $1 AND status IN ('assigned', 'in_progress'))
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA FUNCTIONS
-- ============================================================================

-- Function to create sample therapist
CREATE OR REPLACE FUNCTION create_sample_therapist(
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
RETURNS UUID AS $$
DECLARE
  therapist_id UUID;
BEGIN
  INSERT INTO profiles (
    id, role, first_name, last_name, email, phone, 
    professional_details, verification_status
  ) VALUES (
    user_id, 'therapist', first_name, last_name, email, '+1-555-0100',
    jsonb_build_object(
      'specializations', ARRAY['Anxiety Disorders', 'Depression', 'CBT'],
      'languages', ARRAY['English'],
      'qualifications', 'Licensed Clinical Psychologist',
      'bio', 'Experienced therapist specializing in evidence-based treatments.'
    ),
    'verified'
  ) RETURNING id INTO therapist_id;
  
  RETURN therapist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create sample client with case
CREATE OR REPLACE FUNCTION create_sample_client_with_case(
  therapist_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
RETURNS UUID AS $$
DECLARE
  client_id UUID;
  case_id UUID;
BEGIN
  -- Create client profile
  INSERT INTO profiles (
    id, role, first_name, last_name, email, phone,
    created_by_therapist, password_set
  ) VALUES (
    gen_random_uuid(), 'client', first_name, last_name, email, '+1-555-' || LPAD((random() * 9999)::INTEGER::TEXT, 4, '0'),
    therapist_id, true
  ) RETURNING id INTO client_id;
  
  -- Create therapist-client relation
  INSERT INTO therapist_client_relations (therapist_id, client_id)
  VALUES (therapist_id, client_id);
  
  -- Create case
  INSERT INTO cases (client_id, therapist_id, status)
  VALUES (client_id, therapist_id, 'active')
  RETURNING id INTO case_id;
  
  -- Create client profile
  INSERT INTO client_profiles (
    client_id, therapist_id, 
    presenting_concerns, risk_level
  ) VALUES (
    client_id, therapist_id,
    'Sample presenting concerns for testing',
    'low'
  );
  
  RETURN client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================================================

REFRESH MATERIALIZED VIEW assessment_instance_latest_score;




-- =========================================
-- Migration: fix missing tables/columns + RLS
-- Safe & idempotent (can be re-run)
-- =========================================
begin;

-- UUIDs for gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------
-- 1) Ensure public.cases exists (with needed cols)
-- -------------------------------------------------
create table if not exists public.cases (
  id               uuid primary key default gen_random_uuid(),
  case_number      text,
  status           text,
  client_id        uuid,
  therapist_id     uuid,
  current_phase    text default 'intake',
  diagnosis_codes  text[] default '{}'::text[],
  formulation      text,
  intake_data      jsonb  default '{}'::jsonb,
  data             jsonb  default '{}'::jsonb,
  treatment_plan   jsonb  default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Make sure the columns you rely on exist (idempotent)
alter table public.cases add column if not exists current_phase   text default 'intake';
alter table public.cases add column if not exists diagnosis_codes text[] default '{}'::text[];
alter table public.cases add column if not exists formulation     text;
alter table public.cases add column if not exists intake_data     jsonb default '{}'::jsonb;
alter table public.cases add column if not exists data            jsonb default '{}'::jsonb;
alter table public.cases add column if not exists treatment_plan  jsonb default '{}'::jsonb;

-- -------------------------------------------------
-- 2) profiles: add phone/city/country (guarded copy)
-- -------------------------------------------------
alter table public.profiles add column if not exists phone   text;
alter table public.profiles add column if not exists city    text;
alter table public.profiles add column if not exists country text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='whatsapp_number'
  ) then
    -- copy only where phone is null
    update public.profiles
       set phone = whatsapp_number
     where phone is null and whatsapp_number is not null;
  end if;
end$$;

-- -------------------------------------------------
-- 3) appointments: add appointment_date/location
--     and backfill from start_time if present
-- -------------------------------------------------
alter table public.appointments add column if not exists appointment_date timestamptz;
alter table public.appointments add column if not exists location         text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='appointments' and column_name='start_time'
  ) then
    update public.appointments
       set appointment_date = start_time
     where appointment_date is null and start_time is not null;
  end if;
end$$;

-- -------------------------------------------------
-- 4) Tables needed by FE features (with FK to cases)
-- -------------------------------------------------

-- client_requests
create table if not exists public.client_requests (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete cascade,
  type         text not null check (type in ('end_therapy','referral','complaint','question')),
  message      text,
  status       text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id)
);
alter table public.client_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_requests' and policyname='client_requests_client_manage') then
    create policy "client_requests_client_manage"
      on public.client_requests for all to authenticated
      using (client_id = auth.uid())
      with check (client_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_requests' and policyname='client_requests_therapist_read') then
    create policy "client_requests_therapist_read"
      on public.client_requests for select to authenticated
      using (therapist_id = auth.uid());
  end if;
end$$;

-- therapist_case_relations
create table if not exists public.therapist_case_relations (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  role         text default 'collaborating' check (role in ('primary','collaborating','supervising','consulting')),
  created_at   timestamptz default now(),
  unique(case_id, therapist_id)
);
alter table public.therapist_case_relations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='therapist_case_relations' and policyname='therapist_case_relations_manage') then
    create policy "therapist_case_relations_manage"
      on public.therapist_case_relations for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- supervision_flags (assumes session_notes exists)
create table if not exists public.supervision_flags (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  therapist_id   uuid not null references public.profiles(id) on delete cascade,
  session_note_id uuid references public.session_notes(id) on delete set null,
  flagged_by     uuid not null references public.profiles(id),
  reason         text not null,
  status         text default 'open' check (status in ('open','in_review','resolved')),
  created_at     timestamptz default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references public.profiles(id)
);
alter table public.supervision_flags enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supervision_flags' and policyname='supervision_flags_therapist_manage') then
    create policy "supervision_flags_therapist_manage"
      on public.supervision_flags for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- supervision_threads
create table if not exists public.supervision_threads (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete set null,
  title        text not null,
  description  text,
  status       text default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority     text default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  resolved_at  timestamptz
);
alter table public.supervision_threads enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supervision_threads' and policyname='supervision_threads_therapist_manage') then
    create policy "supervision_threads_therapist_manage"
      on public.supervision_threads for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- therapist_licenses
create table if not exists public.therapist_licenses (
  id               uuid primary key default gen_random_uuid(),
  therapist_id     uuid not null references public.profiles(id) on delete cascade,
  license_name     text not null,
  license_number   text,
  issuing_authority text,
  country          text not null,
  state_province   text,
  file_path        text not null,
  expires_on       date,
  status           text default 'submitted' check (status in ('submitted','under_review','approved','rejected','expired')),
  verified_at      timestamptz,
  verified_by      uuid references public.profiles(id),
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.therapist_licenses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='therapist_licenses' and policyname='therapist_licenses_own_manage') then
    create policy "therapist_licenses_own_manage"
      on public.therapist_licenses for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- subscriptions
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  plan_name              text not null,
  status                 text not null check (status in ('active','past_due','canceled','trialing','inactive')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_own_access') then
    create policy "subscriptions_own_access"
      on public.subscriptions for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- invoices
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  stripe_invoice_id text unique,
  number           text,
  amount_due       integer,
  currency         text default 'usd',
  status           text check (status in ('paid','open','void','uncollectible')),
  hosted_invoice_url text,
  invoice_pdf      text,
  created_at       timestamptz default now()
);
alter table public.invoices enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoices_own_access') then
    create policy "invoices_own_access"
      on public.invoices for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

-- vip_offers
create table if not exists public.vip_offers (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text,
  cta_label       text,
  cta_url         text,
  target_audience text[] default array['therapist']::text[],
  expires_on      date,
  is_active       boolean default true,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now()
);
alter table public.vip_offers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vip_offers' and policyname='vip_offers_read_all') then
    create policy "vip_offers_read_all"
      on public.vip_offers for select to authenticated
      using (is_active = true and (expires_on is null or expires_on >= current_date));
  end if;
end$$;

-- clinic_spaces
create table if not exists public.clinic_spaces (
  id                 uuid primary key default gen_random_uuid(),
  admin_id           uuid references public.profiles(id) on delete set null,
  name               text not null,
  description        text,
  location           text not null,
  amenities          text[],
  pricing_hourly     numeric(10,2),
  pricing_daily      numeric(10,2),
  tailored_available boolean default false,
  whatsapp           text,
  external_managed   boolean default false,
  active             boolean default true,
  images             text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table public.clinic_spaces enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_spaces' and policyname='clinic_spaces_read_active') then
    create policy "clinic_spaces_read_active"
      on public.clinic_spaces for select to authenticated
      using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_spaces' and policyname='clinic_spaces_admin_manage') then
    create policy "clinic_spaces_admin_manage"
      on public.clinic_spaces for all to authenticated
      using (admin_id = auth.uid())
      with check (admin_id = auth.uid());
  end if;
end$$;

-- clinic_rental_requests
create table if not exists public.clinic_rental_requests (
  id              uuid primary key default gen_random_uuid(),
  therapist_id    uuid not null references public.profiles(id) on delete cascade,
  space_id        uuid not null references public.clinic_spaces(id) on delete cascade,
  request_type    text not null check (request_type in ('hourly','daily','tailored')),
  preferred_date  date,
  duration_hours  integer,
  notes           text,
  status          text default 'new' check (status in ('new','approved','rejected','expired')),
  admin_response  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.clinic_rental_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clinic_rental_requests' and policyname='clinic_rental_requests_therapist_manage') then
    create policy "clinic_rental_requests_therapist_manage"
      on public.clinic_rental_requests for all to authenticated
      using (therapist_id = auth.uid())
      with check (therapist_id = auth.uid());
  end if;
end$$;

-- consents
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  case_id      uuid references public.cases(id) on delete set null,
  title        text not null,
  body         text,
  consent_type text default 'treatment' check (consent_type in ('treatment','privacy','communication','research')),
  signed_at    timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz default now()
);
alter table public.consents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consents' and policyname='consents_client_manage') then
    create policy "consents_client_manage"
      on public.consents for all to authenticated
      using (client_id = auth.uid())
      with check (client_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consents' and policyname='consents_therapist_read') then
    create policy "consents_therapist_read"
      on public.consents for select to authenticated
      using (therapist_id = auth.uid());
  end if;
end$$;

-- -------------------------------------------------
-- 5) Indexes
-- -------------------------------------------------
create index if not exists idx_cases_current_phase          on public.cases(current_phase);
create index if not exists idx_cases_diagnosis_codes        on public.cases using gin(diagnosis_codes);
create index if not exists idx_profiles_phone               on public.profiles(phone);
create index if not exists idx_profiles_city                on public.profiles(city);
create index if not exists idx_profiles_country             on public.profiles(country);
create index if not exists idx_client_requests_status       on public.client_requests(status);
create index if not exists idx_client_requests_type         on public.client_requests(type);
create index if not exists idx_supervision_flags_status     on public.supervision_flags(status);
create index if not exists idx_supervision_threads_status   on public.supervision_threads(status);
create index if not exists idx_therapist_licenses_status    on public.therapist_licenses(status);
create index if not exists idx_therapist_licenses_expires   on public.therapist_licenses(expires_on);
create index if not exists idx_subscriptions_status         on public.subscriptions(status);
create index if not exists idx_clinic_rental_requests_status on public.clinic_rental_requests(status);

-- -------------------------------------------------
-- 6) Data backfills (safe)
-- -------------------------------------------------
-- profiles phone already handled above DO-block if whatsapp_number exists

-- sensible default for cases.current_phase based on status
update public.cases set current_phase='active' where current_phase is null and status='active';
update public.cases set current_phase='closed' where current_phase is null and status='closed';
update public.cases set current_phase='intake' where current_phase is null;

-- -------------------------------------------------
-- 7) updated_at trigger util + table triggers
-- -------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='update_client_requests_updated_at') then
    create trigger update_client_requests_updated_at
      before update on public.client_requests
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_supervision_threads_updated_at') then
    create trigger update_supervision_threads_updated_at
      before update on public.supervision_threads
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_therapist_licenses_updated_at') then
    create trigger update_therapist_licenses_updated_at
      before update on public.therapist_licenses
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_subscriptions_updated_at') then
    create trigger update_subscriptions_updated_at
      before update on public.subscriptions
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_clinic_spaces_updated_at') then
    create trigger update_clinic_spaces_updated_at
      before update on public.clinic_spaces
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname='update_clinic_rental_requests_updated_at') then
    create trigger update_clinic_rental_requests_updated_at
      before update on public.clinic_rental_requests
      for each row execute function public.update_updated_at_column();
  end if;
end$$;

commit;

