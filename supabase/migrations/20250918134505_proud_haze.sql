/*
  # Case Archives System - Complete Implementation

  1. New Tables
    - `supervision_requests` - Track supervision requests with notes and status
    - `case_referrals` - Handle therapist-to-therapist case transfers
    - `case_audit_logs` - Comprehensive audit trail for all case actions
    - `supervision_attachments` - File attachments for supervision requests

  2. Enhanced Tables
    - `cases` - Add missing status enum, archive timestamps, and audit fields
    - Add proper indexes for performance

  3. Security
    - Enable RLS on all new tables
    - Add role-based policies for therapists, supervisors, and admins
    - Audit logging for all sensitive actions

  4. Business Logic
    - Triggers for automatic timestamp management
    - Functions for permission checking and status transitions
    - Edge function support for secure state transitions
*/

-- Create enums for consistent status management
DO $$ BEGIN
  CREATE TYPE case_status AS ENUM ('open', 'active', 'paused', 'closed', 'archived', 'transferred');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE supervision_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enhance cases table with archive support
DO $$
BEGIN
  -- Add status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'status'
  ) THEN
    ALTER TABLE cases ADD COLUMN status case_status NOT NULL DEFAULT 'active';
  END IF;

  -- Add archive timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE cases ADD COLUMN archived_at timestamptz;
  END IF;

  -- Add closed timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE cases ADD COLUMN closed_at timestamptz;
  END IF;

  -- Add last session tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'last_session_at'
  ) THEN
    ALTER TABLE cases ADD COLUMN last_session_at timestamptz;
  END IF;

  -- Add archive reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'archive_reason'
  ) THEN
    ALTER TABLE cases ADD COLUMN archive_reason text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_archived_at ON cases(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_therapist_status ON cases(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_client_status ON cases(client_id, status);

-- Supervision Requests Table
CREATE TABLE IF NOT EXISTS supervision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Supervision Request',
  notes text,
  priority integer DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  status supervision_status NOT NULL DEFAULT 'pending',
  attachments jsonb DEFAULT '[]'::jsonb,
  supervisor_feedback text,
  supervisor_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case Referrals Table
CREATE TABLE IF NOT EXISTS case_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  notes text,
  status referral_status NOT NULL DEFAULT 'pending',
  handoff_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case Audit Logs Table
CREATE TABLE IF NOT EXISTS case_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supervision Attachments Table (for file uploads)
CREATE TABLE IF NOT EXISTS supervision_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervision_request_id uuid NOT NULL REFERENCES supervision_requests(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supervision_requests_case ON supervision_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_supervision_requests_requester ON supervision_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_supervision_requests_supervisor ON supervision_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervision_requests_status ON supervision_requests(status);

CREATE INDEX IF NOT EXISTS idx_case_referrals_case ON case_referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_case_referrals_from ON case_referrals(from_therapist_id);
CREATE INDEX IF NOT EXISTS idx_case_referrals_to ON case_referrals(to_therapist_id);
CREATE INDEX IF NOT EXISTS idx_case_referrals_status ON case_referrals(status);

CREATE INDEX IF NOT EXISTS idx_case_audit_logs_case ON case_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_actor ON case_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_action ON case_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_created_at ON case_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_supervision_attachments_request ON supervision_attachments(supervision_request_id);

-- Business Logic Functions

-- Function to set case timestamps automatically
CREATE OR REPLACE FUNCTION set_case_timestamps()
RETURNS trigger AS $$
BEGIN
  -- Set archived_at when status changes to archived
  IF NEW.status = 'archived' AND OLD.status != 'archived' AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
  END IF;
  
  -- Set closed_at when status changes to closed
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  
  -- Clear timestamps when reopening
  IF NEW.status IN ('active', 'open') AND OLD.status IN ('archived', 'closed') THEN
    NEW.archived_at := NULL;
    NEW.closed_at := NULL;
  END IF;
  
  -- Update last_activity_at
  NEW.last_activity_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check case permissions
CREATE OR REPLACE FUNCTION check_case_permissions(
  case_id_param uuid,
  user_id_param uuid,
  action_param text
)
RETURNS boolean AS $$
DECLARE
  case_record record;
  user_role text;
  is_owner boolean := false;
  is_supervisor boolean := false;
  is_assigned boolean := false;
BEGIN
  -- Get case details
  SELECT * INTO case_record FROM cases WHERE id = case_id_param;
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE id = user_id_param;
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Check ownership
  is_owner := case_record.therapist_id = user_id_param;
  
  -- Check if supervisor
  is_supervisor := user_role = 'supervisor';
  
  -- Check if assigned therapist
  SELECT EXISTS(
    SELECT 1 FROM therapist_case_relations 
    WHERE case_id = case_id_param AND therapist_id = user_id_param
  ) INTO is_assigned;
  
  -- Permission logic based on action
  CASE action_param
    WHEN 'read' THEN
      RETURN is_owner OR is_supervisor OR is_assigned;
    WHEN 'edit' THEN
      RETURN (is_owner OR is_assigned) AND case_record.status IN ('active', 'open', 'paused');
    WHEN 'reopen' THEN
      RETURN is_owner OR is_supervisor;
    WHEN 'archive' THEN
      RETURN is_owner OR is_supervisor;
    WHEN 'refer' THEN
      RETURN is_owner AND case_record.status IN ('active', 'open', 'paused');
    WHEN 'submit_supervision' THEN
      RETURN is_owner OR is_assigned;
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log case actions
CREATE OR REPLACE FUNCTION log_case_action(
  case_id_param uuid,
  actor_id_param uuid,
  action_param text,
  details_param jsonb DEFAULT '{}'::jsonb,
  old_values_param jsonb DEFAULT NULL,
  new_values_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO case_audit_logs (
    case_id, actor_id, action, details, old_values, new_values
  ) VALUES (
    case_id_param, actor_id_param, action_param, details_param, old_values_param, new_values_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trg_case_timestamps ON cases;
CREATE TRIGGER trg_case_timestamps
  BEFORE UPDATE ON cases
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_case_timestamps();

DROP TRIGGER IF EXISTS trg_update_cases_updated_at ON cases;
CREATE TRIGGER trg_update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE supervision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supervision_requests
DROP POLICY IF EXISTS "Therapists can create supervision requests for own cases" ON supervision_requests;
CREATE POLICY "Therapists can create supervision requests for own cases"
  ON supervision_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    check_case_permissions(case_id, auth.uid(), 'submit_supervision')
  );

DROP POLICY IF EXISTS "Requesters and supervisors can read supervision requests" ON supervision_requests;
CREATE POLICY "Requesters and supervisors can read supervision requests"
  ON supervision_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid() OR 
    supervisor_id = auth.uid() OR
    public.get_user_role() = 'supervisor'
  );

DROP POLICY IF EXISTS "Supervisors can update supervision requests" ON supervision_requests;
CREATE POLICY "Supervisors can update supervision requests"
  ON supervision_requests FOR UPDATE
  TO authenticated
  USING (
    supervisor_id = auth.uid() OR
    public.get_user_role() = 'supervisor'
  )
  WITH CHECK (
    supervisor_id = auth.uid() OR
    public.get_user_role() = 'supervisor'
  );

-- RLS Policies for case_referrals
DROP POLICY IF EXISTS "Therapists can create referrals for own cases" ON case_referrals;
CREATE POLICY "Therapists can create referrals for own cases"
  ON case_referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    check_case_permissions(case_id, auth.uid(), 'refer')
  );

DROP POLICY IF EXISTS "Involved therapists can read referrals" ON case_referrals;
CREATE POLICY "Involved therapists can read referrals"
  ON case_referrals FOR SELECT
  TO authenticated
  USING (
    from_therapist_id = auth.uid() OR 
    to_therapist_id = auth.uid()
  );

DROP POLICY IF EXISTS "Target therapists can update referral status" ON case_referrals;
CREATE POLICY "Target therapists can update referral status"
  ON case_referrals FOR UPDATE
  TO authenticated
  USING (to_therapist_id = auth.uid())
  WITH CHECK (to_therapist_id = auth.uid());

-- RLS Policies for case_audit_logs
DROP POLICY IF EXISTS "Users can read audit logs for accessible cases" ON case_audit_logs;
CREATE POLICY "Users can read audit logs for accessible cases"
  ON case_audit_logs FOR SELECT
  TO authenticated
  USING (
    check_case_permissions(case_id, auth.uid(), 'read')
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON case_audit_logs;
CREATE POLICY "System can insert audit logs"
  ON case_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for supervision_attachments
DROP POLICY IF EXISTS "Supervision participants can manage attachments" ON supervision_attachments;
CREATE POLICY "Supervision participants can manage attachments"
  ON supervision_attachments FOR ALL
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM supervision_requests sr
      WHERE sr.id = supervision_request_id
      AND (sr.requester_id = auth.uid() OR sr.supervisor_id = auth.uid())
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM supervision_requests sr
      WHERE sr.id = supervision_request_id
      AND (sr.requester_id = auth.uid() OR sr.supervisor_id = auth.uid())
    )
  );

-- Create storage bucket for supervision attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supervision-attachments',
  'supervision-attachments',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for supervision attachments
DROP POLICY IF EXISTS "Authenticated users can upload supervision attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload supervision attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'supervision-attachments');

DROP POLICY IF EXISTS "Users can read own supervision attachments" ON storage.objects;
CREATE POLICY "Users can read own supervision attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supervision-attachments' AND
    (auth.uid()::text = (storage.foldername(name))[1])
  );

-- Sample data for testing
DO $$
DECLARE
  therapist1_id uuid;
  therapist2_id uuid;
  supervisor_id uuid;
  client1_id uuid;
  case1_id uuid;
  case2_id uuid;
BEGIN
  -- Get existing users or create sample ones
  SELECT id INTO therapist1_id FROM profiles WHERE role = 'therapist' LIMIT 1;
  SELECT id INTO supervisor_id FROM profiles WHERE role = 'supervisor' LIMIT 1;
  SELECT id INTO client1_id FROM profiles WHERE role = 'client' LIMIT 1;

  -- Create sample archived cases if we have users
  IF therapist1_id IS NOT NULL AND client1_id IS NOT NULL THEN
    -- Create an archived case
    INSERT INTO cases (
      id, client_id, therapist_id, case_number, status, 
      archived_at, archive_reason, last_session_at,
      diagnosis_codes, formulation, treatment_plan
    ) VALUES (
      gen_random_uuid(), client1_id, therapist1_id, 'CASE-2024-001', 'archived',
      now() - interval '30 days', 'Treatment goals achieved',
      now() - interval '35 days',
      ARRAY['F33.1', 'F41.1'], 
      'Client presented with moderate depression and anxiety. CBT approach was effective.',
      '{"goals": [{"title": "Reduce anxiety symptoms", "status": "completed"}], "interventions": ["CBT", "Mindfulness"]}'::jsonb
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO case1_id;

    -- Create a closed case
    INSERT INTO cases (
      id, client_id, therapist_id, case_number, status,
      closed_at, last_session_at,
      diagnosis_codes, formulation
    ) VALUES (
      gen_random_uuid(), client1_id, therapist1_id, 'CASE-2024-002', 'closed',
      now() - interval '60 days', now() - interval '65 days',
      ARRAY['F43.1'],
      'Brief intervention for adjustment disorder following life transition.'
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO case2_id;

    -- Create sample supervision request
    IF case1_id IS NOT NULL THEN
      INSERT INTO supervision_requests (
        case_id, requester_id, supervisor_id, title, notes, status
      ) VALUES (
        case1_id, therapist1_id, supervisor_id,
        'Complex trauma case - seeking guidance',
        'Client has complex trauma history. Would appreciate supervision on treatment approach.',
        'pending'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Create sample referral
    IF case2_id IS NOT NULL THEN
      SELECT id INTO therapist2_id FROM profiles WHERE role = 'therapist' AND id != therapist1_id LIMIT 1;
      IF therapist2_id IS NOT NULL THEN
        INSERT INTO case_referrals (
          case_id, from_therapist_id, to_therapist_id, reason, status
        ) VALUES (
          case2_id, therapist1_id, therapist2_id,
          'Client moving to different geographic area',
          'pending'
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;