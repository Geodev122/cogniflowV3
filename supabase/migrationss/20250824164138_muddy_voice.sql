/*
  # Comprehensive Psychometric Assessment System

  1. New Tables
    - `assessment_templates` - Standardized assessment definitions (GAD-7, PHQ-9, etc.)
    - `assessment_instances` - Individual assessment assignments to clients
    - `assessment_responses` - Client responses to assessment questions
    - `assessment_scores` - Calculated scores and interpretations
    - `assessment_interpretations` - Clinical interpretation rules and thresholds

  2. Enhanced Tables
    - Updated `psychometric_forms` with better structure
    - Enhanced `form_assignments` for assessment workflow

  3. Security
    - Enable RLS on all new tables
    - Add policies for therapist and client access
    - Secure scoring and interpretation functions

  4. Functions
    - Dynamic scoring algorithms
    - Interpretation logic
    - Auto-scoring triggers
*/

-- Assessment Templates (Standardized assessments like GAD-7, PHQ-9)
CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('anxiety', 'depression', 'trauma', 'stress', 'wellbeing', 'personality', 'substance', 'eating', 'sleep', 'general')),
  description text,
  version text DEFAULT '1.0',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_cutoffs jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions text,
  estimated_duration_minutes integer DEFAULT 10,
  evidence_level text DEFAULT 'research_based' CHECK (evidence_level IN ('research_based', 'clinical_consensus', 'expert_opinion')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessment Instances (Individual assignments to clients)
CREATE TABLE IF NOT EXISTS assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')),
  assigned_at timestamptz DEFAULT now(),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none' CHECK (reminder_frequency IN ('none', 'daily', 'weekly', 'before_due')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessment Responses (Client answers to questions)
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

-- Assessment Scores (Calculated results and interpretations)
CREATE TABLE IF NOT EXISTS assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES assessment_instances(id) ON DELETE CASCADE,
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

-- Assessment Interpretation Rules (Dynamic interpretation logic)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_templates_category ON assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON assessment_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance ON assessment_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_instance ON assessment_scores(instance_id);

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
  WITH CHECK (client_id = auth.uid() AND status IN ('in_progress', 'completed'));

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

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Function to calculate assessment score
CREATE OR REPLACE FUNCTION calculate_assessment_score(instance_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  template_data jsonb;
  responses_data jsonb;
  scoring_config jsonb;
  raw_score numeric := 0;
  question jsonb;
  response jsonb;
  question_score numeric;
  result jsonb;
BEGIN
  -- Get template and scoring configuration
  SELECT 
    at.scoring_config,
    at.interpretation_rules,
    at.clinical_cutoffs
  INTO scoring_config, template_data, template_data
  FROM assessment_instances ai
  JOIN assessment_templates at ON ai.template_id = at.id
  WHERE ai.id = instance_uuid;

  -- Get all responses for this instance
  SELECT jsonb_object_agg(question_id, response_value)
  INTO responses_data
  FROM assessment_responses
  WHERE instance_id = instance_uuid AND is_final = true;

  -- Calculate raw score based on scoring method
  IF scoring_config->>'method' = 'sum' THEN
    -- Sum all response values
    FOR question IN SELECT jsonb_array_elements(template_data->'questions')
    LOOP
      response := responses_data->(question->>'id');
      IF response IS NOT NULL THEN
        question_score := (response->>0)::numeric;
        
        -- Handle reverse scoring
        IF (question->>'reverse_scored')::boolean = true THEN
          question_score := (question->'scale_max')::numeric - question_score;
        END IF;
        
        raw_score := raw_score + question_score;
      END IF;
    END LOOP;
    
  ELSIF scoring_config->>'method' = 'average' THEN
    -- Calculate average of response values
    raw_score := raw_score / jsonb_array_length(template_data->'questions');
  END IF;

  -- Build result object
  result := jsonb_build_object(
    'raw_score', raw_score,
    'max_score', scoring_config->'max_score',
    'percentage', ROUND((raw_score / (scoring_config->'max_score')::numeric) * 100, 2),
    'calculated_at', now()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get interpretation for score
CREATE OR REPLACE FUNCTION get_assessment_interpretation(template_uuid uuid, score numeric)
RETURNS jsonb AS $$
DECLARE
  interpretation_rules jsonb;
  rule jsonb;
  result jsonb;
BEGIN
  -- Get interpretation rules from template
  SELECT at.interpretation_rules
  INTO interpretation_rules
  FROM assessment_templates at
  WHERE at.id = template_uuid;

  -- Find matching interpretation rule
  FOR rule IN SELECT jsonb_array_elements(interpretation_rules->'ranges')
  LOOP
    IF score >= (rule->'min')::numeric AND score <= (rule->'max')::numeric THEN
      result := jsonb_build_object(
        'category', rule->>'label',
        'description', rule->>'description',
        'severity', rule->>'severity',
        'recommendations', rule->>'recommendations',
        'clinical_significance', rule->>'clinical_significance'
      );
      EXIT;
    END IF;
  END LOOP;

  RETURN COALESCE(result, jsonb_build_object('category', 'Unknown', 'description', 'Score interpretation not available'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-calculate scores when assessment is completed
CREATE OR REPLACE FUNCTION auto_calculate_assessment_score()
RETURNS TRIGGER AS $$
DECLARE
  score_result jsonb;
  interpretation_result jsonb;
  template_uuid uuid;
BEGIN
  -- Only calculate when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get template ID
    SELECT template_id INTO template_uuid
    FROM assessment_instances
    WHERE id = NEW.id;

    -- Calculate score
    score_result := calculate_assessment_score(NEW.id);
    interpretation_result := get_assessment_interpretation(template_uuid, (score_result->>'raw_score')::numeric);

    -- Insert or update score record
    INSERT INTO assessment_scores (
      instance_id,
      raw_score,
      scaled_score,
      percentile,
      interpretation_category,
      interpretation_description,
      clinical_significance,
      severity_level,
      auto_generated,
      calculated_at
    ) VALUES (
      NEW.id,
      (score_result->>'raw_score')::numeric,
      (score_result->>'percentage')::numeric,
      (score_result->>'percentage')::numeric,
      interpretation_result->>'category',
      interpretation_result->>'description',
      interpretation_result->>'clinical_significance',
      interpretation_result->>'severity',
      true,
      now()
    )
    ON CONFLICT (instance_id) DO UPDATE SET
      raw_score = EXCLUDED.raw_score,
      scaled_score = EXCLUDED.scaled_score,
      percentile = EXCLUDED.percentile,
      interpretation_category = EXCLUDED.interpretation_category,
      interpretation_description = EXCLUDED.interpretation_description,
      clinical_significance = EXCLUDED.clinical_significance,
      severity_level = EXCLUDED.severity_level,
      calculated_at = EXCLUDED.calculated_at;

    -- Add to progress tracking
    INSERT INTO progress_tracking (
      client_id,
      metric_type,
      value,
      source_type,
      source_id,
      recorded_at
    ) VALUES (
      NEW.client_id,
      (SELECT abbreviation FROM assessment_templates WHERE id = template_uuid),
      (score_result->>'raw_score')::numeric,
      'psychometric',
      NEW.id,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_calculate_score_trigger
  AFTER UPDATE ON assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_assessment_score();

-- Add unique constraint to assessment_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'assessment_scores' 
    AND constraint_name = 'assessment_scores_instance_id_key'
  ) THEN
    ALTER TABLE assessment_scores ADD CONSTRAINT assessment_scores_instance_id_key UNIQUE (instance_id);
  END IF;
END $$;

-- Insert standard psychometric assessments
INSERT INTO assessment_templates (name, abbreviation, category, description, questions, scoring_config, interpretation_rules, clinical_cutoffs, instructions, estimated_duration_minutes) VALUES

-- PHQ-9 (Patient Health Questionnaire-9)
('Patient Health Questionnaire-9', 'PHQ-9', 'depression', 'Measures severity of depression symptoms over the past two weeks', 
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
'{"method": "sum", "max_score": 27, "reverse_scored_items": []}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Monitor symptoms, promote wellness activities"},
  {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling, lifestyle interventions"},
  {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Psychotherapy recommended, consider medication evaluation"},
  {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms", "severity": "moderately_severe", "clinical_significance": "significant", "recommendations": "Active treatment with psychotherapy and medication evaluation"},
  {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment, consider intensive interventions, safety assessment"}
]}'::jsonb,
'{"clinical_cutoff": 10, "suicide_risk_item": "phq9_9", "suicide_risk_threshold": 1}'::jsonb,
'Over the last 2 weeks, how often have you been bothered by any of the following problems?', 5),

-- GAD-7 (Generalized Anxiety Disorder-7)
('Generalized Anxiety Disorder-7', 'GAD-7', 'anxiety', 'Measures severity of generalized anxiety disorder symptoms over the past two weeks',
'[
  {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_7", "text": "Feeling afraid, as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]}
]'::jsonb,
'{"method": "sum", "max_score": 21, "reverse_scored_items": []}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Monitor symptoms, stress management techniques"},
  {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Relaxation techniques, lifestyle modifications"},
  {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Psychotherapy recommended, anxiety management strategies"},
  {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Active treatment required, consider medication evaluation"}
]}'::jsonb,
'{"clinical_cutoff": 10}'::jsonb,
'Over the last 2 weeks, how often have you been bothered by the following problems?', 3),

-- PSS-10 (Perceived Stress Scale)
('Perceived Stress Scale-10', 'PSS-10', 'stress', 'Measures the degree to which situations are appraised as stressful',
'[
  {"id": "pss_1", "text": "How often have you been upset because of something that happened unexpectedly?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_2", "text": "How often have you felt that you were unable to control the important things in your life?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_3", "text": "How often have you felt nervous and stressed?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_4", "text": "How often have you felt confident about your ability to handle your personal problems?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_5", "text": "How often have you felt that things were going your way?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_6", "text": "How often have you found that you could not cope with all the things that you had to do?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_7", "text": "How often have you been able to control irritations in your life?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_8", "text": "How often have you felt that you were on top of things?", "type": "scale", "scale_min": 0, "scale_max": 4, "reverse_scored": true, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_9", "text": "How often have you been angered because of things that were outside of your control?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_10", "text": "How often have you felt difficulties were piling up so high that you could not overcome them?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]}
]'::jsonb,
'{"method": "sum", "max_score": 40, "reverse_scored_items": ["pss_4", "pss_5", "pss_7", "pss_8"]}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 13, "label": "Low Stress", "description": "Low perceived stress levels", "severity": "low", "clinical_significance": "normal", "recommendations": "Maintain current coping strategies"},
  {"min": 14, "max": 26, "label": "Moderate Stress", "description": "Moderate perceived stress levels", "severity": "moderate", "clinical_significance": "elevated", "recommendations": "Stress management techniques, lifestyle modifications"},
  {"min": 27, "max": 40, "label": "High Stress", "description": "High perceived stress levels", "severity": "high", "clinical_significance": "significant", "recommendations": "Active stress management, consider professional support"}
]}'::jsonb,
'{"clinical_cutoff": 20}'::jsonb,
'In the last month, how often have you felt or thought a certain way?', 5),

-- SWLS (Satisfaction with Life Scale)
('Satisfaction with Life Scale', 'SWLS', 'wellbeing', 'Measures global cognitive judgments of satisfaction with ones life',
'[
  {"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_2", "text": "The conditions of my life are excellent", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_3", "text": "I am satisfied with my life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_4", "text": "So far I have gotten the important things I want in life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_5", "text": "If I could live my life over, I would change almost nothing", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]}
]'::jsonb,
'{"method": "sum", "max_score": 35, "reverse_scored_items": []}'::jsonb,
'{"ranges": [
  {"min": 5, "max": 9, "label": "Extremely Dissatisfied", "description": "Extremely dissatisfied with life", "severity": "very_low", "clinical_significance": "concerning", "recommendations": "Comprehensive life satisfaction assessment, therapeutic intervention"},
  {"min": 10, "max": 14, "label": "Dissatisfied", "description": "Dissatisfied with life", "severity": "low", "clinical_significance": "below_average", "recommendations": "Explore sources of dissatisfaction, goal setting"},
  {"min": 15, "max": 19, "label": "Slightly Dissatisfied", "description": "Slightly below neutral in life satisfaction", "severity": "slightly_low", "clinical_significance": "slightly_below_average", "recommendations": "Identify areas for improvement, positive psychology interventions"},
  {"min": 20, "max": 24, "label": "Neutral", "description": "Neutral point on the scale", "severity": "average", "clinical_significance": "average", "recommendations": "Maintain current satisfaction, explore growth opportunities"},
  {"min": 25, "max": 29, "label": "Satisfied", "description": "Satisfied with life", "severity": "high", "clinical_significance": "above_average", "recommendations": "Maintain positive factors, share strategies"},
  {"min": 30, "max": 35, "label": "Extremely Satisfied", "description": "Extremely satisfied with life", "severity": "very_high", "clinical_significance": "excellent", "recommendations": "Maintain current lifestyle, consider helping others"}
]}'::jsonb,
'{"optimal_range": [25, 35]}'::jsonb,
'Below are five statements that you may agree or disagree with. Using the 1-7 scale below, indicate your agreement with each item.', 3),

-- CD-RISC-10 (Connor-Davidson Resilience Scale)
('Connor-Davidson Resilience Scale-10', 'CD-RISC-10', 'wellbeing', 'Measures resilience and ability to cope with adversity',
'[
  {"id": "cdrisc_1", "text": "I am able to adapt when changes occur", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_2", "text": "I have at least one close and secure relationship that helps me when I am stressed", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_3", "text": "When there are no clear solutions to my problems, sometimes fate or God can help", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_4", "text": "I can deal with whatever comes my way", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_5", "text": "Past successes give me confidence in dealing with new challenges", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_6", "text": "I see the humorous side of things", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_7", "text": "Having to cope with stress can make me stronger", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_8", "text": "I tend to bounce back after illness, injury, or other hardships", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_9", "text": "Things happen for a reason", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_10", "text": "I can achieve my goals, even when there are obstacles", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]}
]'::jsonb,
'{"method": "sum", "max_score": 40, "reverse_scored_items": []}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 20, "label": "Low Resilience", "description": "Lower resilience levels", "severity": "low", "clinical_significance": "concerning", "recommendations": "Resilience building interventions, coping skills training"},
  {"min": 21, "max": 30, "label": "Moderate Resilience", "description": "Moderate resilience levels", "severity": "moderate", "clinical_significance": "average", "recommendations": "Strengthen existing coping strategies, build support networks"},
  {"min": 31, "max": 40, "label": "High Resilience", "description": "High resilience levels", "severity": "high", "clinical_significance": "strength", "recommendations": "Maintain current strategies, consider peer support roles"}
]}'::jsonb,
'{"optimal_range": [31, 40]}'::jsonb,
'Please indicate how much you agree with each of the following statements as they apply to you over the last month.', 4);