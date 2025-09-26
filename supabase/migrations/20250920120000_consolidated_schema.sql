-- Consolidated schema migration for Cogniflow V3
-- Generated: 2025-09-20
-- Idempotent: safe to run multiple times

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Core: profiles (supabase auth profiles complement)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'client',
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  whatsapp_number TEXT,
  patient_code TEXT,
  created_by_therapist UUID,
  professional_details JSONB,
  raw_user_meta_data JSONB,
  verification_status TEXT,
  password_set BOOLEAN DEFAULT FALSE,
  profile_completion_percentage INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_therapist ON public.profiles (created_by_therapist);

-- Therapist-client relations
CREATE TABLE IF NOT EXISTS public.therapist_client_relations (
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (therapist_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_therapist_client_relations_therapist_id ON public.therapist_client_relations (therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_client_relations_client_id ON public.therapist_client_relations (client_id);

-- Client detailed profiles
CREATE TABLE IF NOT EXISTS public.client_profiles (
  client_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  medical_history TEXT,
  current_medications TEXT,
  presenting_concerns TEXT,
  therapy_history TEXT,
  risk_level TEXT,
  notes TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_profiles_therapist_id ON public.client_profiles (therapist_id);

-- Cases
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_number TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  current_phase TEXT,
  diagnosis_codes TEXT[],
  formulation JSONB,
  intake_data JSONB,
  treatment_plan JSONB,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases (client_id);
CREATE INDEX IF NOT EXISTS idx_cases_therapist_id ON public.cases (therapist_id);

-- Treatment plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  title TEXT,
  case_formulation TEXT,
  treatment_approach TEXT,
  estimated_duration TEXT,
  goals JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_client_id ON public.treatment_plans (client_id);

-- Therapy goals
CREATE TABLE IF NOT EXISTS public.therapy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  goal_text TEXT,
  target_date DATE,
  progress_percentage INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  appointment_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INT,
  appointment_type TEXT,
  status TEXT DEFAULT 'scheduled',
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON public.appointments (therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments (client_id);

-- Session notes
CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  session_index INT,
  content JSONB,
  finalized BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessments: templates, instances, responses, scores, library
CREATE TABLE IF NOT EXISTS public.assessment_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  abbreviation TEXT,
  category TEXT,
  description TEXT,
  version TEXT,
  questions JSONB,
  scoring_config JSONB,
  interpretation_rules JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT REFERENCES public.assessment_templates(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  title TEXT,
  instructions TEXT,
  status TEXT,
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_frequency TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  question_id TEXT,
  item_id TEXT,
  response_value NUMERIC,
  response_text TEXT,
  response_timestamp TIMESTAMPTZ,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  raw_score NUMERIC,
  scaled_score NUMERIC,
  interpretation_category TEXT,
  interpretation_description TEXT,
  clinical_significance TEXT,
  severity_level TEXT,
  recommendations TEXT,
  auto_generated BOOLEAN DEFAULT TRUE,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_library (
  id TEXT PRIMARY KEY,
  name TEXT,
  abbreviation TEXT,
  category TEXT,
  description TEXT,
  questions JSONB,
  scoring_method JSONB,
  interpretation_guide JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Worksheets & exercises
CREATE TABLE IF NOT EXISTS public.cbt_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  type TEXT,
  title TEXT,
  content JSONB,
  responses JSONB,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.therapeutic_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  exercise_type TEXT,
  title TEXT,
  description TEXT,
  game_config JSONB,
  progress JSONB,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at TIMESTAMPTZ
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS public.progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  metric_type TEXT,
  value NUMERIC,
  source_type TEXT,
  source_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment reports and analytics
CREATE TABLE IF NOT EXISTS public.assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_type TEXT,
  title TEXT,
  content JSONB,
  generated_by TEXT,
  report_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practice_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metric_name TEXT,
  metric_value NUMERIC,
  metric_date DATE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resource library
CREATE TABLE IF NOT EXISTS public.resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  content_type TEXT,
  content_url TEXT,
  tags TEXT[],
  difficulty_level TEXT,
  evidence_level TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT FALSE,
  therapist_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communication logs
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  communication_type TEXT,
  subject TEXT,
  content TEXT,
  direction TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In-between sessions
CREATE TABLE IF NOT EXISTS public.in_between_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type TEXT,
  task_title TEXT,
  task_data JSONB,
  client_response JSONB,
  mood_rating INT,
  client_notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  client_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support tickets (from existing migration set)
CREATE TABLE IF NOT EXISTS public.support_ticket_categories (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.support_ticket_tags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq;
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_key TEXT REFERENCES public.support_ticket_categories(key) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  subject TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search tsvector
);
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT,
  is_internal BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.support_ticket_watchers (
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, profile_id)
);
CREATE TABLE IF NOT EXISTS public.support_ticket_tag_map (
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_key TEXT REFERENCES public.support_ticket_tags(key) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_key)
);
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance-critical queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON public.support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee  ON public.support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status    ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority  ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_activity  ON public.support_tickets(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_search    ON public.support_tickets USING GIN (search);
CREATE INDEX IF NOT EXISTS idx_support_tickets_metadata  ON public.support_tickets USING GIN (metadata);

-- Minimal RLS policy placeholders (expect RLS configured separately)
-- Do NOT enable RLS here; leave policies in their migration files to avoid unexpected privilege changes.

COMMIT;

-- Analyze to update planner statistics
ANALYZE;
