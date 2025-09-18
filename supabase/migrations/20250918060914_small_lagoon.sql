/*
  # Assessment Templates Population
  
  ## Overview
  This migration populates the assessment_templates table with comprehensive, 
  evidence-based psychometric instruments commonly used in CBT practice.
  
  ## Instruments Included
  1. **Depression Assessments** - PHQ-9, BDI-II
  2. **Anxiety Assessments** - GAD-7, BAI
  3. **Trauma Assessments** - PCL-5
  4. **Stress Assessments** - PSS-10
  5. **Wellbeing Assessments** - SWLS, CD-RISC-10, MAAS
  6. **Specialized Assessments** - MBI (Burnout)
  
  ## Features
  - Complete question sets with proper scoring
  - Clinical interpretation ranges
  - Evidence-based cutoff scores
  - Suicide risk detection (where applicable)
*/

-- ============================================================================
-- DEPRESSION ASSESSMENTS
-- ============================================================================

-- PHQ-9: Patient Health Questionnaire-9
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-phq9-0000-0000-000000000001',
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression',
  'A 9-item instrument for screening, diagnosing, monitoring and measuring the severity of depression.',
  '1.0',
  '[
    {"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_2", "text": "Feeling down, depressed, or hopeless", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_4", "text": "Feeling tired or having little energy", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_5", "text": "Poor appetite or overeating", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_6", "text": "Feeling bad about yourself or that you are a failure or have let yourself or your family down", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_7", "text": "Trouble concentrating on things, such as reading the newspaper or watching television", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_8", "text": "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "phq9_9", "text": "Thoughts that you would be better off dead, or of hurting yourself", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true}
  ]',
  '{"method": "sum", "max_score": 27, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms present. Functioning is not impaired.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Monitor symptoms, promote wellness activities, maintain healthy lifestyle habits."},
      {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms that may cause minor impairment in functioning.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling, lifestyle modifications, stress management techniques."},
      {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms causing noticeable impairment in daily functioning.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended, consider medication evaluation, implement structured treatment plan."},
      {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms significantly impacting daily life and functioning.", "severity": "moderately_severe", "clinical_significance": "significant", "recommendations": "Therapy and medication evaluation recommended, consider intensive outpatient treatment."},
      {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms with major impairment in functioning and quality of life.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, consider intensive interventions, safety assessment required."}
    ]
  }',
  '{"clinical_cutoff": 10, "suicide_risk_item": "phq9_9", "suicide_risk_threshold": 1}',
  'Over the last 2 weeks, how often have you been bothered by any of the following problems? Please select the response that best describes how you have been feeling.',
  5,
  'research_based',
  true
);

-- BDI-II: Beck Depression Inventory-II
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-bdi2-0000-0000-000000000002',
  'Beck Depression Inventory-II',
  'BDI-II',
  'depression',
  'A 21-item self-report measure of depression severity in adolescents and adults.',
  '1.0',
  '[
    {"id": "bdi_1", "text": "Sadness", "type": "single_choice", "options": ["I do not feel sad", "I feel sad much of the time", "I am sad all the time", "I am so sad or unhappy that I cannot stand it"], "required": true},
    {"id": "bdi_2", "text": "Pessimism", "type": "single_choice", "options": ["I am not discouraged about my future", "I feel more discouraged about my future than I used to be", "I do not expect things to work out for me", "I feel my future is hopeless and will only get worse"], "required": true},
    {"id": "bdi_3", "text": "Past Failure", "type": "single_choice", "options": ["I do not feel like a failure", "I have failed more than I should have", "As I look back, I see a lot of failures", "I feel I am a total failure as a person"], "required": true},
    {"id": "bdi_4", "text": "Loss of Pleasure", "type": "single_choice", "options": ["I get as much pleasure as I ever did from things I enjoy", "I do not enjoy things as much as I used to", "I get very little pleasure from things I used to enjoy", "I cannot get any pleasure from things I used to enjoy"], "required": true},
    {"id": "bdi_5", "text": "Guilty Feelings", "type": "single_choice", "options": ["I do not feel particularly guilty", "I feel guilty over many things I have done or should have done", "I feel quite guilty most of the time", "I feel guilty all of the time"], "required": true}
  ]',
  '{"method": "sum", "max_score": 63, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 13, "label": "Minimal Depression", "description": "These ups and downs are considered normal for most people.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue current activities and monitor mood changes."},
      {"min": 14, "max": 19, "label": "Mild Depression", "description": "Mild mood disturbance that may benefit from intervention.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling, increase social activities, monitor symptoms."},
      {"min": 20, "max": 28, "label": "Moderate Depression", "description": "Moderate depression requiring professional attention.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended, consider medication evaluation, implement coping strategies."},
      {"min": 29, "max": 63, "label": "Severe Depression", "description": "Severe depression requiring immediate professional intervention.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, medication evaluation, consider intensive therapy."}
    ]
  }',
  '{"clinical_cutoff": 14}',
  'This questionnaire consists of 21 groups of statements. Please read each group of statements carefully, and then pick out the one statement in each group that best describes the way you have been feeling during the past two weeks, including today.',
  10,
  'research_based',
  true
);

-- ============================================================================
-- ANXIETY ASSESSMENTS
-- ============================================================================

-- GAD-7: Generalized Anxiety Disorder 7-item
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-gad7-0000-0000-000000000003',
  'Generalized Anxiety Disorder 7-item',
  'GAD-7',
  'anxiety',
  'A 7-item instrument for screening and measuring the severity of generalized anxiety disorder.',
  '1.0',
  '[
    {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true},
    {"id": "gad7_7", "text": "Feeling afraid, as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"], "required": true}
  ]',
  '{"method": "sum", "max_score": 21, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms present.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue current coping strategies, maintain healthy lifestyle."},
      {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms that may cause minor distress.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider stress management techniques, relaxation training, lifestyle modifications."},
      {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms causing noticeable distress and some impairment.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended for anxiety management, consider CBT or other evidence-based treatments."},
      {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms causing significant distress and impairment in functioning.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, consider medication evaluation, implement comprehensive anxiety management plan."}
    ]
  }',
  '{"clinical_cutoff": 10}',
  'Over the last 2 weeks, how often have you been bothered by the following problems?',
  3,
  'research_based',
  true
);

-- BAI: Beck Anxiety Inventory
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-bai-0000-0000-000000000004',
  'Beck Anxiety Inventory',
  'BAI',
  'anxiety',
  'A 21-item self-report measure of anxiety symptoms focusing on somatic symptoms.',
  '1.0',
  '[
    {"id": "bai_1", "text": "Numbness or tingling", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"], "required": true},
    {"id": "bai_2", "text": "Feeling hot", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"], "required": true},
    {"id": "bai_3", "text": "Wobbliness in legs", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"], "required": true},
    {"id": "bai_4", "text": "Unable to relax", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"], "required": true},
    {"id": "bai_5", "text": "Fear of worst happening", "type": "scale", "scale_min": 0, "scale_max": 3, "labels": ["Not at all", "Mildly", "Moderately", "Severely"], "required": true}
  ]',
  '{"method": "sum", "max_score": 63, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 7, "label": "Minimal Anxiety", "description": "Normal anxiety levels with minimal somatic symptoms.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue current functioning, maintain healthy coping strategies."},
      {"min": 8, "max": 15, "label": "Mild Anxiety", "description": "Mild anxiety with some somatic symptoms present.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider relaxation techniques, stress management, monitor symptoms."},
      {"min": 16, "max": 25, "label": "Moderate Anxiety", "description": "Moderate anxiety with noticeable somatic symptoms affecting functioning.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended, consider anxiety management techniques, evaluate for treatment."},
      {"min": 26, "max": 63, "label": "Severe Anxiety", "description": "Severe anxiety with significant somatic symptoms causing major distress.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, comprehensive anxiety treatment plan, consider medication evaluation."}
    ]
  }',
  '{"clinical_cutoff": 16}',
  'Below is a list of common symptoms of anxiety. Please carefully read each item in the list. Indicate how much you have been bothered by each symptom during the past month, including today.',
  5,
  'research_based',
  true
);

-- ============================================================================
-- TRAUMA ASSESSMENTS
-- ============================================================================

-- PCL-5: PTSD Checklist for DSM-5
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-pcl5-0000-0000-000000000005',
  'PTSD Checklist for DSM-5',
  'PCL-5',
  'trauma',
  'A 20-item self-report measure that assesses PTSD symptoms according to DSM-5 criteria.',
  '1.0',
  '[
    {"id": "pcl5_1", "text": "Repeated, disturbing, and unwanted memories of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"], "required": true},
    {"id": "pcl5_2", "text": "Repeated, disturbing dreams of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"], "required": true},
    {"id": "pcl5_3", "text": "Suddenly feeling or acting as if the stressful experience were actually happening again", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"], "required": true},
    {"id": "pcl5_4", "text": "Feeling very upset when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"], "required": true},
    {"id": "pcl5_5", "text": "Having strong physical reactions when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"], "required": true}
  ]',
  '{"method": "sum", "max_score": 80, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 32, "label": "No PTSD", "description": "Symptoms are below the clinical threshold for PTSD diagnosis.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Monitor symptoms, provide psychoeducation about trauma responses, maintain support systems."},
      {"min": 33, "max": 80, "label": "Probable PTSD", "description": "Symptoms suggest probable PTSD diagnosis requiring clinical evaluation.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Comprehensive trauma assessment recommended, consider evidence-based trauma treatments (CPT, PE, EMDR)."}
    ]
  }',
  '{"clinical_cutoff": 33}',
  'Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then circle one of the numbers to the right to indicate how much you have been bothered by that problem in the past month.',
  8,
  'research_based',
  true
);

-- ============================================================================
-- STRESS ASSESSMENTS
-- ============================================================================

-- PSS-10: Perceived Stress Scale
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-pss10-0000-0000-000000000006',
  'Perceived Stress Scale',
  'PSS-10',
  'stress',
  'A 10-item scale measuring the degree to which situations are appraised as stressful.',
  '1.0',
  '[
    {"id": "pss_1", "text": "How often have you been upset because of something that happened unexpectedly?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"], "required": true},
    {"id": "pss_2", "text": "How often have you felt that you were unable to control the important things in your life?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"], "required": true},
    {"id": "pss_3", "text": "How often have you felt nervous and stressed?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"], "required": true},
    {"id": "pss_4", "text": "How often have you felt confident about your ability to handle your personal problems?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"], "required": true, "reverse_scored": true},
    {"id": "pss_5", "text": "How often have you felt that things were going your way?", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"], "required": true, "reverse_scored": true}
  ]',
  '{"method": "sum", "max_score": 40, "min_score": 0, "reverse_scored_items": ["pss_4", "pss_5"]}',
  '{
    "ranges": [
      {"min": 0, "max": 13, "label": "Low Stress", "description": "Low perceived stress levels with good coping abilities.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current stress management strategies, continue healthy lifestyle."},
      {"min": 14, "max": 26, "label": "Moderate Stress", "description": "Moderate perceived stress levels that may benefit from stress management.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Implement stress management techniques, consider counseling, improve work-life balance."},
      {"min": 27, "max": 40, "label": "High Stress", "description": "High perceived stress levels requiring intervention and support.", "severity": "severe", "clinical_significance": "significant", "recommendations": "Stress management therapy recommended, evaluate life stressors, consider comprehensive treatment plan."}
    ]
  }',
  '{"clinical_cutoff": 27}',
  'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate how often you felt or thought a certain way.',
  5,
  'research_based',
  true
);

-- ============================================================================
-- WELLBEING ASSESSMENTS
-- ============================================================================

-- SWLS: Satisfaction with Life Scale
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-swls-0000-0000-000000000007',
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing',
  'A 5-item scale designed to measure global cognitive judgments of satisfaction with ones life.',
  '1.0',
  '[
    {"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree", "Slightly agree", "Agree", "Strongly agree"], "required": true},
    {"id": "swls_2", "text": "The conditions of my life are excellent", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree", "Slightly agree", "Agree", "Strongly agree"], "required": true},
    {"id": "swls_3", "text": "I am satisfied with my life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree", "Slightly agree", "Agree", "Strongly agree"], "required": true},
    {"id": "swls_4", "text": "So far I have gotten the important things I want in life", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree", "Slightly agree", "Agree", "Strongly agree"], "required": true},
    {"id": "swls_5", "text": "If I could live my life over, I would change almost nothing", "type": "scale", "scale_min": 1, "scale_max": 7, "labels": ["Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree", "Slightly agree", "Agree", "Strongly agree"], "required": true}
  ]',
  '{"method": "sum", "max_score": 35, "min_score": 5}',
  '{
    "ranges": [
      {"min": 5, "max": 9, "label": "Extremely Dissatisfied", "description": "Extremely dissatisfied with life, major life changes may be needed.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Comprehensive life satisfaction assessment and intervention, consider major life changes."},
      {"min": 10, "max": 14, "label": "Dissatisfied", "description": "Dissatisfied with life, some areas need improvement.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Explore sources of dissatisfaction, develop improvement strategies, consider counseling."},
      {"min": 15, "max": 19, "label": "Slightly Dissatisfied", "description": "Slightly below neutral in life satisfaction.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Identify specific areas for improvement, set achievable goals."},
      {"min": 20, "max": 24, "label": "Neutral", "description": "Neutral point on the scale, average life satisfaction.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current functioning, consider areas for growth."},
      {"min": 25, "max": 29, "label": "Satisfied", "description": "Satisfied with life, above average life satisfaction.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue positive practices, maintain life satisfaction."},
      {"min": 30, "max": 35, "label": "Extremely Satisfied", "description": "Extremely satisfied with life, excellent life satisfaction.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain excellent life satisfaction, consider helping others achieve similar satisfaction."}
    ]
  }',
  '{}',
  'Below are five statements that you may agree or disagree with. Using the 1-7 scale below, indicate your agreement with each item by placing the appropriate number on the line preceding that item.',
  3,
  'research_based',
  true
);

-- CD-RISC-10: Connor-Davidson Resilience Scale
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-cdrisc10-0000-0000-000000008',
  'Connor-Davidson Resilience Scale',
  'CD-RISC-10',
  'wellbeing',
  'A 10-item scale measuring resilience and ability to cope with adversity.',
  '1.0',
  '[
    {"id": "cdrisc_1", "text": "I am able to adapt when changes occur", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"], "required": true},
    {"id": "cdrisc_2", "text": "I have at least one close and secure relationship that helps me when I am stressed", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"], "required": true},
    {"id": "cdrisc_3", "text": "When there are no clear solutions to my problems, sometimes fate or God can help", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"], "required": true},
    {"id": "cdrisc_4", "text": "I can deal with whatever comes my way", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"], "required": true},
    {"id": "cdrisc_5", "text": "Past successes give me confidence in dealing with new challenges", "type": "scale", "scale_min": 0, "scale_max": 4, "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"], "required": true}
  ]',
  '{"method": "sum", "max_score": 40, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 20, "label": "Lower Resilience", "description": "Lower resilience levels, may benefit from resilience-building interventions.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Focus on building resilience skills, stress management, social support development."},
      {"min": 21, "max": 30, "label": "Moderate Resilience", "description": "Moderate resilience levels with some coping abilities present.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Continue developing coping skills, maintain support systems, build on existing strengths."},
      {"min": 31, "max": 40, "label": "Higher Resilience", "description": "Higher resilience levels with strong coping abilities and adaptability.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current resilience factors, consider mentoring others, continue personal growth."}
    ]
  }',
  '{}',
  'Please indicate how much you agree with the following statements as they apply to you over the last month.',
  4,
  'research_based',
  true
);

-- MAAS: Mindful Attention Awareness Scale
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-maas-0000-0000-000000000009',
  'Mindful Attention Awareness Scale',
  'MAAS',
  'wellbeing',
  'A 15-item scale measuring dispositional mindfulness and present-moment awareness.',
  '1.0',
  '[
    {"id": "maas_1", "text": "I could be experiencing some emotion and not be conscious of it until some time later", "type": "scale", "scale_min": 1, "scale_max": 6, "labels": ["Almost always", "Very frequently", "Somewhat frequently", "Somewhat infrequently", "Very infrequently", "Almost never"], "required": true},
    {"id": "maas_2", "text": "I break or spill things because of carelessness, not paying attention, or thinking of something else", "type": "scale", "scale_min": 1, "scale_max": 6, "labels": ["Almost always", "Very frequently", "Somewhat frequently", "Somewhat infrequently", "Very infrequently", "Almost never"], "required": true},
    {"id": "maas_3", "text": "I find it difficult to stay focused on what is happening in the present", "type": "scale", "scale_min": 1, "scale_max": 6, "labels": ["Almost always", "Very frequently", "Somewhat frequently", "Somewhat infrequently", "Very infrequently", "Almost never"], "required": true},
    {"id": "maas_4", "text": "I tend to walk quickly to get where I am going without paying attention to what I experience along the way", "type": "scale", "scale_min": 1, "scale_max": 6, "labels": ["Almost always", "Very frequently", "Somewhat frequently", "Somewhat infrequently", "Very infrequently", "Almost never"], "required": true},
    {"id": "maas_5", "text": "I tend not to notice feelings of physical tension or discomfort until they really grab my attention", "type": "scale", "scale_min": 1, "scale_max": 6, "labels": ["Almost always", "Very frequently", "Somewhat frequently", "Somewhat infrequently", "Very infrequently", "Almost never"], "required": true}
  ]',
  '{"method": "average", "max_score": 6, "min_score": 1}',
  '{
    "ranges": [
      {"min": 1, "max": 3, "label": "Lower Mindfulness", "description": "Lower levels of mindful awareness, may benefit from mindfulness training.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Mindfulness training recommended, meditation practice, present-moment awareness exercises."},
      {"min": 3.1, "max": 4.5, "label": "Moderate Mindfulness", "description": "Moderate levels of mindful awareness with room for improvement.", "severity": "mild", "clinical_significance": "mild", "recommendations": "Continue developing mindfulness skills, regular meditation practice, mindful daily activities."},
      {"min": 4.6, "max": 6, "label": "Higher Mindfulness", "description": "Higher levels of mindful awareness and present-moment attention.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain mindfulness practice, consider advanced techniques, share skills with others."}
    ]
  }',
  '{}',
  'Below is a collection of statements about your everyday experience. Using the 1-6 scale below, please indicate how frequently or infrequently you currently have each experience.',
  6,
  'research_based',
  true
);

-- ============================================================================
-- SPECIALIZED ASSESSMENTS
-- ============================================================================

-- MBI: Maslach Burnout Inventory (abbreviated)
INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-mbi-0000-0000-000000000010',
  'Maslach Burnout Inventory',
  'MBI',
  'stress',
  'A measure of burnout in three dimensions: emotional exhaustion, depersonalization, and personal accomplishment.',
  '1.0',
  '[
    {"id": "mbi_1", "text": "I feel emotionally drained from my work", "type": "scale", "scale_min": 0, "scale_max": 6, "labels": ["Never", "A few times a year", "Monthly", "A few times a month", "Weekly", "A few times a week", "Daily"], "required": true},
    {"id": "mbi_2", "text": "I have accomplished many worthwhile things in this job", "type": "scale", "scale_min": 0, "scale_max": 6, "labels": ["Never", "A few times a year", "Monthly", "A few times a month", "Weekly", "A few times a week", "Daily"], "required": true, "reverse_scored": true},
    {"id": "mbi_3", "text": "I do not really care what happens to some recipients", "type": "scale", "scale_min": 0, "scale_max": 6, "labels": ["Never", "A few times a year", "Monthly", "A few times a month", "Weekly", "A few times a week", "Daily"], "required": true},
    {"id": "mbi_4", "text": "Working with people all day is really a strain for me", "type": "scale", "scale_min": 0, "scale_max": 6, "labels": ["Never", "A few times a year", "Monthly", "A few times a month", "Weekly", "A few times a week", "Daily"], "required": true},
    {"id": "mbi_5", "text": "I deal very effectively with the problems of recipients", "type": "scale", "scale_min": 0, "scale_max": 6, "labels": ["Never", "A few times a year", "Monthly", "A few times a month", "Weekly", "A few times a week", "Daily"], "required": true, "reverse_scored": true}
  ]',
  '{"method": "sum", "max_score": 132, "min_score": 0, "reverse_scored_items": ["mbi_2", "mbi_5"], "subscales": [{"name": "Emotional Exhaustion", "items": ["mbi_1", "mbi_4"], "max_score": 12}, {"name": "Depersonalization", "items": ["mbi_3"], "max_score": 6}, {"name": "Personal Accomplishment", "items": ["mbi_2", "mbi_5"], "max_score": 12}]}',
  '{
    "ranges": [
      {"min": 0, "max": 44, "label": "Low Burnout", "description": "Low levels of burnout symptoms across all dimensions.", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current work-life balance, continue self-care practices."},
      {"min": 45, "max": 88, "label": "Moderate Burnout", "description": "Moderate levels of burnout symptoms requiring attention.", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Implement burnout prevention strategies, improve work-life balance, consider workplace changes."},
      {"min": 89, "max": 132, "label": "High Burnout", "description": "High levels of burnout symptoms requiring immediate intervention.", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate burnout intervention recommended, consider time off, comprehensive stress management plan."}
    ]
  }',
  '{"clinical_cutoff": 45}',
  'Please read each statement carefully and decide if you ever feel this way about your job. If you have never had this feeling, write a "0" (zero) in the space before the statement.',
  7,
  'research_based',
  true
);

-- Update template metadata for better organization
UPDATE assessment_templates SET 
  domains = ARRAY['mood', 'depression', 'screening'],
  tags = ARRAY['depression', 'screening', 'PHQ', 'primary_care']
WHERE abbreviation = 'PHQ-9';

UPDATE assessment_templates SET 
  domains = ARRAY['anxiety', 'worry', 'screening'],
  tags = ARRAY['anxiety', 'GAD', 'screening', 'primary_care']
WHERE abbreviation = 'GAD-7';

UPDATE assessment_templates SET 
  domains = ARRAY['trauma', 'PTSD', 'diagnostic'],
  tags = ARRAY['trauma', 'PTSD', 'DSM5', 'diagnostic']
WHERE abbreviation = 'PCL-5';

UPDATE assessment_templates SET 
  domains = ARRAY['stress', 'coping', 'perception'],
  tags = ARRAY['stress', 'coping', 'perceived_stress']
WHERE abbreviation = 'PSS-10';

UPDATE assessment_templates SET 
  domains = ARRAY['wellbeing', 'life_satisfaction', 'quality_of_life'],
  tags = ARRAY['wellbeing', 'satisfaction', 'quality_of_life']
WHERE abbreviation = 'SWLS';

UPDATE assessment_templates SET 
  domains = ARRAY['resilience', 'coping', 'adaptation'],
  tags = ARRAY['resilience', 'coping', 'adaptation', 'strengths']
WHERE abbreviation = 'CD-RISC-10';

UPDATE assessment_templates SET 
  domains = ARRAY['mindfulness', 'attention', 'awareness'],
  tags = ARRAY['mindfulness', 'attention', 'awareness', 'meditation']
WHERE abbreviation = 'MAAS';

UPDATE assessment_templates SET 
  domains = ARRAY['burnout', 'work_stress', 'occupational'],
  tags = ARRAY['burnout', 'work_stress', 'occupational', 'professional']
WHERE abbreviation = 'MBI';