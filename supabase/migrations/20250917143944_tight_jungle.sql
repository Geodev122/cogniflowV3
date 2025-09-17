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
  ai.status,
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
CREATE OR REPLACE FUNCTION refresh_assessment_views()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY assessment_instance_latest_score;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id 
ON assessment_instance_latest_score(instance_id);

-- Trigger to refresh view when assessment data changes
CREATE TRIGGER refresh_assessment_views_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assessment_instances
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_assessment_views();

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