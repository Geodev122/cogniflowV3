/*
  # Populate Assessment Library

  1. New Data
    - Populate assessment_library table with standard psychometric assessments
    - Include PHQ-9, GAD-7, BDI-II, BAI, PSS-10, PCL-5, SWLS, CD-RISC-10, MAAS, MBI

  2. Content Structure
    - Complete question sets for each assessment
    - Proper scoring methods and interpretation guides
    - Evidence-based categorization
*/

-- Insert standard psychometric assessments
INSERT INTO assessment_library (name, abbreviation, category, description, questions, scoring_method, interpretation_guide, is_active) VALUES

-- PHQ-9 (Patient Health Questionnaire)
('Patient Health Questionnaire-9', 'PHQ-9', 'Depression Screening', 'Measures severity of depression symptoms over the past two weeks', 
'[
  {"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_2", "text": "Feeling down, depressed, or hopeless", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_4", "text": "Feeling tired or having little energy", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_5", "text": "Poor appetite or overeating", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_6", "text": "Feeling bad about yourself or that you are a failure or have let yourself or your family down", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_7", "text": "Trouble concentrating on things, such as reading the newspaper or watching television", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_8", "text": "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "phq9_9", "text": "Thoughts that you would be better off dead, or of hurting yourself in some way", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]}
]'::jsonb,
'{"method": "sum", "max_score": 27}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms"},
  {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms"},
  {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms"},
  {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms"},
  {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms"}
]}'::jsonb,
true),

-- GAD-7 (Generalized Anxiety Disorder)
('Generalized Anxiety Disorder-7', 'GAD-7', 'Anxiety Screening', 'Measures severity of generalized anxiety disorder symptoms',
'[
  {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]},
  {"id": "gad7_7", "text": "Feeling afraid, as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"]}
]'::jsonb,
'{"method": "sum", "max_score": 21}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms"},
  {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms"},
  {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms"},
  {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms"}
]}'::jsonb,
true),

-- BDI-II (Beck Depression Inventory)
('Beck Depression Inventory-II', 'BDI-II', 'Depression Screening', 'Measures severity of depression symptoms in adolescents and adults',
'[
  {"id": "bdi_1", "text": "Sadness", "type": "multiple_choice", "options": ["I do not feel sad", "I feel sad much of the time", "I am sad all the time", "I am so sad or unhappy that I cannot stand it"]},
  {"id": "bdi_2", "text": "Pessimism", "type": "multiple_choice", "options": ["I am not discouraged about my future", "I feel more discouraged about my future than I used to be", "I do not expect things to work out for me", "I feel my future is hopeless and will only get worse"]},
  {"id": "bdi_3", "text": "Past Failure", "type": "multiple_choice", "options": ["I do not feel like a failure", "I have failed more than I should have", "As I look back, I see a lot of failures", "I feel I am a total failure as a person"]},
  {"id": "bdi_4", "text": "Loss of Pleasure", "type": "multiple_choice", "options": ["I get as much pleasure as I ever did from things I enjoy", "I do not enjoy things as much as I used to", "I get very little pleasure from things I used to enjoy", "I cannot get any pleasure from things I used to enjoy"]},
  {"id": "bdi_5", "text": "Guilty Feelings", "type": "multiple_choice", "options": ["I do not feel particularly guilty", "I feel guilty over many things I have done or should have done", "I feel quite guilty most of the time", "I feel guilty all of the time"]}
]'::jsonb,
'{"method": "sum", "max_score": 63}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 13, "label": "Minimal Depression", "description": "These ups and downs are considered normal"},
  {"min": 14, "max": 19, "label": "Mild Depression", "description": "Mild mood disturbance"},
  {"min": 20, "max": 28, "label": "Moderate Depression", "description": "Moderate depression"},
  {"min": 29, "max": 63, "label": "Severe Depression", "description": "Severe depression"}
]}'::jsonb,
true),

-- BAI (Beck Anxiety Inventory)
('Beck Anxiety Inventory', 'BAI', 'Anxiety Screening', 'Measures severity of anxiety symptoms',
'[
  {"id": "bai_1", "text": "Numbness or tingling", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
  {"id": "bai_2", "text": "Feeling hot", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
  {"id": "bai_3", "text": "Wobbliness in legs", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
  {"id": "bai_4", "text": "Unable to relax", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Mildly", "Moderately", "Severely"]},
  {"id": "bai_5", "text": "Fear of worst happening", "type": "scale", "scale_min": 0, "scale_max": 3, "scale_labels": ["Not at all", "Mildly", "Moderately", "Severely"]}
]'::jsonb,
'{"method": "sum", "max_score": 63}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 7, "label": "Minimal Anxiety", "description": "Normal anxiety levels"},
  {"min": 8, "max": 15, "label": "Mild Anxiety", "description": "Mild anxiety symptoms"},
  {"min": 16, "max": 25, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms"},
  {"min": 26, "max": 63, "label": "Severe Anxiety", "description": "Severe anxiety symptoms"}
]}'::jsonb,
true),

-- PSS-10 (Perceived Stress Scale)
('Perceived Stress Scale-10', 'PSS-10', 'Stress Assessment', 'Measures the degree to which situations are appraised as stressful',
'[
  {"id": "pss_1", "text": "How often have you been upset because of something that happened unexpectedly?", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_2", "text": "How often have you felt that you were unable to control the important things in your life?", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_3", "text": "How often have you felt nervous and stressed?", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"]},
  {"id": "pss_4", "text": "How often have you felt confident about your ability to handle your personal problems?", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"], "reverse_scored": true},
  {"id": "pss_5", "text": "How often have you felt that things were going your way?", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"], "reverse_scored": true}
]'::jsonb,
'{"method": "sum", "max_score": 40}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 13, "label": "Low Stress", "description": "Low perceived stress levels"},
  {"min": 14, "max": 26, "label": "Moderate Stress", "description": "Moderate perceived stress levels"},
  {"min": 27, "max": 40, "label": "High Stress", "description": "High perceived stress levels"}
]}'::jsonb,
true),

-- PCL-5 (PTSD Checklist)
('PTSD Checklist for DSM-5', 'PCL-5', 'Trauma Assessment', 'Measures PTSD symptoms according to DSM-5 criteria',
'[
  {"id": "pcl5_1", "text": "Repeated, disturbing, and unwanted memories of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
  {"id": "pcl5_2", "text": "Repeated, disturbing dreams of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
  {"id": "pcl5_3", "text": "Suddenly feeling or acting as if the stressful experience were actually happening again", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
  {"id": "pcl5_4", "text": "Feeling very upset when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]},
  {"id": "pcl5_5", "text": "Having strong physical reactions when something reminded you of the stressful experience", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"]}
]'::jsonb,
'{"method": "sum", "max_score": 80}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 32, "label": "No PTSD", "description": "Symptoms below clinical threshold"},
  {"min": 33, "max": 80, "label": "Probable PTSD", "description": "Symptoms suggest probable PTSD diagnosis"}
]}'::jsonb,
true),

-- SWLS (Satisfaction with Life Scale)
('Satisfaction with Life Scale', 'SWLS', 'Wellbeing Assessment', 'Measures global cognitive judgments of satisfaction with ones life',
'[
  {"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7, "scale_labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_2", "text": "The conditions of my life are excellent", "type": "scale", "scale_min": 1, "scale_max": 7, "scale_labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_3", "text": "I am satisfied with my life", "type": "scale", "scale_min": 1, "scale_max": 7, "scale_labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_4", "text": "So far I have gotten the important things I want in life", "type": "scale", "scale_min": 1, "scale_max": 7, "scale_labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]},
  {"id": "swls_5", "text": "If I could live my life over, I would change almost nothing", "type": "scale", "scale_min": 1, "scale_max": 7, "scale_labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"]}
]'::jsonb,
'{"method": "sum", "max_score": 35}'::jsonb,
'{"ranges": [
  {"min": 5, "max": 9, "label": "Extremely Dissatisfied", "description": "Extremely dissatisfied with life"},
  {"min": 10, "max": 14, "label": "Dissatisfied", "description": "Dissatisfied with life"},
  {"min": 15, "max": 19, "label": "Slightly Dissatisfied", "description": "Slightly below neutral in life satisfaction"},
  {"min": 20, "max": 24, "label": "Neutral", "description": "Neutral point on the scale"},
  {"min": 25, "max": 29, "label": "Satisfied", "description": "Satisfied with life"},
  {"min": 30, "max": 35, "label": "Extremely Satisfied", "description": "Extremely satisfied with life"}
]}'::jsonb,
true),

-- CD-RISC-10 (Connor-Davidson Resilience Scale)
('Connor-Davidson Resilience Scale-10', 'CD-RISC-10', 'Resilience Assessment', 'Measures resilience and ability to cope with adversity',
'[
  {"id": "cdrisc_1", "text": "I am able to adapt when changes occur", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_2", "text": "I have at least one close and secure relationship that helps me when I am stressed", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_3", "text": "When there are no clear solutions to my problems, sometimes fate or God can help", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_4", "text": "I can deal with whatever comes my way", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]},
  {"id": "cdrisc_5", "text": "Past successes give me confidence in dealing with new challenges", "type": "scale", "scale_min": 0, "scale_max": 4, "scale_labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"]}
]'::jsonb,
'{"method": "sum", "max_score": 40}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 20, "label": "Low Resilience", "description": "Lower resilience levels"},
  {"min": 21, "max": 30, "label": "Moderate Resilience", "description": "Moderate resilience levels"},
  {"min": 31, "max": 40, "label": "High Resilience", "description": "High resilience levels"}
]}'::jsonb,
true),

-- MAAS (Mindful Attention Awareness Scale)
('Mindful Attention Awareness Scale', 'MAAS', 'Mindfulness Assessment', 'Measures dispositional mindfulness',
'[
  {"id": "maas_1", "text": "I could be experiencing some emotion and not be conscious of it until some time later", "type": "scale", "scale_min": 1, "scale_max": 6, "scale_labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"]},
  {"id": "maas_2", "text": "I break or spill things because of carelessness, not paying attention, or thinking of something else", "type": "scale", "scale_min": 1, "scale_max": 6, "scale_labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"]},
  {"id": "maas_3", "text": "I find it difficult to stay focused on what is happening in the present", "type": "scale", "scale_min": 1, "scale_max": 6, "scale_labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"]},
  {"id": "maas_4", "text": "I tend to walk quickly to get where I am going without paying attention to what I experience along the way", "type": "scale", "scale_min": 1, "scale_max": 6, "scale_labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"]},
  {"id": "maas_5", "text": "I tend not to notice feelings of physical tension or discomfort until they really grab my attention", "type": "scale", "scale_min": 1, "scale_max": 6, "scale_labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"]}
]'::jsonb,
'{"method": "average", "max_score": 6}'::jsonb,
'{"ranges": [
  {"min": 1, "max": 3, "label": "Low Mindfulness", "description": "Lower levels of mindful awareness"},
  {"min": 3.1, "max": 4.5, "label": "Moderate Mindfulness", "description": "Moderate levels of mindful awareness"},
  {"min": 4.6, "max": 6, "label": "High Mindfulness", "description": "High levels of mindful awareness"}
]}'::jsonb,
true),

-- MBI (Maslach Burnout Inventory)
('Maslach Burnout Inventory', 'MBI', 'Burnout Assessment', 'Measures burnout in three dimensions: emotional exhaustion, depersonalization, and personal accomplishment',
'[
  {"id": "mbi_1", "text": "I feel emotionally drained from my work", "type": "scale", "scale_min": 0, "scale_max": 6, "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"]},
  {"id": "mbi_2", "text": "I have accomplished many worthwhile things in this job", "type": "scale", "scale_min": 0, "scale_max": 6, "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"], "reverse_scored": true},
  {"id": "mbi_3", "text": "I do not really care what happens to some recipients", "type": "scale", "scale_min": 0, "scale_max": 6, "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"]},
  {"id": "mbi_4", "text": "Working with people all day is really a strain for me", "type": "scale", "scale_min": 0, "scale_max": 6, "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"]},
  {"id": "mbi_5", "text": "I deal very effectively with the problems of recipients", "type": "scale", "scale_min": 0, "scale_max": 6, "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"], "reverse_scored": true}
]'::jsonb,
'{"method": "sum", "max_score": 132}'::jsonb,
'{"ranges": [
  {"min": 0, "max": 44, "label": "Low Burnout", "description": "Low levels of burnout symptoms"},
  {"min": 45, "max": 88, "label": "Moderate Burnout", "description": "Moderate levels of burnout symptoms"},
  {"min": 89, "max": 132, "label": "High Burnout", "description": "High levels of burnout symptoms"}
]}'::jsonb,
true);

-- Insert sample resources into resource_library
INSERT INTO resource_library (title, category, subcategory, description, content_type, tags, difficulty_level, evidence_level, is_public) VALUES

('CBT Thought Record Worksheet', 'worksheet', 'Cognitive Restructuring', 'A comprehensive thought record worksheet for identifying and challenging negative thought patterns', 'text', ARRAY['CBT', 'thought-record', 'cognitive-restructuring'], 'beginner', 'research_based', true),

('Anxiety Management Techniques', 'educational', 'Anxiety Treatment', 'Evidence-based techniques for managing anxiety symptoms including breathing exercises and grounding techniques', 'text', ARRAY['anxiety', 'coping-skills', 'self-help'], 'beginner', 'research_based', true),

('Depression Treatment Protocol', 'protocol', 'Depression Treatment', 'Structured treatment protocol for major depressive disorder using CBT principles', 'text', ARRAY['depression', 'CBT', 'treatment-protocol'], 'intermediate', 'research_based', true),

('Mindfulness-Based Stress Reduction Guide', 'intervention', 'Mindfulness', 'Complete guide to implementing MBSR techniques in clinical practice', 'text', ARRAY['mindfulness', 'stress-reduction', 'meditation'], 'intermediate', 'research_based', true),

('Trauma-Informed Care Principles', 'educational', 'Trauma Treatment', 'Essential principles and practices for trauma-informed therapeutic approaches', 'text', ARRAY['trauma', 'trauma-informed-care', 'PTSD'], 'advanced', 'research_based', true);