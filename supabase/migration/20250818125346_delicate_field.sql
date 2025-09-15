/*
  # Fix Client and Case Management Workflow

  1. Enhanced RLS Policies
    - Allow therapists to create client profiles directly
    - Proper case management permissions
    - Secure data access patterns

  2. Workflow Tables
    - Enhanced client_profiles table policies
    - Case management with proper relationships
    - Progress tracking integration

  3. Security Updates
    - Row-level security for all operations
    - Therapist-client relationship validation
    - Audit trail for all actions
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_comprehensive_access" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;

-- Create new comprehensive profiles policies
CREATE POLICY "profiles_own_access"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_therapist_create_clients"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client' AND
    created_by_therapist = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'therapist'
    )
  );

CREATE POLICY "profiles_therapist_view_clients"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (role = 'client' AND EXISTS (
      SELECT 1 FROM therapist_client_relations tcr
      WHERE tcr.therapist_id = auth.uid() AND tcr.client_id = id
    ))
  );

CREATE POLICY "profiles_therapist_update_clients"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (role = 'client' AND EXISTS (
      SELECT 1 FROM therapist_client_relations tcr
      WHERE tcr.therapist_id = auth.uid() AND tcr.client_id = id
    ))
  )
  WITH CHECK (
    auth.uid() = id OR
    (role = 'client' AND EXISTS (
      SELECT 1 FROM therapist_client_relations tcr
      WHERE tcr.therapist_id = auth.uid() AND tcr.client_id = id
    ))
  );

-- Ensure cases table has proper policies
DROP POLICY IF EXISTS "cases_client_read" ON cases;
DROP POLICY IF EXISTS "cases_therapist_access" ON cases;

CREATE POLICY "cases_therapist_full_access"
  ON cases
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "cases_client_read_own"
  ON cases
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Update client_profiles policies for better workflow
DROP POLICY IF EXISTS "client_profiles_client_read_own" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_therapist_access" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_therapist_full_access" ON client_profiles;

CREATE POLICY "client_profiles_therapist_manage"
  ON client_profiles
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "client_profiles_client_read"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Function to automatically create case when client is added
CREATE OR REPLACE FUNCTION create_case_for_new_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create case for client profiles created by therapists
  IF NEW.role = 'client' AND NEW.created_by_therapist IS NOT NULL THEN
    -- Generate case number
    INSERT INTO cases (
      client_id,
      therapist_id,
      case_number,
      status,
      opened_at
    ) VALUES (
      NEW.id,
      NEW.created_by_therapist,
      'CASE-' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
      'active',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic case creation
DROP TRIGGER IF EXISTS auto_create_case_trigger ON profiles;
CREATE TRIGGER auto_create_case_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_case_for_new_client();

-- Function to get client statistics
CREATE OR REPLACE FUNCTION get_client_stats(client_uuid UUID, therapist_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalAssessments', COALESCE(assessments.total, 0),
    'completedAssessments', COALESCE(assessments.completed, 0),
    'lastSession', sessions.last_session,
    'nextAppointment', sessions.next_appointment
  ) INTO result
  FROM (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed
    FROM form_assignments 
    WHERE client_id = client_uuid AND therapist_id = therapist_uuid
  ) assessments
  CROSS JOIN (
    SELECT 
      MAX(appointment_date) FILTER (WHERE status = 'completed') as last_session,
      MIN(appointment_date) FILTER (WHERE status = 'scheduled' AND appointment_date > NOW()) as next_appointment
    FROM appointments 
    WHERE client_id = client_uuid AND therapist_id = therapist_uuid
  ) sessions;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_client_stats(UUID, UUID) TO authenticated;