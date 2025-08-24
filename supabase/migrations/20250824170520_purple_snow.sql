/*
  # Fix Assessment System and Add Demo Data

  1. Assessment System Tables
    - Create assessment_templates table with proper structure
    - Create assessment_instances table for assignments
    - Create assessment_responses table for client answers
    - Create assessment_scores table for calculated results

  2. Demo Data
    - Add sample assessment templates (PHQ-9, GAD-7, etc.)
    - Create demo therapist and client accounts
    - Add sample case data and assignments

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for therapists and clients
*/

-- Create assessment_templates table
CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['anxiety'::text, 'depression'::text, 'trauma'::text, 'stress'::text, 'wellbeing'::text, 'personality'::text, 'substance'::text, 'eating'::text, 'sleep'::text, 'general'::text])),
  description text,
  version text DEFAULT '1.0',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_cutoffs jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions text,
  estimated_duration_minutes integer DEFAULT 10,
  evidence_level text DEFAULT 'research_based' CHECK (evidence_level = ANY (ARRAY['research_based'::text, 'clinical_consensus'::text, 'expert_opinion'::text])),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_instances table
CREATE TABLE IF NOT EXISTS assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  status text DEFAULT 'assigned' CHECK (status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'completed'::text, 'expired'::text, 'cancelled'::text])),
  assigned_at timestamptz DEFAULT now(),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none' CHECK (reminder_frequency = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'before_due'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  response_value jsonb NOT NULL,
  response_text text,
  response_timestamp timestamptz DEFAULT now(),
  is_final boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, question_id)
);

-- Create assessment_scores table
CREATE TABLE IF NOT EXISTS assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid UNIQUE NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
  raw_score numeric NOT NULL,
  scaled_score numeric,
  percentile numeric,
  t_score numeric,
  z_score numeric,
  interpretation_category text,
  interpretation_description text,
  clinical_significance text,
  severity_level text,
  recommendations text,
  therapist_notes text,
  auto_generated boolean DEFAULT true,
  calculated_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_interpretation_rules table
CREATE TABLE IF NOT EXISTS assessment_interpretation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  condition_logic jsonb NOT NULL,
  interpretation_text text NOT NULL,
  severity_level text,
  clinical_significance text,
  recommendations text,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_interpretation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_templates
CREATE POLICY "assessment_templates_read_all"
  ON assessment_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "assessment_templates_therapist_manage"
  ON assessment_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'therapist'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'therapist'
    )
  );

-- RLS Policies for assessment_instances
CREATE POLICY "assessment_instances_therapist_manage"
  ON assessment_instances
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "assessment_instances_client_read"
  ON assessment_instances
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "assessment_instances_client_update_status"
  ON assessment_instances
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid() 
    AND status = ANY (ARRAY['in_progress'::text, 'completed'::text])
  );

-- RLS Policies for assessment_responses
CREATE POLICY "assessment_responses_client_manage"
  ON assessment_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_responses.instance_id
      AND assessment_instances.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_responses.instance_id
      AND assessment_instances.client_id = auth.uid()
    )
  );

CREATE POLICY "assessment_responses_therapist_read"
  ON assessment_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_responses.instance_id
      AND assessment_instances.therapist_id = auth.uid()
    )
  );

-- RLS Policies for assessment_scores
CREATE POLICY "assessment_scores_therapist_manage"
  ON assessment_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_scores.instance_id
      AND assessment_instances.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_scores.instance_id
      AND assessment_instances.therapist_id = auth.uid()
    )
  );

CREATE POLICY "assessment_scores_client_read"
  ON assessment_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_instances
      WHERE assessment_instances.id = assessment_scores.instance_id
      AND assessment_instances.client_id = auth.uid()
    )
  );

-- RLS Policies for assessment_interpretation_rules
CREATE POLICY "assessment_interpretation_rules_read_all"
  ON assessment_interpretation_rules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_category ON assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON assessment_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance ON assessment_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_instance ON assessment_scores(instance_id);

-- Create triggers for updated_at
CREATE TRIGGER update_assessment_templates_updated_at
  BEFORE UPDATE ON assessment_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_instances_updated_at
  BEFORE UPDATE ON assessment_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_scores_updated_at
  BEFORE UPDATE ON assessment_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate scores trigger
CREATE OR REPLACE FUNCTION auto_calculate_assessment_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if assessment is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- This will be handled by the frontend scoring engine
    -- Placeholder for future server-side scoring
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_score_trigger
  AFTER UPDATE ON assessment_instances
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_assessment_score();

-- Insert sample assessment templates
INSERT INTO assessment_templates (name, abbreviation, category, description, questions, scoring_config, interpretation_rules, clinical_cutoffs, instructions, estimated_duration_minutes, evidence_level) VALUES
(
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression',
  'Measures severity of depression symptoms over the past two weeks',
  '[
    {"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_2", "text": "Feeling down, depressed, or hopeless", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_4", "text": "Feeling tired or having little energy", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_5", "text": "Poor appetite or overeating", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_6", "text": "Feeling bad about yourself or that you are a failure or have let yourself or your family down", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_7", "text": "Trouble concentrating on things, such as reading the newspaper or watching television", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_8", "text": "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "phq9_9", "text": "Thoughts that you would be better off dead, or of hurting yourself in some way", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 27,
    "min_score": 0,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling or therapy"},
      {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended, consider medication evaluation"},
      {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms", "severity": "moderately_severe", "clinical_significance": "significant", "recommendations": "Therapy and medication evaluation recommended"},
      {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment with therapy and medication"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 10,
    "suicide_risk_item": "phq9_9",
    "suicide_risk_threshold": 1
  }'::jsonb,
  'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
  5,
  'research_based'
),
(
  'Generalized Anxiety Disorder-7',
  'GAD-7',
  'anxiety',
  'Measures severity of generalized anxiety disorder symptoms',
  '[
    {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
    {"id": "gad7_7", "text": "Feeling afraid, as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 21,
    "min_score": 0,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider relaxation techniques or counseling"},
      {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended"},
      {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment with therapy and possible medication"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 10
  }'::jsonb,
  'Over the last 2 weeks, how often have you been bothered by the following problems?',
  3,
  'research_based'
),
(
  'Beck Depression Inventory-II',
  'BDI-II',
  'depression',
  'Measures severity of depression symptoms in adolescents and adults',
  '[
    {"id": "bdi_1", "text": "Sadness", "type": "multiple_choice", "options": ["I do not feel sad", "I feel sad much of the time", "I am sad all the time", "I am so sad or unhappy that I cannot stand it"]},
    {"id": "bdi_2", "text": "Pessimism", "type": "multiple_choice", "options": ["I am not discouraged about my future", "I feel more discouraged about my future than I used to be", "I do not expect things to work out for me", "I feel my future is hopeless and will only get worse"]},
    {"id": "bdi_3", "text": "Past Failure", "type": "multiple_choice", "options": ["I do not feel like a failure", "I have failed more than I should have", "As I look back, I see a lot of failures", "I feel I am a total failure as a person"]},
    {"id": "bdi_4", "text": "Loss of Pleasure", "type": "multiple_choice", "options": ["I get as much pleasure as I ever did from things I enjoy", "I do not enjoy things as much as I used to", "I get very little pleasure from things I used to enjoy", "I cannot get any pleasure from things I used to enjoy"]},
    {"id": "bdi_5", "text": "Guilty Feelings", "type": "multiple_choice", "options": ["I do not feel particularly guilty", "I feel guilty over many things I have done or should have done", "I feel quite guilty most of the time", "I feel guilty all of the time"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 63,
    "min_score": 0,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 13, "label": "Minimal Depression", "description": "These ups and downs are considered normal", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 14, "max": 19, "label": "Mild Depression", "description": "Mild mood disturbance", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling"},
      {"min": 20, "max": 28, "label": "Moderate Depression", "description": "Moderate depression", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended"},
      {"min": 29, "max": 63, "label": "Severe Depression", "description": "Severe depression", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment required"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 14
  }'::jsonb,
  'This questionnaire consists of 21 groups of statements. Please read each group of statements carefully, and then pick out the one statement in each group that best describes the way you have been feeling during the past two weeks, including today.',
  10,
  'research_based'
),
(
  'Beck Anxiety Inventory',
  'BAI',
  'anxiety',
  'Measures severity of anxiety symptoms',
  '[
    {"id": "bai_1", "text": "Numbness or tingling", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
    {"id": "bai_2", "text": "Feeling hot", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
    {"id": "bai_3", "text": "Wobbliness in legs", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
    {"id": "bai_4", "text": "Unable to relax", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
    {"id": "bai_5", "text": "Fear of worst happening", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 63,
    "min_score": 0,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 7, "label": "Minimal Anxiety", "description": "Normal anxiety levels", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 8, "max": 15, "label": "Mild Anxiety", "description": "Mild anxiety symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider relaxation techniques"},
      {"min": 16, "max": 25, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended"},
      {"min": 26, "max": 63, "label": "Severe Anxiety", "description": "Severe anxiety symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment required"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 16
  }'::jsonb,
  'Below is a list of common symptoms of anxiety. Please carefully read each item in the list. Indicate how much you have been bothered by that symptom during the past month, including today.',
  5,
  'research_based'
),
(
  'Perceived Stress Scale-10',
  'PSS-10',
  'stress',
  'Measures the degree to which situations are appraised as stressful',
  '[
    {"id": "pss_1", "text": "How often have you been upset because of something that happened unexpectedly?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
    {"id": "pss_2", "text": "How often have you felt that you were unable to control the important things in your life?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
    {"id": "pss_3", "text": "How often have you felt nervous and stressed?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
    {"id": "pss_4", "text": "How often have you felt confident about your ability to handle your personal problems?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
    {"id": "pss_5", "text": "How often have you felt that things were going your way?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 40,
    "min_score": 0,
    "reverse_scored_items": ["pss_4", "pss_5"]
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 13, "label": "Low Stress", "description": "Low perceived stress levels", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current coping strategies"},
      {"min": 14, "max": 26, "label": "Moderate Stress", "description": "Moderate perceived stress levels", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Consider stress management techniques"},
      {"min": 27, "max": 40, "label": "High Stress", "description": "High perceived stress levels", "severity": "severe", "clinical_significance": "significant", "recommendations": "Stress management intervention recommended"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 20
  }'::jsonb,
  'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate by circling how often you felt or thought a certain way.',
  4,
  'research_based'
),
(
  'PTSD Checklist for DSM-5',
  'PCL-5',
  'trauma',
  'Measures PTSD symptoms according to DSM-5 criteria',
  '[
    {"id": "pcl5_1", "text": "Repeated, disturbing, and unwanted memories of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
    {"id": "pcl5_2", "text": "Repeated, disturbing dreams of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
    {"id": "pcl5_3", "text": "Suddenly feeling or acting as if the stressful experience were actually happening again", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
    {"id": "pcl5_4", "text": "Feeling very upset when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
    {"id": "pcl5_5", "text": "Having strong physical reactions when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 80,
    "min_score": 0,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 0, "max": 32, "label": "No PTSD", "description": "Symptoms below clinical threshold", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 33, "max": 80, "label": "Probable PTSD", "description": "Symptoms suggest probable PTSD diagnosis", "severity": "severe", "clinical_significance": "significant", "recommendations": "Comprehensive trauma assessment recommended"}
    ]
  }'::jsonb,
  '{
    "clinical_cutoff": 33
  }'::jsonb,
  'Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then circle one of the numbers to the right to indicate how much you have been bothered by that problem in the past month.',
  8,
  'research_based'
),
(
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing',
  'Measures global cognitive judgments of satisfaction with ones life',
  '[
    {"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
    {"id": "swls_2", "text": "The conditions of my life are excellent", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
    {"id": "swls_3", "text": "I am satisfied with my life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
    {"id": "swls_4", "text": "So far I have gotten the important things I want in life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
    {"id": "swls_5", "text": "If I could live my life over, I would change almost nothing", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]}
  ]'::jsonb,
  '{
    "method": "sum",
    "max_score": 35,
    "min_score": 5,
    "reverse_scored_items": []
  }'::jsonb,
  '{
    "ranges": [
      {"min": 5, "max": 9, "label": "Extremely Dissatisfied", "description": "Extremely dissatisfied with life", "severity": "severe", "clinical_significance": "significant", "recommendations": "Comprehensive life satisfaction assessment recommended"},
      {"min": 10, "max": 14, "label": "Dissatisfied", "description": "Dissatisfied with life", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Consider life satisfaction interventions"},
      {"min": 15, "max": 19, "label": "Slightly Dissatisfied", "description": "Slightly below neutral in life satisfaction", "severity": "mild", "clinical_significance": "mild", "recommendations": "Monitor and consider supportive interventions"},
      {"min": 20, "max": 24, "label": "Neutral", "description": "Neutral point on the scale", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue monitoring"},
      {"min": 25, "max": 29, "label": "Satisfied", "description": "Satisfied with life", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current well-being"},
      {"min": 30, "max": 35, "label": "Extremely Satisfied", "description": "Extremely satisfied with life", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Excellent life satisfaction"}
    ]
  }'::jsonb,
  '{}',
  'Below are five statements that you may agree or disagree with. Using the 1 - 7 scale below, indicate your agreement with each item by placing the appropriate number on the line preceding that item.',
  3,
  'research_based'
);

-- Create demo therapist account
DO $$
DECLARE
  demo_therapist_id uuid := 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  demo_client_id uuid := 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
  demo_case_id uuid;
BEGIN
  -- Insert demo therapist profile
  INSERT INTO profiles (id, role, first_name, last_name, email, whatsapp_number, professional_details, verification_status, created_at)
  VALUES (
    demo_therapist_id,
    'therapist',
    'Dr. Sarah',
    'Wilson',
    'demo.therapist@thera-py.com',
    '+1-555-0123',
    '{
      "specializations": ["Anxiety Disorders", "Depression", "Trauma & PTSD", "Cognitive Behavioral Therapy (CBT)"],
      "languages": ["English", "Spanish"],
      "qualifications": "Ph.D. in Clinical Psychology\nLicensed Professional Counselor (LPC)\nCertified CBT Therapist\n10+ years of clinical experience",
      "bio": "I am a licensed clinical psychologist with over 10 years of experience helping individuals overcome anxiety, depression, and trauma. My approach combines evidence-based cognitive behavioral therapy with mindfulness techniques to help clients develop practical coping strategies and achieve lasting positive change.",
      "practice_locations": [{"address": "123 Therapy Lane, Mental Health City, CA 90210", "isPrimary": true}]
    }'::jsonb,
    'verified',
    now() - interval '6 months'
  )
  ON CONFLICT (id) DO UPDATE SET
    professional_details = EXCLUDED.professional_details,
    verification_status = EXCLUDED.verification_status;

  -- Insert demo client profile
  INSERT INTO profiles (id, role, first_name, last_name, email, whatsapp_number, patient_code, created_by_therapist, password_set, created_at)
  VALUES (
    demo_client_id,
    'client',
    'John',
    'Smith',
    'demo.client@thera-py.com',
    '+1-555-0124',
    'PT123456',
    demo_therapist_id,
    true,
    now() - interval '3 months'
  )
  ON CONFLICT (id) DO UPDATE SET
    patient_code = EXCLUDED.patient_code,
    created_by_therapist = EXCLUDED.created_by_therapist;

  -- Create therapist-client relation
  INSERT INTO therapist_client_relations (therapist_id, client_id, created_at)
  VALUES (demo_therapist_id, demo_client_id, now() - interval '3 months')
  ON CONFLICT (therapist_id, client_id) DO NOTHING;

  -- Create client profile
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
  )
  VALUES (
    demo_client_id,
    demo_therapist_id,
    'Jane Smith',
    '+1-555-0125',
    'spouse',
    'No significant medical history. Occasional headaches during stress.',
    'None currently',
    'Client reports experiencing increased anxiety and low mood over the past 6 months following job loss. Symptoms include difficulty sleeping, worry about finances, and decreased motivation. Seeking help to develop coping strategies.',
    'No previous therapy experience. Interested in learning practical tools for managing anxiety.',
    'moderate',
    'Client is motivated and engaged. Shows good insight into their symptoms. Responds well to CBT techniques.',
    now() - interval '3 months'
  )
  ON CONFLICT (client_id, therapist_id) DO UPDATE SET
    presenting_concerns = EXCLUDED.presenting_concerns,
    notes = EXCLUDED.notes;

  -- Create a case for the demo client
  INSERT INTO cases (id, client_id, therapist_id, case_number, status, opened_at, created_at)
  VALUES (
    gen_random_uuid(),
    demo_client_id,
    demo_therapist_id,
    'CASE-2024-001',
    'active',
    now() - interval '3 months',
    now() - interval '3 months'
  )
  ON CONFLICT (case_number) DO NOTHING
  RETURNING id INTO demo_case_id;

  -- Get the case ID if it already exists
  IF demo_case_id IS NULL THEN
    SELECT id INTO demo_case_id FROM cases WHERE case_number = 'CASE-2024-001';
  END IF;

  -- Create sample assessment instances
  INSERT INTO assessment_instances (
    template_id,
    therapist_id,
    client_id,
    case_id,
    title,
    instructions,
    status,
    assigned_at,
    due_date,
    completed_at
  )
  SELECT 
    t.id,
    demo_therapist_id,
    demo_client_id,
    demo_case_id,
    t.name,
    'Please complete this assessment as part of your ongoing treatment.',
    CASE 
      WHEN t.abbreviation = 'PHQ-9' THEN 'completed'
      WHEN t.abbreviation = 'GAD-7' THEN 'completed'
      ELSE 'assigned'
    END,
    now() - interval '1 week',
    (now() + interval '1 week')::date,
    CASE 
      WHEN t.abbreviation IN ('PHQ-9', 'GAD-7') THEN now() - interval '3 days'
      ELSE NULL
    END
  FROM assessment_templates t
  WHERE t.abbreviation IN ('PHQ-9', 'GAD-7', 'PSS-10')
  ON CONFLICT DO NOTHING;

  -- Add sample responses for completed assessments
  INSERT INTO assessment_responses (instance_id, question_id, response_value, is_final, response_timestamp)
  SELECT 
    ai.id,
    q.value->>'id',
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 
        CASE (q.value->>'id')
          WHEN 'phq9_1' THEN '2'::jsonb
          WHEN 'phq9_2' THEN '2'::jsonb
          WHEN 'phq9_3' THEN '1'::jsonb
          WHEN 'phq9_4' THEN '2'::jsonb
          WHEN 'phq9_5' THEN '1'::jsonb
          WHEN 'phq9_6' THEN '1'::jsonb
          WHEN 'phq9_7' THEN '1'::jsonb
          WHEN 'phq9_8' THEN '0'::jsonb
          WHEN 'phq9_9' THEN '0'::jsonb
          ELSE '1'::jsonb
        END
      WHEN ai.title LIKE '%GAD-7%' THEN
        CASE (q.value->>'id')
          WHEN 'gad7_1' THEN '2'::jsonb
          WHEN 'gad7_2' THEN '1'::jsonb
          WHEN 'gad7_3' THEN '2'::jsonb
          WHEN 'gad7_4' THEN '1'::jsonb
          WHEN 'gad7_5' THEN '1'::jsonb
          WHEN 'gad7_6' THEN '1'::jsonb
          WHEN 'gad7_7' THEN '1'::jsonb
          ELSE '1'::jsonb
        END
      ELSE '1'::jsonb
    END,
    true,
    now() - interval '3 days'
  FROM assessment_instances ai
  JOIN assessment_templates t ON t.id = ai.template_id
  CROSS JOIN jsonb_array_elements(t.questions) AS q
  WHERE ai.status = 'completed'
  AND ai.client_id = demo_client_id
  ON CONFLICT (instance_id, question_id) DO NOTHING;

  -- Add calculated scores for completed assessments
  INSERT INTO assessment_scores (
    instance_id,
    raw_score,
    interpretation_category,
    interpretation_description,
    clinical_significance,
    severity_level,
    recommendations,
    auto_generated,
    calculated_at
  )
  SELECT 
    ai.id,
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 10
      WHEN ai.title LIKE '%GAD-7%' THEN 9
      ELSE 15
    END,
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 'Moderate Depression'
      WHEN ai.title LIKE '%GAD-7%' THEN 'Mild Anxiety'
      ELSE 'Moderate'
    END,
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 'Moderate depression symptoms present'
      WHEN ai.title LIKE '%GAD-7%' THEN 'Mild anxiety symptoms present'
      ELSE 'Moderate symptoms present'
    END,
    'moderate',
    'moderate',
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 'Continue therapy, monitor progress, consider medication evaluation'
      WHEN ai.title LIKE '%GAD-7%' THEN 'Continue anxiety management techniques, monitor symptoms'
      ELSE 'Continue current treatment approach'
    END,
    true,
    now() - interval '3 days'
  FROM assessment_instances ai
  WHERE ai.status = 'completed'
  AND ai.client_id = demo_client_id
  ON CONFLICT (instance_id) DO NOTHING;

  -- Add progress tracking data
  INSERT INTO progress_tracking (client_id, metric_type, value, source_type, source_id, recorded_at)
  SELECT 
    demo_client_id,
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 'phq9_total'
      WHEN ai.title LIKE '%GAD-7%' THEN 'gad7_total'
      ELSE 'assessment_score'
    END,
    CASE 
      WHEN ai.title LIKE '%PHQ-9%' THEN 10
      WHEN ai.title LIKE '%GAD-7%' THEN 9
      ELSE 15
    END,
    'psychometric',
    ai.id,
    now() - interval '3 days'
  FROM assessment_instances ai
  WHERE ai.status = 'completed'
  AND ai.client_id = demo_client_id
  ON CONFLICT DO NOTHING;

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
  )
  VALUES 
  (
    demo_therapist_id,
    demo_client_id,
    now() - interval '2 weeks',
    50,
    'individual',
    'completed',
    'Initial intake session. Client presented with anxiety and depression symptoms following job loss.',
    now() - interval '2 weeks'
  ),
  (
    demo_therapist_id,
    demo_client_id,
    now() - interval '1 week',
    50,
    'individual',
    'completed',
    'Introduced CBT concepts and thought record technique. Client engaged well.',
    now() - interval '1 week'
  ),
  (
    demo_therapist_id,
    demo_client_id,
    now() + interval '3 days',
    50,
    'individual',
    'scheduled',
    'Follow-up session to review assessment results and adjust treatment plan.',
    now()
  )
  ON CONFLICT DO NOTHING;

  -- Create sample CBT worksheets
  INSERT INTO cbt_worksheets (
    therapist_id,
    client_id,
    type,
    title,
    content,
    status,
    created_at
  )
  VALUES (
    demo_therapist_id,
    demo_client_id,
    'thought_record',
    'Daily Thought Record Practice',
    '{
      "situation": "Received rejection email from job application",
      "automatic_thought": "I will never find a job. I am not good enough.",
      "emotion": "Anxious, sad",
      "intensity": 8,
      "evidence_for": "This is the third rejection this month",
      "evidence_against": "I have had interviews, which means my resume is competitive. The job market is tough right now for everyone.",
      "balanced_thought": "Job searching is challenging, but rejections are normal. I have valuable skills and will find the right opportunity.",
      "new_emotion": "Disappointed but hopeful",
      "new_intensity": 4
    }'::jsonb,
    'completed',
    now() - interval '5 days'
  )
  ON CONFLICT DO NOTHING;

  -- Create sample therapeutic exercises
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
  )
  VALUES (
    demo_therapist_id,
    demo_client_id,
    'breathing',
    'Box Breathing Exercise',
    'Practice 4-4-4-4 breathing technique to manage anxiety',
    '{"cycles_target": 10, "inhale_duration": 4, "hold_duration": 4, "exhale_duration": 4, "pause_duration": 4}',
    '{"cycles_completed": 15, "total_sessions": 3, "best_session": 12}',
    'in_progress',
    now() - interval '1 week',
    now() - interval '1 day'
  )
  ON CONFLICT DO NOTHING;

END $$;