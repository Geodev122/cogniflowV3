-- ========================================================
-- 1. Enable Required Extensions
-- ========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- 2. Tables, Triggers, RLS for assessment system
-- (assessment_templates, instances, responses, scores, interpretation_rules)
-- ========================================================
-- ... (same as prior script through interpretation_rules and RLS)
-- ========================================================
-- ==============================================
-- 2. assessment_templates Table & Policies
-- ==============================================
CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text UNIQUE NOT NULL,
  category text NOT NULL CHECK (
    category = ANY (ARRAY[
      'anxiety','depression','trauma','stress','wellbeing','personality','substance','eating','sleep','general'
    ])
  ),
  description text,
  version text DEFAULT '1.0',
  questions jsonb NOT NULL DEFAULT '[]',
  scoring_config jsonb NOT NULL DEFAULT '{}',
  interpretation_rules jsonb NOT NULL DEFAULT '{}',
  clinical_cutoffs jsonb NOT NULL DEFAULT '{}',
  instructions text,
  estimated_duration_minutes integer DEFAULT 10,
  evidence_level text DEFAULT 'research_based' CHECK (
    evidence_level = ANY (ARRAY['research_based','clinical_consensus','expert_opinion'])
  ),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_assessment_templates_updated_at
  BEFORE UPDATE ON assessment_templates
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_templates_read_all" ON assessment_templates;
CREATE POLICY "assessment_templates_read_all"
  ON assessment_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "assessment_templates_therapist_manage" ON assessment_templates;
CREATE POLICY "assessment_templates_therapist_manage"
  ON assessment_templates
  FOR ALL
  TO authenticated
  USING (
    (public.get_user_role() = 'therapist')
  )
  WITH CHECK (
    (public.get_user_role() = 'therapist')
  );





-- ========================================================
-- 5. assessment_scores Table & Policies
-- ========================================================
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

CREATE TRIGGER trg_assessment_scores_updated_at
  BEFORE UPDATE ON assessment_scores
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_scores_therapist_manage" ON assessment_scores;
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

DROP POLICY IF EXISTS "assessment_scores_client_read" ON assessment_scores;
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


-- ================================================================
-- 6. assessment_interpretation_rules Table & Policies
-- ================================================================
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

ALTER TABLE assessment_interpretation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_interpretation_rules_read_all" ON assessment_interpretation_rules;
CREATE POLICY "assessment_interpretation_rules_read_all"
  ON assessment_interpretation_rules
  FOR SELECT
  TO authenticated
  USING (is_active = true);


-- ========================================================
-- 7. Indexes for Performance
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_category ON assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON assessment_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance ON assessment_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_instance ON assessment_scores(instance_id);


-- ========================================================
-- 8. Trigger for Auto-Calculation of Scores (Placeholder)
-- ========================================================
CREATE OR REPLACE FUNCTION auto_calculate_assessment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::text = 'completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    -- Placeholder hook for server-side scoring logic
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_calculate_score
  AFTER UPDATE ON assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_assessment_score();


-- ========================================================
-- 3. Performance Indexes and Auto-Calculation Trigger
-- ========================================================
-- ... (same as previous section for indexes and auto_calculate_assessment_score)

-- ========================================================
-- 3. assessment_instances Table & Policies
-- ========================================================
CREATE TABLE IF NOT EXISTS assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  status text DEFAULT 'assigned' CHECK (
    status::text = ANY (ARRAY['assigned','in_progress','completed','expired','cancelled'])
  ),
  assigned_at timestamptz DEFAULT now(),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none' CHECK (
    reminder_frequency = ANY (ARRAY['none','daily','weekly','before_due'])
  ),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_assessment_instances_updated_at
  BEFORE UPDATE ON assessment_instances
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_instances_therapist_manage" ON assessment_instances;
CREATE POLICY "assessment_instances_therapist_manage"
  ON assessment_instances
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

DROP POLICY IF EXISTS "assessment_instances_client_read" ON assessment_instances;
CREATE POLICY "assessment_instances_client_read"
  ON assessment_instances
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "assessment_instances_client_update_status" ON assessment_instances;
CREATE POLICY "assessment_instances_client_update_status"
  ON assessment_instances
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND status::text = ANY (ARRAY['in_progress','completed'])
  );


-- ========================================================
-- 4. assessment_responses Table & Policies
-- ========================================================
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
  UNIQUE (instance_id, question_id)
);

CREATE TRIGGER trg_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_responses_client_manage" ON assessment_responses;
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

DROP POLICY IF EXISTS "assessment_responses_therapist_read" ON assessment_responses;
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


-- ========================================================
-- 1. Enable Required Extensions & Helper Functions
-- ========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Fallback trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto‑calculation trigger for completed assessments
CREATE OR REPLACE FUNCTION auto_calculate_assessment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::text = 'completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    -- Placeholder: future server‑side scoring logic
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========================================================
-- 2. Schema Definitions: Tables, Triggers & RLS Policies
-- ========================================================

-- assessment_templates
CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['anxiety','depression','trauma','stress','wellbeing','personality','substance','eating','sleep','general'])),
  description text,
  version text DEFAULT '1.0',
  questions jsonb NOT NULL DEFAULT '[]',
  scoring_config jsonb NOT NULL DEFAULT '{}',
  interpretation_rules jsonb NOT NULL DEFAULT '{}',
  clinical_cutoffs jsonb NOT NULL DEFAULT '{}',
  instructions text,
  estimated_duration_minutes integer DEFAULT 10,
  evidence_level text DEFAULT 'research_based' CHECK (evidence_level = ANY (ARRAY['research_based','clinical_consensus','expert_opinion'])),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
  CREATE OR REPLACE TRIGGER trg_assessment_templates_updated_at
  BEFORE UPDATE ON assessment_scores
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_templates_read_all" ON assessment_templates;
CREATE POLICY "assessment_templates_read_all"
  ON assessment_templates FOR SELECT TO authenticated
  USING (is_active = true);
DROP POLICY IF EXISTS "assessment_templates_therapist_manage" ON assessment_templates;
CREATE POLICY "assessment_templates_therapist_manage"
  ON assessment_templates FOR ALL TO authenticated
  USING ((public.get_user_role() = 'therapist'))
  WITH CHECK ((public.get_user_role() = 'therapist'));

-- assessment_instances
CREATE TABLE IF NOT EXISTS assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  status text DEFAULT 'assigned' CHECK (status = ANY (ARRAY['assigned','in_progress','completed','expired','cancelled'])),
  assigned_at timestamptz DEFAULT now(),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none' CHECK (reminder_frequency = ANY (ARRAY['none','daily','weekly','before_due'])),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE OR REPLACE TRIGGER trg_assessment_instances_updated_at
  BEFORE UPDATE ON assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_instances_therapist_manage" ON assessment_instances;
CREATE POLICY "assessment_instances_therapist_manage"
  ON assessment_instances FOR ALL TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());
DROP POLICY IF EXISTS "assessment_instances_client_read" ON assessment_instances;
CREATE POLICY "assessment_instances_client_read"
  ON assessment_instances FOR SELECT TO authenticated
  USING (client_id = auth.uid());
DROP POLICY IF EXISTS "assessment_instances_client_update_status" ON assessment_instances;
CREATE POLICY "assessment_instances_client_update_status"
  ON assessment_instances FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid() AND status = ANY (ARRAY['in_progress','completed']));

-- assessment_responses
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
  UNIQUE (instance_id, question_id)
);
CREATE OR REPLACE TRIGGER trg_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_responses_client_manage" ON assessment_responses;
CREATE POLICY "assessment_responses_client_manage"
  ON assessment_responses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_responses.instance_id AND client_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_responses.instance_id AND client_id = auth.uid()));
DROP POLICY IF EXISTS "assessment_responses_therapist_read" ON assessment_responses;
CREATE POLICY "assessment_responses_therapist_read"
  ON assessment_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_responses.instance_id AND therapist_id = auth.uid()));

-- assessment_scores
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
CREATE OR REPLACE TRIGGER trg_assessment_scores_updated_at
  BEFORE UPDATE ON assessment_scores
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_scores_therapist_manage" ON assessment_scores;
CREATE POLICY "assessment_scores_therapist_manage"
  ON assessment_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_scores.instance_id AND therapist_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_scores.instance_id AND therapist_id = auth.uid()));
DROP POLICY IF EXISTS "assessment_scores_client_read" ON assessment_scores;
CREATE POLICY "assessment_scores_client_read"
  ON assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assessment_instances WHERE id = assessment_scores.instance_id AND client_id = auth.uid()));

-- interpretation rules
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
ALTER TABLE assessment_interpretation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_interpretation_rules_read_all" ON assessment_interpretation_rules;
CREATE POLICY "assessment_interpretation_rules_read_all"
  ON assessment_interpretation_rules FOR SELECT TO authenticated
  USING (is_active = true);


-- ========================================================
-- 3. Performance Indexes & Auto‑Score Trigger
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_category ON assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_therapist ON assessment_instances(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_status ON assessment_instances(status);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date ON assessment_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance ON assessment_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_instance ON assessment_scores(instance_id);

DROP TRIGGER IF EXISTS trg_auto_calculate_score ON assessment_instances;
CREATE TRIGGER trg_auto_calculate_score
  AFTER UPDATE ON assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_assessment_score();


-- ========================================================
-- 4. Insert Selected Assessment Templates
-- ========================================================
INSERT INTO assessment_templates (abbreviation, name, category, description, questions, scoring_config, interpretation_rules, clinical_cutoffs, instructions, estimated_duration_minutes, evidence_level)
VALUES
 ('PHQ-9','Patient Health Questionnaire‑9','depression','Assesses depression severity','[{"id":"phq9_1","text":"Little interest...","type":"scale","scale_min":0,"scale_max":3}, {"id":"phq9_2","text":"Feeling down...","type":"scale","scale_min":0,"scale_max":3}]'::jsonb,'{"method":"sum","max_score":27}'::jsonb,'{}'::jsonb,'{}'::jsonb,'Please complete.','5','research_based'),
 ('GAD-7','Generalized Anxiety Disorder‑7','anxiety','Assesses anxiety severity','[{"id":"gad7_1","text":"Feeling nervous...","type":"scale","scale_min":0,"scale_max":3}]'::jsonb,'{"method":"sum","max_score":21}'::jsonb,'{}'::jsonb,'{}'::jsonb,'Please complete.','5','research_based'),
 ('PSS-10','Perceived Stress Scale‑10','stress','Assesses perceived stress','[{"id":"pss_1","text":"How often upset...","type":"scale","scale_min":0,"scale_max":4}]'::jsonb,'{"method":"sum","max_score":40}'::jsonb,'{}'::jsonb,'{}'::jsonb,'Please complete.','5','research_based')
ON CONFLICT (abbreviation) DO NOTHING;


-- ========================================================
-- 5. Demo Data Using the Provided Real Accounts
-- ========================================================
DO $$
DECLARE
  demo_therapist_id UUID := '60aa4294-e569-49af-a876-227ad43d94ca';
  demo_client_id UUID := 'f7cb820b-f73e-4bfe-9571-261c7eef79e0';
  demo_case_id UUID;
BEGIN
  -- Create relation and client profile
  INSERT INTO therapist_client_relations (therapist_id, client_id, created_at)
  VALUES (demo_therapist_id, demo_client_id, now() - INTERVAL '3 months') 
  ON CONFLICT DO NOTHING;

  INSERT INTO client_profiles (client_id, therapist_id, emergency_contact_name, emergency_contact_phone, notes, created_at)
  VALUES (demo_client_id, demo_therapist_id, 'Jane Doe', '+1234567', 'Auto‑seeded client profile', now() - INTERVAL '3 months')
  ON CONFLICT (client_id, therapist_id) DO NOTHING;

  -- Create or fetch case
  INSERT INTO cases (id, client_id, therapist_id, case_number, status, opened_at, created_at)
  VALUES (gen_random_uuid(), demo_client_id, demo_therapist_id, 'CASE-2025-001', 'active', now() - INTERVAL '3 months', now() - INTERVAL '3 months')
  ON CONFLICT (case_number) DO NOTHING
  RETURNING id INTO demo_case_id;

  IF demo_case_id IS NULL THEN
    SELECT id INTO demo_case_id FROM cases WHERE case_number = 'CASE-2025-001';
  END IF;

  -- Seed instances, responses, scores, progress, appointments, worksheets, exercises
  INSERT INTO assessment_instances (template_id, therapist_id, client_id, case_id, title, status, assigned_at, due_date, completed_at)
    SELECT id, demo_therapist_id, demo_client_id, demo_case_id, name, 'completed', now() - INTERVAL '1 week', now()::date, now() - INTERVAL '2 days'
    FROM assessment_templates WHERE abbreviation IN ('PHQ-9','GAD-7') ON CONFLICT DO NOTHING;

  INSERT INTO assessment_responses (instance_id, question_id, response_value, is_final, response_timestamp)
    SELECT ai.id, q.value->>'id', '1'::jsonb, true, now() - INTERVAL '2 days'
    FROM assessment_instances ai
    JOIN assessment_templates t ON t.id = ai.template_id
    CROSS JOIN jsonb_array_elements(t.questions) AS q
  WHERE ai.client_id = demo_client_id AND ai.status::text = 'completed'
    ON CONFLICT (instance_id, question_id) DO NOTHING;

  INSERT INTO assessment_scores (instance_id, raw_score, interpretation_category, calculated_at)
    SELECT id, 10, 'Threshold reached', now() - INTERVAL '2 days'
  FROM assessment_instances WHERE client_id = demo_client_id AND status::text = 'completed'
    ON CONFLICT (instance_id) DO NOTHING;

  -- Corrected line:
  INSERT INTO progress_tracking (client_id, metric_type, value, source_type, source_id, recorded_at)
    SELECT demo_client_id, 'assessment_score', raw_score, 'psychometric', instance_id, now() - INTERVAL '2 days'
    FROM assessment_scores WHERE instance_id IN (SELECT id FROM assessment_instances WHERE client_id = demo_client_id)
    ON CONFLICT DO NOTHING;

  INSERT INTO appointments (therapist_id, client_id, appointment_date, duration_minutes, appointment_type, status, notes, created_at)
    VALUES (demo_therapist_id, demo_client_id, now() - INTERVAL '1 week', 60, 'individual', 'completed', 'Review results', now() - INTERVAL '1 week')
    ON CONFLICT DO NOTHING;

  INSERT INTO cbt_worksheets (therapist_id, client_id, type, title, content, status, created_at)
    VALUES (demo_therapist_id, demo_client_id, 'worksheet', 'Sample CBT', '{"content":"…"}'::jsonb, 'completed', now() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

  INSERT INTO therapeutic_exercises (therapist_id, client_id, exercise_type, title, description, game_config, progress, status, created_at, last_played_at)
    VALUES (demo_therapist_id, demo_client_id, 'breathing', 'Box Breathing', '...description...', '{"params":1}'::jsonb, '{"done":1}'::jsonb, 'completed', now() - INTERVAL '3 days', now() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;
END $$;
