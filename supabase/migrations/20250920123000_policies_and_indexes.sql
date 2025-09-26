-- Policies and indexes migration (conservative, idempotent)
-- Generated: 2025-09-20
-- Purpose: Add indexes found in production report but missing from consolidated schema
--          Add placeholders for RLS/policy changes (review & apply in staging)

BEGIN;

-- Indexes for public schema (CREATE IF NOT EXISTS style)
-- Note: some indexes in the report are UNIQUE PKs created automatically by table definitions.

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments USING btree (start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON public.appointments USING btree (therapist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments USING btree (therapist_id);
-- upcoming appointments partial index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_upcoming_appointments'
  ) THEN
    EXECUTE 'CREATE INDEX idx_upcoming_appointments ON public.appointments USING btree (therapist_id, start_time) WHERE ((is_upcoming = true) AND (status = ''scheduled''::text))';
  END IF;
END$$;

-- assessment_instance_latest_score
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id ON public.assessment_instance_latest_score USING btree (instance_id);

-- assessment_instances
CREATE INDEX IF NOT EXISTS idx_assessment_instances_assigned_at ON public.assessment_instances USING btree (assigned_at);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client_id ON public.assessment_instances USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client_status ON public.assessment_instances USING btree (client_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON public.assessment_instances USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON public.assessment_instances USING btree (status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_template_id ON public.assessment_instances USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist_id ON public.assessment_instances USING btree (therapist_id);
-- pending assessments partial index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_pending_assessments'
  ) THEN
    EXECUTE 'CREATE INDEX idx_pending_assessments ON public.assessment_instances USING btree (therapist_id) WHERE (status = ANY (ARRAY[''assigned''::text, ''in_progress''::text]))';
  END IF;
END$$;

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON public.audit_logs USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

-- cases
CREATE INDEX IF NOT EXISTS idx_active_cases ON public.cases USING btree (therapist_id) WHERE (status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_cases_archived_at ON public.cases USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases USING btree (case_number);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_status ON public.cases USING btree (client_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_current_phase ON public.cases USING btree (current_phase);
CREATE INDEX IF NOT EXISTS idx_cases_diagnosis_codes ON public.cases USING gin (diagnosis_codes);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases USING btree (status);
CREATE INDEX IF NOT EXISTS idx_cases_therapist_id ON public.cases USING btree (therapist_id);
CREATE INDEX IF NOT EXISTS idx_cases_therapist_status ON public.cases USING btree (therapist_id, status);

-- client_profiles
CREATE UNIQUE INDEX IF NOT EXISTS client_profiles_client_id_therapist_id_key ON public.client_profiles USING btree (client_id, therapist_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_client_id ON public.client_profiles USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_therapist_id ON public.client_profiles USING btree (therapist_id);

-- support tickets
CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_categories_pkey ON public.support_ticket_categories USING btree (key);
CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_tags_pkey ON public.support_ticket_tags USING btree (key);
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_pkey ON public.support_tickets USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_ticket_number_key ON public.support_tickets USING btree (ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_activity ON public.support_tickets USING btree (last_activity_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON public.support_tickets USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_id ON public.support_tickets USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_key ON public.support_tickets USING btree (category_key);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_activity ON public.support_tickets USING btree (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_metadata ON public.support_tickets USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON public.support_tickets USING btree (requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_search ON public.support_tickets USING gin (search);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets USING btree (status);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles USING btree (city);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles USING btree (country);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_therapist ON public.profiles USING btree (created_by_therapist);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_therapist ON public.profiles USING btree (is_therapist);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_patient_code ON public.profiles USING btree (patient_code);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles USING btree (verification_status);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pkey ON public.profiles USING btree (id);

-- progress_tracking
CREATE INDEX IF NOT EXISTS idx_progress_tracking_client_id ON public.progress_tracking USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_metric_type ON public.progress_tracking USING btree (metric_type);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_recorded_at ON public.progress_tracking USING btree (recorded_at);
CREATE UNIQUE INDEX IF NOT EXISTS progress_tracking_pkey ON public.progress_tracking USING btree (id);

-- other public indexes (unique pkeys) - idempotent
CREATE UNIQUE INDEX IF NOT EXISTS appointments_pkey ON public.appointments USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_instances_pkey ON public.assessment_instances USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_reports_pkey ON public.assessment_reports USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_responses_pkey ON public.assessment_responses USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_responses_instance_id_question_id_key ON public.assessment_responses USING btree (instance_id, question_id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_scores_pkey ON public.assessment_scores USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_templates_pkey ON public.assessment_templates USING btree (id);
CREATE UNIQUE_INDEX IF NOT EXISTS audit_logs_pkey ON public.audit_logs USING btree (id);

-- Placeholder: RLS policies & SECURITY DEFINER functions
-- REVIEW: The consolidated schema intentionally avoids applying RLS/policies automatically.
-- Create a new migration (policies-only) with reviewed RLS and SECURITY DEFINER functions.

-- Example placeholder for policies migration (do NOT enable without review):
-- CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR role = 'therapist');

COMMIT;
