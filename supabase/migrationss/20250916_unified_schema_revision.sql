-- =====================================================================
-- 0) EXTENSIONS & UTILS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe helper: add enum value if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('therapist','client','supervisor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='assessment_status') THEN
    CREATE TYPE public.assessment_status AS ENUM ('assigned','in_progress','completed','expired','cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='reminder_frequency') THEN
    CREATE TYPE public.reminder_frequency AS ENUM ('none','daily','weekly','before_due');
  END IF;
END$$;

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1) PROFILES + BASIC RELATIONS
-- =====================================================================

-- profiles (auth-linked)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'client',
  first_name TEXT,
  last_name  TEXT,
  patient_code TEXT,
  whatsapp_number TEXT,
  password_set BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_therapist UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  professional_details JSONB,
  verification_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_profiles_updated') THEN
    CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- therapist-client roster
CREATE TABLE IF NOT EXISTS public.therapist_client_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (therapist_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_tcr_therapist ON public.therapist_client_relations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_tcr_client    ON public.therapist_client_relations(client_id);

-- optional extended client profile
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  medical_history TEXT,
  current_medications TEXT,
  presenting_concerns TEXT,
  therapy_history TEXT,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','moderate','high','crisis')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, therapist_id)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_client_profiles_updated') THEN
    CREATE TRIGGER trg_client_profiles_updated BEFORE UPDATE ON public.client_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- =====================================================================
-- 2) CASES (+ objects the workspace references)
-- =====================================================================

-- cases (rename legacy case_code -> case_number if present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cases') THEN
    CREATE TABLE public.cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_number TEXT NOT NULL UNIQUE,
      client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    -- Ensure case_number exists; rename case_code if that existed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='cases' AND column_name='case_number'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='cases' AND column_name='case_code'
      ) THEN
        EXECUTE 'ALTER TABLE public.cases RENAME COLUMN case_code TO case_number';
      ELSE
        EXECUTE 'ALTER TABLE public.cases ADD COLUMN case_number TEXT';
        -- Try to fill case_number if NULL
        EXECUTE 'UPDATE public.cases SET case_number = id::text WHERE case_number IS NULL';
        EXECUTE 'ALTER TABLE public.cases ALTER COLUMN case_number SET NOT NULL';
        -- unique if not exists
        BEGIN
          EXECUTE 'ALTER TABLE public.cases ADD CONSTRAINT cases_case_number_key UNIQUE(case_number)';
        EXCEPTION WHEN duplicate_table THEN
          -- ignore
        WHEN duplicate_object THEN
          -- ignore
        END;
      END IF;
    END IF;

    -- Ensure updated_at/trigger
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='cases' AND column_name='updated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.cases ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()';
    END IF;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cases_therapist ON public.cases(therapist_id);
CREATE INDEX IF NOT EXISTS idx_cases_client    ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status    ON public.cases(status);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cases_updated') THEN
    CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- treatment_plan_phases (timeline)
CREATE TABLE IF NOT EXISTS public.treatment_plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,                              -- Intake/Assessment/Intervention/...
  planned_date DATE,
  session_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tpp_case ON public.treatment_plan_phases(case_id);

-- session_notes (used across Workspace & Summary)
CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_index INT,
  content JSONB NOT NULL,                            -- allow string-JSON interop
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_session_notes_updated') THEN
    CREATE TRIGGER trg_session_notes_updated BEFORE UPDATE ON public.session_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sn_case ON public.session_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_sn_therapist ON public.session_notes(therapist_id);

-- client_activities (between sessions: journals/homework/assessments)
CREATE TABLE IF NOT EXISTS public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                                -- 'assessment'|'journal'|'homework'|...
  title TEXT,
  details TEXT,
  occurred_at TIMESTAMPTZ,
  session_phase TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ca_case ON public.client_activities(case_id);
CREATE INDEX IF NOT EXISTS idx_ca_client ON public.client_activities(client_id);

-- session_agenda (workspace adds items to next session)
CREATE TABLE IF NOT EXISTS public.session_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT,                                       -- 'client_activity' | 'manual' | ...
  source_id UUID,
  title TEXT NOT NULL,
  payload JSONB,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sa_case ON public.session_agenda(case_id);

-- supervision_flags + case_summaries (flag from workspace)
CREATE TABLE IF NOT EXISTS public.supervision_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sf_case ON public.supervision_flags(case_id);

CREATE TABLE IF NOT EXISTS public.case_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT,
  last_highlight TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- resource_library (workspace quick-create)
CREATE TABLE IF NOT EXISTS public.resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT,                                  -- pdf|video|audio|link...
  category TEXT,                                      -- worksheet|educational|intervention|protocol...
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  therapist_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  media_url TEXT,
  storage_path TEXT,
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rl_public ON public.resource_library(is_public);
CREATE INDEX IF NOT EXISTS idx_rl_owner  ON public.resource_library(therapist_owner_id);

-- Ensure storage bucket for resource files
INSERT INTO storage.buckets (id, name, public)
SELECT 'resource_files','resource_files', TRUE
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='resource_files');

-- =====================================================================
-- 3) APPOINTMENTS (align to code: start_time/end_time/title/status/case_id)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- If you had appointment_date/duration_minutes from older schema, migrate:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='appointment_date') THEN
    -- If start_time is null, copy from appointment_date
    EXECUTE 'UPDATE public.appointments SET start_time = appointment_date WHERE start_time IS NULL';
    EXECUTE 'ALTER TABLE public.appointments DROP COLUMN appointment_date';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='appointment_type') THEN
    -- keep or drop depending on your need; the app does not use it currently
    -- EXECUTE ''; -- no-op
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='duration_minutes') THEN
    -- If end_time is null and duration exists, compute end_time
    EXECUTE '
      UPDATE public.appointments
      SET end_time = start_time + (duration_minutes || '' minutes'')::interval
      WHERE end_time IS NULL AND duration_minutes IS NOT NULL
    ';
    EXECUTE 'ALTER TABLE public.appointments DROP COLUMN duration_minutes';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_appt_therapist ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appt_client    ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appt_start     ON public.appointments(start_time);

-- =====================================================================
-- 4) ASSESSMENTS (templates/instances/responses/scores)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  version TEXT DEFAULT '1.0',
  questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  scoring_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  interpretation_rules JSONB NOT NULL DEFAULT '{}'::JSONB,
  clinical_cutoffs JSONB NOT NULL DEFAULT '{}'::JSONB,
  instructions TEXT,
  estimated_duration_minutes INT DEFAULT 10,
  evidence_level TEXT DEFAULT 'research_based',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_templates_updated') THEN
    CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.assessment_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.assessment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  status public.assessment_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  reminder_frequency public.reminder_frequency NOT NULL DEFAULT 'none',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_ai_updated') THEN
    CREATE TRIGGER trg_ai_updated BEFORE UPDATE ON public.assessment_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- remove legacy conflicts: assessment_results (if existed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assessment_results') THEN
    DROP TABLE public.assessment_results;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  response_value JSONB NOT NULL,
  response_text  TEXT,
  response_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instance_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL UNIQUE REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
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
  auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_as_updated') THEN
    CREATE TRIGGER trg_as_updated BEFORE UPDATE ON public.assessment_scores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- =====================================================================
-- 5) RESOURCES / DOCUMENTS / REPORTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  url TEXT,
  meta JSONB,
  visibility TEXT NOT NULL DEFAULT 'therapist' CHECK (visibility IN ('therapist','client','public','admin')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'therapist' CHECK (generated_by IN ('therapist','ai','system')),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6) WORKSHEETS / EXERCISES / PROGRESS (keep legacy but encourage new)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cbt_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'thought_record',
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cbt_worksheet_updated') THEN
    CREATE TRIGGER trg_cbt_worksheet_updated BEFORE UPDATE ON public.cbt_worksheets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.worksheet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  responses JSONB,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.psychometric_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  responses JSONB DEFAULT '[]'::JSONB,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.therapeutic_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_config JSONB NOT NULL,
  progress JSONB,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('psychometric','exercise','manual')),
  source_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 7) GEN. APP SUPPORT
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT NOT NULL DEFAULT 'news' CHECK (kind IN ('news','vip','training')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  audience TEXT[] DEFAULT '{therapist}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_last_seen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 8) RLS (Medium: clients & therapists can see what they need; supervisor read)
-- =====================================================================

-- Enable RLS on all relevant tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
      AND table_name IN (
        'profiles','client_profiles','therapist_client_relations',
        'cases','treatment_plan_phases','session_notes','client_activities','session_agenda',
        'supervision_flags','case_summaries','resource_library',
        'appointments',
        'assessment_templates','assessment_instances','assessment_responses','assessment_scores',
        'resources','documents','assessment_reports',
        'cbt_worksheets','worksheets','worksheet_assignments','psychometric_forms','therapeutic_exercises','progress_tracking',
        'admin_announcements','tickets','user_last_seen'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
  END LOOP;
END$$;

-- Utility: role lookup
CREATE OR REPLACE VIEW public._me_role AS
SELECT p.id AS uid, p.role FROM public.profiles p WHERE p.id = auth.uid();

-- PROFILES
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (role='client' AND auth.uid() IN (SELECT therapist_id FROM public.therapist_client_relations WHERE client_id = profiles.id))
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );

DROP POLICY IF EXISTS profiles_self_upd ON public.profiles;
CREATE POLICY profiles_self_upd ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_client ON public.profiles;
CREATE POLICY profiles_insert_client ON public.profiles
  FOR INSERT WITH CHECK (
    (auth.uid() = id)
    OR (role='client' AND created_by_therapist = auth.uid()
        AND EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()))
  );

-- TCR
DROP POLICY IF EXISTS tcr_select ON public.therapist_client_relations;
CREATE POLICY tcr_select ON public.therapist_client_relations
  FOR SELECT USING (auth.uid() = therapist_id OR auth.uid() = client_id);
DROP POLICY IF EXISTS tcr_manage ON public.therapist_client_relations;
CREATE POLICY tcr_manage ON public.therapist_client_relations
  FOR ALL USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);

-- CLIENT PROFILES
DROP POLICY IF EXISTS client_profiles_manage ON public.client_profiles;
CREATE POLICY client_profiles_manage ON public.client_profiles
  FOR ALL USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);
DROP POLICY IF EXISTS client_profiles_client_read ON public.client_profiles;
CREATE POLICY client_profiles_client_read ON public.client_profiles
  FOR SELECT USING (auth.uid() = client_id);

-- CASES
DROP POLICY IF EXISTS cases_therapist ON public.cases;
CREATE POLICY cases_therapist ON public.cases
  FOR ALL USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());
DROP POLICY IF EXISTS cases_client ON public.cases;
CREATE POLICY cases_client ON public.cases
  FOR SELECT USING (client_id = auth.uid());
-- Supervisor read
DROP POLICY IF EXISTS cases_supervisor_read ON public.cases;
CREATE POLICY cases_supervisor_read ON public.cases
  FOR SELECT USING (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid()));

-- PHASES / NOTES / ACTIVITIES / AGENDA / FLAGS / SUMMARIES / RESOURCES (library)
-- Common read/write rules (therapist owner, client of case; supervisors read)
-- treatment_plan_phases
DROP POLICY IF EXISTS tpp_select ON public.treatment_plan_phases;
CREATE POLICY tpp_select ON public.treatment_plan_phases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND (c.therapist_id=auth.uid() OR c.client_id=auth.uid()))
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS tpp_manage ON public.treatment_plan_phases;
CREATE POLICY tpp_manage ON public.treatment_plan_phases
  FOR ALL USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid()));

-- session_notes
DROP POLICY IF EXISTS sn_select ON public.session_notes;
CREATE POLICY sn_select ON public.session_notes
  FOR SELECT USING (
    therapist_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.client_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS sn_manage ON public.session_notes;
CREATE POLICY sn_manage ON public.session_notes
  FOR ALL USING (therapist_id=auth.uid())
  WITH CHECK (therapist_id=auth.uid());

-- client_activities
DROP POLICY IF EXISTS ca_select ON public.client_activities;
CREATE POLICY ca_select ON public.client_activities
  FOR SELECT USING (
    client_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS ca_manage ON public.client_activities;
CREATE POLICY ca_manage ON public.client_activities
  FOR ALL USING (
    client_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid())
  )
  WITH CHECK (
    client_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid())
  );

-- session_agenda
DROP POLICY IF EXISTS sa_select ON public.session_agenda;
CREATE POLICY sa_select ON public.session_agenda
  FOR SELECT USING (
    therapist_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.client_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS sa_manage ON public.session_agenda;
CREATE POLICY sa_manage ON public.session_agenda
  FOR ALL USING (therapist_id=auth.uid())
  WITH CHECK (therapist_id=auth.uid());

-- supervision_flags
DROP POLICY IF EXISTS sf_select ON public.supervision_flags;
CREATE POLICY sf_select ON public.supervision_flags
  FOR SELECT USING (
    therapist_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.client_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS sf_manage ON public.supervision_flags;
CREATE POLICY sf_manage ON public.supervision_flags
  FOR ALL USING (therapist_id=auth.uid())
  WITH CHECK (therapist_id=auth.uid());

-- case_summaries
DROP POLICY IF EXISTS cs_select ON public.case_summaries;
CREATE POLICY cs_select ON public.case_summaries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND (c.therapist_id=auth.uid() OR c.client_id=auth.uid()))
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS cs_manage ON public.case_summaries;
CREATE POLICY cs_manage ON public.case_summaries
  FOR ALL USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id=case_id AND c.therapist_id=auth.uid()));

-- resource_library
DROP POLICY IF EXISTS rl_select ON public.resource_library;
CREATE POLICY rl_select ON public.resource_library
  FOR SELECT USING (
    is_public = TRUE
    OR therapist_owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role IN ('therapist','supervisor') AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS rl_manage ON public.resource_library;
CREATE POLICY rl_manage ON public.resource_library
  FOR ALL USING (therapist_owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()))
  WITH CHECK (therapist_owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()));

-- APPOINTMENTS
DROP POLICY IF EXISTS appt_therapist ON public.appointments;
CREATE POLICY appt_therapist ON public.appointments
  FOR ALL USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());
DROP POLICY IF EXISTS appt_client ON public.appointments;
CREATE POLICY appt_client ON public.appointments
  FOR SELECT USING (client_id = auth.uid());
DROP POLICY IF EXISTS appt_supervisor_read ON public.appointments;
CREATE POLICY appt_supervisor_read ON public.appointments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid()));

-- ASSESSMENTS (templates/instances/responses/scores)
DROP POLICY IF EXISTS templates_read ON public.assessment_templates;
CREATE POLICY templates_read ON public.assessment_templates
  FOR SELECT USING (is_active = TRUE OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role IN ('therapist','supervisor') AND mr.uid=auth.uid()));
DROP POLICY IF EXISTS templates_manage ON public.assessment_templates;
CREATE POLICY templates_manage ON public.assessment_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()));

DROP POLICY IF EXISTS ai_read ON public.assessment_instances;
CREATE POLICY ai_read ON public.assessment_instances
  FOR SELECT USING (therapist_id=auth.uid() OR client_id=auth.uid());
DROP POLICY IF EXISTS ai_insert ON public.assessment_instances;
CREATE POLICY ai_insert ON public.assessment_instances
  FOR INSERT WITH CHECK (therapist_id=auth.uid());
DROP POLICY IF EXISTS ai_update ON public.assessment_instances;
CREATE POLICY ai_update ON public.assessment_instances
  FOR UPDATE USING (therapist_id=auth.uid() OR client_id=auth.uid())
  WITH CHECK  (therapist_id=auth.uid() OR client_id=auth.uid());
DROP POLICY IF EXISTS ai_delete ON public.assessment_instances;
CREATE POLICY ai_delete ON public.assessment_instances
  FOR DELETE USING (therapist_id=auth.uid());

DROP POLICY IF EXISTS ar_all ON public.assessment_responses;
CREATE POLICY ar_all ON public.assessment_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id=assessment_responses.instance_id AND (ai.client_id=auth.uid() OR ai.therapist_id=auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id=assessment_responses.instance_id AND (ai.client_id=auth.uid() OR ai.therapist_id=auth.uid()))
  );

DROP POLICY IF EXISTS as_select ON public.assessment_scores;
CREATE POLICY as_select ON public.assessment_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id=assessment_scores.instance_id AND (ai.client_id=auth.uid() OR ai.therapist_id=auth.uid()))
  );
DROP POLICY IF EXISTS as_manage ON public.assessment_scores;
CREATE POLICY as_manage ON public.assessment_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id=assessment_scores.instance_id AND ai.therapist_id=auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id=assessment_scores.instance_id AND ai.therapist_id=auth.uid())
  );

-- RESOURCES / DOCUMENTS / REPORTS
DROP POLICY IF EXISTS resources_select ON public.resources;
CREATE POLICY resources_select ON public.resources
  FOR SELECT USING (
    visibility='public'
    OR (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role IN ('therapist','supervisor') AND mr.uid=auth.uid()) AND visibility IN ('therapist','public'))
    OR (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='client' AND mr.uid=auth.uid()) AND visibility IN ('client','public'))
  );
DROP POLICY IF EXISTS resources_manage ON public.resources;
CREATE POLICY resources_manage ON public.resources
  FOR ALL USING (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid()));

DROP POLICY IF EXISTS docs_select ON public.documents;
CREATE POLICY docs_select ON public.documents
  FOR SELECT USING (
    owner_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id=documents.case_id AND c.therapist_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS docs_manage ON public.documents;
CREATE POLICY docs_manage ON public.documents
  FOR ALL USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());

DROP POLICY IF EXISTS reports_select ON public.assessment_reports;
CREATE POLICY reports_select ON public.assessment_reports
  FOR SELECT USING (client_id=auth.uid() OR therapist_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid()));
DROP POLICY IF EXISTS reports_manage ON public.assessment_reports;
CREATE POLICY reports_manage ON public.assessment_reports
  FOR ALL USING (therapist_id=auth.uid()) WITH CHECK (therapist_id=auth.uid());

-- WORKSHEETS / EXERCISES / PROGRESS
DROP POLICY IF EXISTS cbt_select ON public.cbt_worksheets;
CREATE POLICY cbt_select ON public.cbt_worksheets
  FOR SELECT USING (therapist_id=auth.uid() OR client_id=auth.uid());
DROP POLICY IF EXISTS cbt_insert ON public.cbt_worksheets;
CREATE POLICY cbt_insert ON public.cbt_worksheets
  FOR INSERT WITH CHECK (therapist_id=auth.uid());
DROP POLICY IF EXISTS cbt_update ON public.cbt_worksheets;
CREATE POLICY cbt_update ON public.cbt_worksheets
  FOR UPDATE USING (therapist_id=auth.uid() OR client_id=auth.uid())
  WITH CHECK  (therapist_id=auth.uid() OR client_id=auth.uid());

DROP POLICY IF EXISTS worksheets_manage ON public.worksheets;
CREATE POLICY worksheets_manage ON public.worksheets
  FOR ALL USING (therapist_id=auth.uid()) WITH CHECK (therapist_id=auth.uid());

DROP POLICY IF EXISTS wa_select ON public.worksheet_assignments;
CREATE POLICY wa_select ON public.worksheet_assignments
  FOR SELECT USING (
    client_id=auth.uid()
    OR (EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id=worksheet_id AND w.therapist_id=auth.uid()))
  );
DROP POLICY IF EXISTS wa_manage ON public.worksheet_assignments;
CREATE POLICY wa_manage ON public.worksheet_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id=worksheet_id AND w.therapist_id=auth.uid()))
  WITH CHECK  (EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id=worksheet_id AND w.therapist_id=auth.uid()));

DROP POLICY IF EXISTS forms_select ON public.psychometric_forms;
CREATE POLICY forms_select ON public.psychometric_forms
  FOR SELECT USING (client_id=auth.uid() OR therapist_id=auth.uid());
DROP POLICY IF EXISTS forms_manage ON public.psychometric_forms;
CREATE POLICY forms_manage ON public.psychometric_forms
  FOR ALL USING (therapist_id=auth.uid()) WITH CHECK (therapist_id=auth.uid());

DROP POLICY IF EXISTS exercises_select ON public.therapeutic_exercises;
CREATE POLICY exercises_select ON public.therapeutic_exercises
  FOR SELECT USING (client_id=auth.uid() OR therapist_id=auth.uid());
DROP POLICY IF EXISTS exercises_manage ON public.therapeutic_exercises;
CREATE POLICY exercises_manage ON public.therapeutic_exercises
  FOR ALL USING (therapist_id=auth.uid()) WITH CHECK (therapist_id=auth.uid());

DROP POLICY IF EXISTS progress_select ON public.progress_tracking;
CREATE POLICY progress_select ON public.progress_tracking
  FOR SELECT USING (
    client_id=auth.uid()
    OR (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid())
        AND auth.uid() IN (SELECT therapist_id FROM public.therapist_client_relations WHERE client_id=progress_tracking.client_id))
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='supervisor' AND mr.uid=auth.uid())
  );
DROP POLICY IF EXISTS progress_insert ON public.progress_tracking;
CREATE POLICY progress_insert ON public.progress_tracking
  FOR INSERT WITH CHECK (
    client_id=auth.uid()
    OR EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role='therapist' AND mr.uid=auth.uid())
  );

-- ADMIN SUPPORT
DROP POLICY IF EXISTS announcements_select ON public.admin_announcements;
CREATE POLICY announcements_select ON public.admin_announcements FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS announcements_manage ON public.admin_announcements;
CREATE POLICY announcements_manage ON public.admin_announcements
  FOR ALL USING (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role IN ('therapist','supervisor') AND mr.uid=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public._me_role mr WHERE mr.role IN ('therapist','supervisor') AND mr.uid=auth.uid()));

DROP POLICY IF EXISTS tickets_self ON public.tickets;
CREATE POLICY tickets_self ON public.tickets
  FOR ALL USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

DROP POLICY IF EXISTS uls_self ON public.user_last_seen;
CREATE POLICY uls_self ON public.user_last_seen
  FOR ALL USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- =====================================================================
-- 9) CLEANUP LEGACY CONFLICTS (optional: uncomment to remove)
-- =====================================================================
-- Example legacy tables you may drop if present and unused:
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assessment_results_legacy') THEN
--     DROP TABLE public.assessment_results_legacy;
--   END IF;
-- END $$;
