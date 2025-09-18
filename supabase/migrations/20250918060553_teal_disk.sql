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

-- User roles with hierarchy
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'therapist', 'client');

-- Case and session statuses
CREATE TYPE case_status AS ENUM ('active', 'paused', 'closed', 'archived', 'transferred');
CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE appointment_type AS ENUM ('individual', 'group', 'family', 'assessment', 'consultation', 'intake');

-- Assessment system statuses
CREATE TYPE assessment_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired', 'cancelled');
CREATE TYPE assessment_category AS ENUM ('depression', 'anxiety', 'trauma', 'stress', 'wellbeing', 'personality', 'substance', 'eating', 'sleep', 'general');
CREATE TYPE scoring_method AS ENUM ('sum', 'average', 'weighted_sum', 'custom');
CREATE TYPE evidence_level AS ENUM ('research_based', 'clinical_consensus', 'expert_opinion');

-- Risk and severity levels
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'crisis');
CREATE TYPE severity_level AS ENUM ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe', 'very_severe');
CREATE TYPE clinical_significance AS ENUM ('subclinical', 'mild', 'moderate', 'significant', 'severe', 'critical');

-- Communication and request types
CREATE TYPE communication_type AS ENUM ('email', 'phone', 'text', 'whatsapp', 'in_person', 'crisis', 'reminder');
CREATE TYPE communication_direction AS ENUM ('outgoing', 'incoming');
CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'cancelled');

-- Professional and compliance types
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE license_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'expired');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive');

-- Content and resource types
CREATE TYPE content_type AS ENUM ('pdf', 'video', 'audio', 'interactive', 'link', 'text', 'worksheet', 'protocol', 'course');
CREATE TYPE resource_category AS ENUM ('assessment', 'worksheet', 'educational', 'intervention', 'protocol', 'legal', 'template');

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
ALTER TABLE therapist_case_relations 
ADD CONSTRAINT fk_therapist_case_relations_case_id 
FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

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
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Assessment results with latest scores
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
  
  -- Template info
  at.name as template_name,
  at.abbreviation as template_abbrev,
  
  -- Latest score
  asc.id as score_id,
  asc.raw_score,
  asc.scaled_score,
  asc.percentile,
  asc.t_score,
  asc.z_score,
  asc.interpretation_category,
  asc.interpretation_description,
  asc.clinical_significance,
  asc.severity_level,
  asc.recommendations,
  asc.calculated_at
  
FROM assessment_instances ai
LEFT JOIN assessment_templates at ON ai.template_id = at.id
LEFT JOIN assessment_scores asc ON ai.id = asc.instance_id
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
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_instances_updated_at BEFORE UPDATE ON assessment_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_notes_updated_at BEFORE UPDATE ON session_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON treatment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Case number generation trigger
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('case_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for case numbers
CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

-- Apply case number trigger
CREATE TRIGGER generate_case_number_trigger 
BEFORE INSERT ON cases 
FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Patient code generation trigger
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_code IS NULL AND NEW.role = 'client' THEN
    NEW.patient_code := 'PT' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_patient_code_trigger 
BEFORE INSERT ON profiles 
FOR EACH ROW EXECUTE FUNCTION generate_patient_code();

-- Update case activity timestamp
CREATE OR REPLACE FUNCTION update_case_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cases 
  SET last_activity_at = NOW() 
  WHERE id = COALESCE(NEW.case_id, OLD.case_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply activity triggers
CREATE TRIGGER update_case_activity_sessions AFTER INSERT OR UPDATE OR DELETE ON session_notes FOR EACH ROW EXECUTE FUNCTION update_case_activity();
CREATE TRIGGER update_case_activity_assessments AFTER INSERT OR UPDATE OR DELETE ON assessment_instances FOR EACH ROW EXECUTE FUNCTION update_case_activity();

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

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Therapists can read their clients' basic info
CREATE POLICY "Therapists can read assigned clients" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapist_client_relations tcr
      WHERE tcr.therapist_id = auth.uid() 
      AND tcr.client_id = profiles.id
    )
  );

-- Supervisors can read therapists and their clients
CREATE POLICY "Supervisors can read therapist profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
    AND role IN ('therapist', 'client')
  );

-- ============================================================================
-- CASE MANAGEMENT POLICIES
-- ============================================================================

-- Therapists can manage their own cases
CREATE POLICY "Therapists can manage own cases" ON cases
  FOR ALL USING (therapist_id = auth.uid());

-- Clients can read their own cases
CREATE POLICY "Clients can read own cases" ON cases
  FOR SELECT USING (client_id = auth.uid());

-- Supervisors can read flagged cases
CREATE POLICY "Supervisors can read flagged cases" ON cases
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
    AND EXISTS (
      SELECT 1 FROM supervision_flags sf 
      WHERE sf.case_id = cases.id
    )
  );

-- Multi-therapist case access
CREATE POLICY "Multi-therapist case access" ON cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapist_case_relations tcr
      WHERE tcr.case_id = cases.id 
      AND tcr.therapist_id = auth.uid()
    )
  );

-- ============================================================================
-- CLIENT PROFILES POLICIES
-- ============================================================================

-- Therapists can manage their clients' profiles
CREATE POLICY "Therapists can manage client profiles" ON client_profiles
  FOR ALL USING (therapist_id = auth.uid());

-- Clients can read their own profile
CREATE POLICY "Clients can read own profile" ON client_profiles
  FOR SELECT USING (client_id = auth.uid());

-- ============================================================================
-- ASSESSMENT SYSTEM POLICIES
-- ============================================================================

-- Public assessment templates
CREATE POLICY "Public assessment templates" ON assessment_templates
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

-- Therapists can manage assessment instances
CREATE POLICY "Therapists can manage assessment instances" ON assessment_instances
  FOR ALL USING (therapist_id = auth.uid());

-- Clients can access their assigned assessments
CREATE POLICY "Clients can access assigned assessments" ON assessment_instances
  FOR SELECT USING (client_id = auth.uid());

-- Clients can update their assessment progress
CREATE POLICY "Clients can update assessment progress" ON assessment_instances
  FOR UPDATE USING (client_id = auth.uid());

-- Assessment responses access
CREATE POLICY "Assessment responses access" ON assessment_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessment_instances ai
      WHERE ai.id = assessment_responses.instance_id
      AND (ai.therapist_id = auth.uid() OR ai.client_id = auth.uid())
    )
  );

-- Assessment scores access
CREATE POLICY "Assessment scores access" ON assessment_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessment_instances ai
      WHERE ai.id = assessment_scores.instance_id
      AND (ai.therapist_id = auth.uid() OR ai.client_id = auth.uid())
    )
  );

-- ============================================================================
-- SESSION MANAGEMENT POLICIES
-- ============================================================================

-- Appointment access
CREATE POLICY "Appointment access" ON appointments
  FOR ALL USING (therapist_id = auth.uid() OR client_id = auth.uid());

-- Session notes access (therapists only)
CREATE POLICY "Session notes therapist access" ON session_notes
  FOR ALL USING (therapist_id = auth.uid());

-- Session agenda access
CREATE POLICY "Session agenda access" ON session_agenda
  FOR ALL USING (therapist_id = auth.uid());

-- ============================================================================
-- RESOURCE LIBRARY POLICIES
-- ============================================================================

-- Public resources and owned resources
CREATE POLICY "Resource library access" ON resource_library
  FOR SELECT USING (
    is_public = true 
    OR therapist_owner_id = auth.uid()
    OR created_by = auth.uid()
  );

-- Therapists can create resources
CREATE POLICY "Therapists can create resources" ON resource_library
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'therapist'
  );

-- Therapists can update their own resources
CREATE POLICY "Therapists can update own resources" ON resource_library
  FOR UPDATE USING (therapist_owner_id = auth.uid() OR created_by = auth.uid());

-- ============================================================================
-- COMMUNICATION POLICIES
-- ============================================================================

-- Communication logs access
CREATE POLICY "Communication logs access" ON communication_logs
  FOR ALL USING (therapist_id = auth.uid() OR client_id = auth.uid());

-- Client requests access
CREATE POLICY "Client requests access" ON client_requests
  FOR ALL USING (client_id = auth.uid() OR therapist_id = auth.uid());

-- ============================================================================
-- SUPERVISION POLICIES
-- ============================================================================

-- Supervision flags access
CREATE POLICY "Supervision flags access" ON supervision_flags
  FOR ALL USING (
    therapist_id = auth.uid() 
    OR flagged_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- Supervision threads access
CREATE POLICY "Supervision threads access" ON supervision_threads
  FOR ALL USING (
    therapist_id = auth.uid() 
    OR supervisor_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- ============================================================================
-- PROFESSIONAL MANAGEMENT POLICIES
-- ============================================================================

-- Therapist licenses (own only)
CREATE POLICY "Therapist licenses own access" ON therapist_licenses
  FOR ALL USING (therapist_id = auth.uid());

-- Subscriptions (own only)
CREATE POLICY "Subscriptions own access" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Invoices (own only)
CREATE POLICY "Invoices own access" ON invoices
  FOR ALL USING (user_id = auth.uid());

-- Clinic spaces (public read, admin manage)
CREATE POLICY "Clinic spaces public read" ON clinic_spaces
  FOR SELECT USING (active = true);

-- Clinic rental requests
CREATE POLICY "Clinic rental requests access" ON clinic_rental_requests
  FOR ALL USING (
    therapist_id = auth.uid() 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- AUDIT AND ANALYTICS POLICIES
-- ============================================================================

-- Audit logs (read own, supervisors read all)
CREATE POLICY "Audit logs access" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('supervisor', 'admin')
  );

-- User activity tracking (own only)
CREATE POLICY "User last seen own access" ON user_last_seen
  FOR ALL USING (user_id = auth.uid());

-- Practice analytics (own only)
CREATE POLICY "Practice analytics own access" ON practice_analytics
  FOR ALL USING (therapist_id = auth.uid());

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
  REFRESH MATERIALIZED VIEW assessment_instance_latest_score;
  REFRESH MATERIALIZED VIEW therapist_dashboard_summary;
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
CREATE POLICY "Public resource files" ON storage.objects FOR SELECT USING (bucket_id = 'resource_files');
CREATE POLICY "Therapists can upload resources" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resource_files' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'therapist');
CREATE POLICY "Therapists can manage licensing docs" ON storage.objects FOR ALL USING (bucket_id = 'licensing' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'therapist');

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
CREATE INDEX IF NOT EXISTS idx_upcoming_appointments ON appointments(therapist_id, start_time) WHERE status = 'scheduled' AND start_time > NOW();

-- ============================================================================
-- DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure valid email formats
ALTER TABLE profiles ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure valid phone numbers (basic check)
ALTER TABLE profiles ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

-- Ensure valid progress percentages
ALTER TABLE therapy_goals ADD CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Ensure valid scores
ALTER TABLE assessment_scores ADD CONSTRAINT valid_raw_score CHECK (raw_score >= 0);
ALTER TABLE assessment_scores ADD CONSTRAINT valid_percentile CHECK (percentile IS NULL OR (percentile >= 0 AND percentile <= 100));

-- Ensure valid appointment times
ALTER TABLE appointments ADD CONSTRAINT valid_appointment_duration CHECK (end_time > start_time);
ALTER TABLE appointments ADD CONSTRAINT valid_duration_minutes CHECK (duration_minutes > 0 AND duration_minutes <= 480);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'Core user profiles supporting therapists, clients, supervisors, and admins';
COMMENT ON TABLE cases IS 'Central case management with treatment tracking and clinical data';
COMMENT ON TABLE assessment_templates IS 'Psychometric assessment instruments and scoring configurations';
COMMENT ON TABLE assessment_instances IS 'Individual assessment assignments with progress tracking';
COMMENT ON TABLE session_notes IS 'Clinical session documentation with versioning support';
COMMENT ON TABLE resource_library IS 'Comprehensive library of therapeutic resources and materials';
COMMENT ON TABLE supervision_flags IS 'Case flagging system for supervisor review and consultation';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance and security';

COMMENT ON COLUMN profiles.professional_details IS 'JSONB field storing therapist qualifications, specializations, and practice information';
COMMENT ON COLUMN cases.treatment_plan IS 'JSONB field storing structured treatment plan with goals and interventions';
COMMENT ON COLUMN assessment_templates.questions IS 'JSONB array of assessment questions with type, options, and validation rules';
COMMENT ON COLUMN assessment_templates.scoring_config IS 'JSONB configuration for scoring method, weights, and calculations';
COMMENT ON COLUMN session_notes.content IS 'JSONB field storing structured session notes, interventions, and observations';