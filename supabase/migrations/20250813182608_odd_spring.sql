/*
  # Complete Demo Data Setup with Fixed UUIDs

  1. Security Updates
    - Simplified RLS policies to prevent recursion
    - Direct access control based on user roles

  2. Demo Data
    - Demo therapist account (Dr. Sarah Johnson)
    - Demo client accounts with realistic profiles
    - Sample assessments, appointments, and progress data
    - Assessment library with PHQ-9 and GAD-7
    - Therapeutic exercises and progress tracking

  3. Assessment Library
    - PHQ-9 and GAD-7 with proper UUID identifiers
    - Complete question sets and scoring methods
    - Clinical interpretation guidelines
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;
DROP POLICY IF EXISTS "relations_therapist_only" ON therapist_client_relations;
DROP POLICY IF EXISTS "client_profiles_therapist_access" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_client_read_own" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_therapist_full_access" ON client_profiles;

-- Create minimal RLS policies
CREATE POLICY "profiles_access" ON profiles FOR ALL TO authenticated USING (auth.uid() = id);

CREATE POLICY "therapist_client_relations_access" ON therapist_client_relations 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "client_profiles_access" ON client_profiles 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "cases_access" ON cases 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "treatment_plans_access" ON treatment_plans 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "therapy_goals_access" ON therapy_goals 
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM treatment_plans tp 
    WHERE tp.id = therapy_goals.treatment_plan_id 
    AND (tp.therapist_id = auth.uid() OR tp.client_id = auth.uid())
  )
);

CREATE POLICY "appointments_access" ON appointments 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "session_notes_access" ON session_notes 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "psychometric_forms_access" ON psychometric_forms 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "therapeutic_exercises_access" ON therapeutic_exercises 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "form_assignments_access" ON form_assignments 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "progress_tracking_access" ON progress_tracking 
FOR ALL TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "assessment_reports_access" ON assessment_reports 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "cbt_worksheets_access" ON cbt_worksheets 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "communication_logs_access" ON communication_logs 
FOR ALL TO authenticated USING (auth.uid() = therapist_id OR auth.uid() = client_id);

CREATE POLICY "practice_analytics_access" ON practice_analytics 
FOR ALL TO authenticated USING (auth.uid() = therapist_id);

CREATE POLICY "audit_logs_access" ON audit_logs 
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Assessment library is public for all authenticated users
CREATE POLICY "assessment_library_read" ON assessment_library 
FOR SELECT TO authenticated USING (is_active = true);

-- Custom forms access
CREATE POLICY "custom_forms_access" ON custom_forms 
FOR ALL TO authenticated USING (auth.uid() = therapist_id);

-- Worksheets access
CREATE POLICY "worksheets_access" ON worksheets 
FOR ALL TO authenticated USING (auth.uid() = therapist_id);

CREATE POLICY "worksheet_assignments_access" ON worksheet_assignments 
FOR ALL TO authenticated USING (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM worksheets w WHERE w.id = worksheet_assignments.worksheet_id AND w.therapist_id = auth.uid())
);

-- Gamified apps access
CREATE POLICY "gamified_apps_read" ON gamified_apps 
FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "app_sessions_access" ON app_sessions 
FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "app_progress_access" ON app_progress 
FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "app_analytics_access" ON app_analytics 
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Referrals access
CREATE POLICY "referrals_access" ON referrals 
FOR ALL TO authenticated USING (
  auth.uid() = referring_therapist_id OR 
  auth.uid() = receiving_therapist_id OR 
  auth.uid() = client_id
);

-- Resource library access
CREATE POLICY "resource_library_read" ON resource_library 
FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "resource_library_manage" ON resource_library 
FOR ALL TO authenticated USING (auth.uid() = created_by);

-- Case milestones access
CREATE POLICY "case_milestones_access" ON case_milestones 
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM cases c 
    WHERE c.id = case_milestones.case_id 
    AND (c.therapist_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- In-between sessions access
CREATE POLICY "in_between_sessions_access" ON in_between_sessions 
FOR ALL TO authenticated USING (
  auth.uid() = client_id OR 
  EXISTS (
    SELECT 1 FROM cases c 
    WHERE c.id = in_between_sessions.case_id 
    AND c.therapist_id = auth.uid()
  )
);

-- Diagnostic codes are public
CREATE POLICY "diagnostic_codes_read" ON diagnostic_codes 
FOR SELECT TO authenticated USING (is_active = true);

-- Case formulations access
CREATE POLICY "case_formulations_access" ON case_formulations 
FOR ALL TO authenticated USING (auth.uid() = therapist_id);

-- Document uploads access
CREATE POLICY "document_uploads_access" ON document_uploads 
FOR ALL TO authenticated USING (auth.uid() = therapist_id);

-- Create demo therapist account
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  '00000000-0000-0000-0000-000000000000',
  'fedgee911@gmail.com',
  '$2a$10$rOKnKvQjQQjQjQjQjQjQjOKnKvQjQQjQjQjQjQjQjOKnKvQjQQjQjQ',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Dr. Sarah", "last_name": "Johnson", "role": "therapist"}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Create demo therapist profile
INSERT INTO profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  whatsapp_number,
  professional_details,
  verification_status,
  created_at
) VALUES (
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'therapist',
  'Dr. Sarah',
  'Johnson',
  'fedgee911@gmail.com',
  '+1 (555) 123-4567',
  '{
    "specializations": ["Anxiety Disorders", "Depression", "Trauma & PTSD", "CBT", "Mindfulness-Based Therapy"],
    "languages": ["English", "Spanish", "French"],
    "qualifications": "Ph.D. in Clinical Psychology\nLicensed Clinical Psychologist (CA #PSY12345)\nCertified CBT Therapist\nEMDR Certified Therapist",
    "bio": "Dr. Sarah Johnson is a licensed clinical psychologist with over 15 years of experience helping individuals overcome anxiety, depression, and trauma. She specializes in evidence-based treatments including Cognitive Behavioral Therapy (CBT) and EMDR.\n\nDr. Johnson believes in creating a warm, supportive environment where clients feel safe to explore their thoughts and feelings. Her approach combines compassion with practical, research-backed techniques to help clients develop lasting coping skills and achieve their therapeutic goals.\n\nShe has extensive experience working with adults facing life transitions, relationship challenges, and mental health concerns. Dr. Johnson is fluent in English, Spanish, and French, allowing her to serve diverse communities.",
    "practice_locations": [
      {"address": "123 Therapy Lane, Los Angeles, CA 90210", "isPrimary": true},
      {"address": "456 Wellness Blvd, Beverly Hills, CA 90212", "isPrimary": false}
    ],
    "years_experience": 15
  }',
  'verified',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  professional_details = EXCLUDED.professional_details,
  verification_status = EXCLUDED.verification_status,
  whatsapp_number = EXCLUDED.whatsapp_number,
  updated_at = NOW();

-- Create demo clients
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'john.smith@example.com',
  '$2a$10$rOKnKvQjQQjQjQjQjQjQjOKnKvQjQQjQjQjQjQjQjOKnKvQjQQjQjQ',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "John", "last_name": "Smith", "role": "client"}',
  false,
  'authenticated',
  'authenticated'
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'emily.davis@example.com',
  '$2a$10$rOKnKvQjQQjQjQjQjQjQjQjQjOKnKvQjQQjQjQjQjOKnKvQjQQjQjQ',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Emily", "last_name": "Davis", "role": "client"}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create demo client profiles
INSERT INTO profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  patient_code,
  whatsapp_number,
  created_by_therapist,
  password_set,
  created_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'client',
  'John',
  'Smith',
  'john.smith@example.com',
  'PT123455',
  '+1 (555) 234-5678',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  true,
  NOW() - INTERVAL '30 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  'client',
  'Emily',
  'Davis',
  'emily.davis@example.com',
  'PT789012',
  '+1 (555) 345-6789',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  true,
  NOW() - INTERVAL '45 days'
) ON CONFLICT (id) DO UPDATE SET
  created_by_therapist = EXCLUDED.created_by_therapist,
  patient_code = EXCLUDED.patient_code,
  whatsapp_number = EXCLUDED.whatsapp_number;

-- Create therapist-client relationships
INSERT INTO therapist_client_relations (therapist_id, client_id, created_at) VALUES 
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '45 days')
ON CONFLICT (therapist_id, client_id) DO NOTHING;

-- Create detailed client profiles
INSERT INTO client_profiles (
  client_id,
  therapist_id,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relationship,
  medical_history,
  current_medications,
  presenting_concerns,
  therapy_history,
  risk_level,
  notes,
  created_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'Jane Smith',
  '+1 (555) 987-6543',
  'spouse',
  'No significant medical history. Occasional headaches.',
  'None currently',
  'Experiencing increased anxiety and worry about work performance. Difficulty sleeping and concentrating. Reports feeling overwhelmed by daily responsibilities.',
  'No previous therapy experience',
  'moderate',
  'Client shows good insight and motivation for change. Responds well to CBT techniques. Progress noted in anxiety management.',
  NOW() - INTERVAL '30 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'Michael Davis',
  '+1 (555) 876-5432',
  'sibling',
  'History of depression in family. No current medical issues.',
  'Sertraline 50mg daily',
  'Persistent low mood, loss of interest in activities, fatigue. Recent life changes including job loss have exacerbated symptoms.',
  'Previous therapy 2 years ago for grief counseling',
  'high',
  'Client has history of depression. Currently experiencing major depressive episode. Good therapeutic alliance established.',
  NOW() - INTERVAL '45 days'
) ON CONFLICT (client_id, therapist_id) DO UPDATE SET
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone,
  emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
  medical_history = EXCLUDED.medical_history,
  current_medications = EXCLUDED.current_medications,
  presenting_concerns = EXCLUDED.presenting_concerns,
  therapy_history = EXCLUDED.therapy_history,
  risk_level = EXCLUDED.risk_level,
  notes = EXCLUDED.notes;

-- Create cases
INSERT INTO cases (
  id,
  client_id,
  therapist_id,
  case_number,
  status,
  opened_at,
  created_at
) VALUES 
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'CASE-2025-001',
  'active',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),
(
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'CASE-2025-002',
  'active',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '45 days'
) ON CONFLICT (case_number) DO NOTHING;

-- Create treatment plans
INSERT INTO treatment_plans (
  id,
  client_id,
  therapist_id,
  title,
  case_formulation,
  treatment_approach,
  estimated_duration,
  status,
  created_at
) VALUES 
(
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'Anxiety Management Treatment Plan',
  'Client presents with generalized anxiety disorder characterized by excessive worry about work performance and daily responsibilities. Symptoms include sleep disturbance, concentration difficulties, and physical tension. CBT approach focusing on cognitive restructuring and anxiety management techniques.',
  'Cognitive Behavioral Therapy (CBT) with mindfulness components',
  '12-16 weeks',
  'active',
  NOW() - INTERVAL '25 days'
),
(
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  'Depression Recovery Plan',
  'Client experiencing major depressive episode following job loss. Symptoms include persistent low mood, anhedonia, fatigue, and hopelessness. Treatment will focus on behavioral activation, cognitive restructuring, and coping skills development.',
  'CBT with Behavioral Activation',
  '16-20 weeks',
  'active',
  NOW() - INTERVAL '40 days'
) ON CONFLICT DO NOTHING;

-- Create therapy goals
INSERT INTO therapy_goals (
  treatment_plan_id,
  goal_text,
  target_date,
  progress_percentage,
  status,
  notes,
  created_at
) VALUES 
(
  '55555555-5555-5555-5555-555555555555',
  'Reduce anxiety symptoms by 50% as measured by GAD-7',
  CURRENT_DATE + INTERVAL '8 weeks',
  60,
  'active',
  'Good progress with breathing exercises and thought challenging',
  NOW() - INTERVAL '25 days'
),
(
  '55555555-5555-5555-5555-555555555555',
  'Improve sleep quality and duration',
  CURRENT_DATE + INTERVAL '6 weeks',
  40,
  'active',
  'Sleep hygiene education provided, tracking sleep patterns',
  NOW() - INTERVAL '20 days'
),
(
  '66666666-6666-6666-6666-666666666666',
  'Increase daily activity level and engagement',
  CURRENT_DATE + INTERVAL '10 weeks',
  30,
  'active',
  'Behavioral activation plan in progress, gradual activity scheduling',
  NOW() - INTERVAL '35 days'
),
(
  '66666666-6666-6666-6666-666666666666',
  'Develop effective coping strategies for mood episodes',
  CURRENT_DATE + INTERVAL '12 weeks',
  25,
  'active',
  'Learning cognitive restructuring techniques',
  NOW() - INTERVAL '30 days'
);

-- Populate assessment library with complete assessments (using proper UUIDs)
INSERT INTO assessment_library (
  id,
  name,
  abbreviation,
  category,
  description,
  questions,
  scoring_method,
  interpretation_guide,
  is_active
) VALUES 
(
  'a1111111-1111-1111-1111-111111111111',
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression',
  'Measures severity of depression symptoms over the past two weeks',
  '[
    {"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_2", "text": "Feeling down, depressed, or hopeless", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_4", "text": "Feeling tired or having little energy", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_5", "text": "Poor appetite or overeating", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_6", "text": "Feeling bad about yourself or that you are a failure", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_7", "text": "Trouble concentrating on things", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_8", "text": "Moving or speaking slowly, or being fidgety/restless", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "phq9_9", "text": "Thoughts that you would be better off dead or hurting yourself", "type": "scale", "scale_min": 0, "scale_max": 3}
  ]',
  '{
    "method": "sum",
    "max_score": 27,
    "interpretation_ranges": [
      {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms"},
      {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms"},
      {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms"},
      {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms"},
      {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms"}
    ]
  }',
  '{
    "clinical_cutoff": 10,
    "severity_levels": {
      "minimal": "0-4: No treatment necessary",
      "mild": "5-9: Watchful waiting, repeat PHQ-9 at followup",
      "moderate": "10-14: Treatment plan, consider counseling, followup in 6 weeks",
      "moderately_severe": "15-19: Active treatment with antidepressants or psychotherapy",
      "severe": "20-27: Immediate initiation of pharmacotherapy and psychotherapy"
    }
  }',
  true
),
(
  'a2222222-2222-2222-2222-222222222222',
  'Generalized Anxiety Disorder-7',
  'GAD-7',
  'anxiety',
  'Measures severity of generalized anxiety disorder symptoms',
  '[
    {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3},
    {"id": "gad7_7", "text": "Feeling afraid as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3}
  ]',
  '{
    "method": "sum",
    "max_score": 21,
    "interpretation_ranges": [
      {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms"},
      {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms"},
      {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms"},
      {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms"}
    ]
  }',
  '{
    "clinical_cutoff": 10,
    "severity_levels": {
      "minimal": "0-4: Monitor, no treatment indicated",
      "mild": "5-9: Possible anxiety disorder, consider treatment",
      "moderate": "10-14: Probable anxiety disorder, active treatment recommended",
      "severe": "15-21: Severe anxiety, immediate treatment indicated"
    }
  }',
  true
) ON CONFLICT (id) DO NOTHING;

-- Create sample appointments
INSERT INTO appointments (
  therapist_id,
  client_id,
  appointment_date,
  duration_minutes,
  appointment_type,
  status,
  notes,
  created_at
) VALUES 
-- Past appointments
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days', 50, 'individual', 'completed', 'Good session, worked on breathing techniques', NOW() - INTERVAL '8 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 days', 50, 'individual', 'completed', 'Initial assessment and goal setting', NOW() - INTERVAL '15 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '5 days', 50, 'individual', 'completed', 'Behavioral activation planning', NOW() - INTERVAL '6 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '12 days', 50, 'individual', 'completed', 'Depression assessment and treatment planning', NOW() - INTERVAL '13 days'),
-- Future appointments
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', NOW() + INTERVAL '3 days', 50, 'individual', 'scheduled', NULL, NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', NOW() + INTERVAL '5 days', 50, 'individual', 'scheduled', NULL, NOW());

-- Create form assignments (using proper UUID references)
INSERT INTO form_assignments (
  therapist_id,
  client_id,
  form_type,
  form_id,
  title,
  instructions,
  due_date,
  reminder_frequency,
  status,
  assigned_at
) VALUES 
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'psychometric', 'a2222222-2222-2222-2222-222222222222', 'GAD-7 Anxiety Assessment', 'Please complete this assessment to help track your anxiety levels', CURRENT_DATE + INTERVAL '3 days', 'daily', 'assigned', NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'psychometric', 'a1111111-1111-1111-1111-111111111111', 'PHQ-9 Depression Screening', 'Please complete this depression screening as part of your ongoing treatment', CURRENT_DATE + INTERVAL '2 days', 'weekly', 'assigned', NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'worksheet', NULL, 'Daily Thought Record', 'Practice identifying and challenging negative thoughts using this worksheet', CURRENT_DATE + INTERVAL '7 days', 'none', 'assigned', NOW() - INTERVAL '2 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'exercise', NULL, 'Mood Tracking Exercise', 'Track your daily mood and identify patterns', CURRENT_DATE + INTERVAL '14 days', 'daily', 'in_progress', NOW() - INTERVAL '5 days');

-- Create psychometric forms
INSERT INTO psychometric_forms (
  id,
  therapist_id,
  client_id,
  form_type,
  title,
  questions,
  responses,
  score,
  status,
  created_at,
  completed_at
) VALUES 
-- Completed assessments for progress tracking
(
  '77777777-7777-7777-7777-777777777777',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  '11111111-1111-1111-1111-111111111111',
  'gad7',
  'GAD-7 Anxiety Assessment - Week 1',
  '[]',
  '{"gad7_1": 3, "gad7_2": 2, "gad7_3": 3, "gad7_4": 2, "gad7_5": 1, "gad7_6": 2, "gad7_7": 2}',
  15,
  'completed',
  NOW() - INTERVAL '21 days',
  NOW() - INTERVAL '21 days'
),
(
  '88888888-8888-8888-8888-888888888888',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  '11111111-1111-1111-1111-111111111111',
  'gad7',
  'GAD-7 Anxiety Assessment - Week 3',
  '[]',
  '{"gad7_1": 2, "gad7_2": 2, "gad7_3": 2, "gad7_4": 1, "gad7_5": 1, "gad7_6": 2, "gad7_7": 2}',
  12,
  'completed',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days'
),
(
  '99999999-9999-9999-9999-999999999999',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  '22222222-2222-2222-2222-222222222222',
  'phq9',
  'PHQ-9 Depression Screening - Baseline',
  '[]',
  '{"phq9_1": 2, "phq9_2": 3, "phq9_3": 2, "phq9_4": 3, "phq9_5": 1, "phq9_6": 2, "phq9_7": 2, "phq9_8": 1, "phq9_9": 0}',
  16,
  'completed',
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '35 days'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
  '22222222-2222-2222-2222-222222222222',
  'phq9',
  'PHQ-9 Depression Screening - Week 4',
  '[]',
  '{"phq9_1": 1, "phq9_2": 2, "phq9_3": 1, "phq9_4": 2, "phq9_5": 1, "phq9_6": 1, "phq9_7": 1, "phq9_8": 0, "phq9_9": 0}',
  9,
  'completed',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days'
);

-- Create progress tracking data
INSERT INTO progress_tracking (
  client_id,
  metric_type,
  value,
  source_type,
  source_id,
  recorded_at
) VALUES 
-- John Smith (anxiety progress)
('11111111-1111-1111-1111-111111111111', 'gad7_total', 15, 'psychometric', '77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '21 days'),
('11111111-1111-1111-1111-111111111111', 'gad7_total', 12, 'psychometric', '88888888-8888-8888-8888-888888888888', NOW() - INTERVAL '14 days'),
('11111111-1111-1111-1111-111111111111', 'mood_rating', 6, 'manual', NULL, NOW() - INTERVAL '7 days'),
('11111111-1111-1111-1111-111111111111', 'mood_rating', 7, 'manual', NULL, NOW() - INTERVAL '3 days'),
('11111111-1111-1111-1111-111111111111', 'mood_rating', 8, 'manual', NULL, NOW() - INTERVAL '1 day'),
-- Emily Davis (depression progress)
('22222222-2222-2222-2222-222222222222', 'phq9_total', 16, 'psychometric', '99999999-9999-9999-9999-999999999999', NOW() - INTERVAL '35 days'),
('22222222-2222-2222-2222-222222222222', 'phq9_total', 9, 'psychometric', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '14 days'),
('22222222-2222-2222-2222-222222222222', 'mood_rating', 4, 'manual', NULL, NOW() - INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222222', 'mood_rating', 5, 'manual', NULL, NOW() - INTERVAL '5 days'),
('22222222-2222-2222-2222-222222222222', 'mood_rating', 6, 'manual', NULL, NOW() - INTERVAL '2 days');

-- Create CBT worksheets
INSERT INTO cbt_worksheets (
  therapist_id,
  client_id,
  type,
  title,
  content,
  status,
  created_at
) VALUES 
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'thought_record', 'Daily Thought Record - Week 1', '{"situation": "Work presentation", "automatic_thought": "I will mess up and everyone will think I am incompetent", "emotion": "anxious", "intensity": 8, "evidence_for": "I have made mistakes before", "evidence_against": "I have given successful presentations in the past", "balanced_thought": "I am prepared and even if I make a small mistake, it does not define my competence", "new_emotion": "nervous but confident", "new_intensity": 4}', 'completed', NOW() - INTERVAL '10 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'thought_record', 'Thought Challenging Exercise', '{"situation": "Job interview rejection", "automatic_thought": "I will never find a good job", "emotion": "hopeless", "intensity": 9}', 'in_progress', NOW() - INTERVAL '3 days');

-- Create therapeutic exercises
INSERT INTO therapeutic_exercises (
  therapist_id,
  client_id,
  exercise_type,
  title,
  description,
  game_config,
  progress,
  status,
  created_at,
  last_played_at
) VALUES 
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'breathing', 'Deep Breathing Exercise', 'Practice 4-7-8 breathing technique for anxiety management', '{"cycles_target": 10, "inhale_duration": 4, "hold_duration": 7, "exhale_duration": 8}', '{"cycles_completed": 25, "total_sessions": 8, "best_session": 15}', 'in_progress', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'mindfulness', 'Mindfulness Meditation', 'Guided mindfulness practice for mood regulation', '{"session_duration": 10, "guidance_level": "beginner"}', '{"total_minutes": 120, "sessions_completed": 12, "streak_days": 5}', 'in_progress', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'cognitive_restructuring', 'Thought Detective Game', 'Interactive scenarios to practice identifying helpful vs unhelpful thoughts', '{"difficulty": "intermediate", "scenarios_completed": 8}', '{"score": 85, "accuracy": 92, "scenarios_mastered": 8}', 'completed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days');

-- Create assessment reports
INSERT INTO assessment_reports (
  client_id,
  therapist_id,
  report_type,
  title,
  content,
  generated_by,
  report_date,
  created_at
) VALUES 
('11111111-1111-1111-1111-111111111111', 'f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'psychometric', 'GAD-7 Progress Report', '{"assessment": "GAD-7", "baseline_score": 15, "current_score": 12, "improvement": 20, "interpretation": "Moderate anxiety with 20% improvement", "recommendations": "Continue CBT techniques, add mindfulness practice"}', 'ai', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('22222222-2222-2222-2222-222222222222', 'f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'psychometric', 'PHQ-9 Progress Report', '{"assessment": "PHQ-9", "baseline_score": 16, "current_score": 9, "improvement": 44, "interpretation": "Significant improvement in depression symptoms", "recommendations": "Continue current treatment approach, consider reducing session frequency"}', 'ai', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

-- Create practice analytics
INSERT INTO practice_analytics (
  therapist_id,
  metric_name,
  metric_value,
  metric_date,
  metadata,
  created_at
) VALUES 
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'client_satisfaction', 4.8, CURRENT_DATE, '{"survey_responses": 15, "response_rate": 75}', NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'session_completion_rate', 95, CURRENT_DATE, '{"total_scheduled": 20, "completed": 19, "no_shows": 1}', NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'assessment_completion_rate', 87, CURRENT_DATE, '{"assigned": 15, "completed": 13, "pending": 2}', NOW()),
('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'avg_improvement_score', 32, CURRENT_DATE, '{"measurement": "percentage", "timeframe": "monthly"}', NOW());

-- Populate gamified apps
INSERT INTO gamified_apps (
  id,
  app_type,
  name,
  description,
  version,
  app_config,
  game_mechanics,
  difficulty_level,
  estimated_duration,
  is_active,
  evidence_based,
  tags,
  created_at
) VALUES 
(
  'b1111111-1111-1111-1111-111111111111',
  'exercise',
  'Breathing Buddy',
  'Interactive breathing exercises with visual guidance and progress tracking',
  '1.2.0',
  '{"breathing_patterns": ["4-7-8", "box_breathing", "triangle"], "visual_guides": true, "progress_tracking": true}',
  '{"points_per_cycle": 10, "achievements": ["first_session", "week_streak", "master_breather"], "levels": 5}',
  'beginner',
  5,
  true,
  true,
  '["breathing", "anxiety", "relaxation", "mindfulness"]',
  NOW()
),
(
  'b2222222-2222-2222-2222-222222222222',
  'exercise',
  'Mindful Moments',
  'Guided mindfulness and meditation exercises for emotional regulation',
  '1.1.0',
  '{"session_lengths": [5, 10, 15, 20], "guidance_types": ["body_scan", "breath_focus", "loving_kindness"], "background_sounds": true}',
  '{"mindfulness_points": 20, "streak_bonuses": true, "meditation_badges": ["beginner", "consistent", "zen_master"]}',
  'beginner',
  10,
  true,
  true,
  '["mindfulness", "meditation", "emotional_regulation", "stress"]',
  NOW()
),
(
  'b3333333-3333-3333-3333-333333333333',
  'assessment',
  'Thought Detective',
  'Interactive cognitive restructuring scenarios to practice identifying and challenging unhelpful thoughts',
  '1.0.0',
  '{"scenario_types": ["work_stress", "social_anxiety", "self_criticism"], "difficulty_progression": true, "feedback_system": true}',
  '{"detective_points": 15, "accuracy_bonuses": true, "scenario_badges": ["rookie", "detective", "master_investigator"]}',
  'intermediate',
  15,
  true,
  true,
  '["cognitive_restructuring", "CBT", "thought_challenging", "anxiety"]',
  NOW()
);

-- Create app sessions for demo data
INSERT INTO app_sessions (
  app_id,
  user_id,
  session_type,
  started_at,
  completed_at,
  duration_seconds,
  score,
  max_score,
  responses,
  game_data,
  completion_status
) VALUES 
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'practice', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', 300, 85, 100, '{"cycles_completed": 8, "average_pace": "good"}', '{"achievements_unlocked": ["first_session"], "level_reached": 2}', 'completed'),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'practice', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', 600, 90, 100, '{"session_type": "body_scan", "interruptions": 1}', '{"mindfulness_score": 90, "consistency_bonus": 10}', 'completed'),
('b3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'assessment', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '12 minutes', 720, 92, 100, '{"scenarios_completed": 5, "accuracy": 92}', '{"detective_level": "intermediate", "badges_earned": ["rookie", "detective"]}', 'completed');

-- Create app progress tracking
INSERT INTO app_progress (
  app_id,
  user_id,
  total_sessions,
  total_time_minutes,
  best_score,
  average_score,
  current_level,
  experience_points,
  achievements,
  streak_days,
  last_played_at,
  mastery_level
) VALUES 
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 8, 45, 95, 87, 3, 680, '["first_session", "week_streak"]', 5, NOW() - INTERVAL '1 day', 'beginner'),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 12, 120, 95, 88, 2, 1200, '["beginner", "consistent"]', 7, NOW() - INTERVAL '1 day', 'intermediate'),
('b3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 3, 36, 92, 89, 2, 270, '["rookie", "detective"]', 0, NOW() - INTERVAL '5 days', 'beginner');

-- Update database statistics for better query performance
ANALYZE;