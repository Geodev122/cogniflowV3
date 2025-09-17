/*
  # Populate Assessment Templates with Standard Instruments
  
  1. Depression Assessments
    - PHQ-9 (Patient Health Questionnaire)
    - BDI-II (Beck Depression Inventory)
    
  2. Anxiety Assessments  
    - GAD-7 (Generalized Anxiety Disorder)
    - BAI (Beck Anxiety Inventory)
    
  3. Trauma Assessments
    - PCL-5 (PTSD Checklist for DSM-5)
    
  4. Wellbeing Assessments
    - SWLS (Satisfaction with Life Scale)
    - CD-RISC-10 (Connor-Davidson Resilience Scale)
    - MAAS (Mindful Attention Awareness Scale)
    
  5. Stress and Burnout
    - PSS-10 (Perceived Stress Scale)
    - MBI (Maslach Burnout Inventory)
*/

-- ============================================================================
-- PHQ-9 (Patient Health Questionnaire-9)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-phq9-standard-v1',
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression',
  'A 9-item instrument for screening, diagnosing, monitoring and measuring the severity of depression.',
  '1.0',
  '[
    {
      "id": "phq9_1",
      "text": "Little interest or pleasure in doing things",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_2", 
      "text": "Feeling down, depressed, or hopeless",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_3",
      "text": "Trouble falling or staying asleep, or sleeping too much", 
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_4",
      "text": "Feeling tired or having little energy",
      "type": "scale", 
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_5",
      "text": "Poor appetite or overeating",
      "type": "scale",
      "scale_min": 0, 
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_6",
      "text": "Feeling bad about yourself or that you are a failure or have let yourself or your family down",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_7",
      "text": "Trouble concentrating on things, such as reading the newspaper or watching television",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_8",
      "text": "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "phq9_9",
      "text": "Thoughts that you would be better off dead, or of hurting yourself",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 27,
    "min_score": 0,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 4,
        "label": "Minimal Depression",
        "description": "No or minimal depression symptoms present. Normal mood fluctuations.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Continue current wellness activities. Monitor for changes."
      },
      {
        "min": 5, "max": 9,
        "label": "Mild Depression", 
        "description": "Mild depression symptoms that may interfere with daily activities.",
        "severity": "mild",
        "clinical_significance": "mild",
        "recommendations": "Consider counseling, lifestyle modifications, and stress management techniques."
      },
      {
        "min": 10, "max": 14,
        "label": "Moderate Depression",
        "description": "Moderate depression symptoms significantly impacting daily functioning.",
        "severity": "moderate", 
        "clinical_significance": "moderate",
        "recommendations": "Therapy recommended. Consider medication evaluation and comprehensive treatment planning."
      },
      {
        "min": 15, "max": 19,
        "label": "Moderately Severe Depression",
        "description": "Moderately severe depression requiring immediate attention.",
        "severity": "moderately_severe",
        "clinical_significance": "significant", 
        "recommendations": "Immediate therapy and medication evaluation recommended. Consider intensive outpatient treatment."
      },
      {
        "min": 20, "max": 27,
        "label": "Severe Depression",
        "description": "Severe depression symptoms requiring comprehensive treatment.",
        "severity": "severe",
        "clinical_significance": "severe",
        "recommendations": "Immediate comprehensive treatment required. Consider hospitalization if safety concerns present."
      }
    ]
  }',
  '{
    "clinical_cutoff": 10,
    "suicide_risk_item": "phq9_9", 
    "suicide_risk_threshold": 1,
    "optimal_range": [0, 4]
  }',
  'Over the last 2 weeks, how often have you been bothered by any of the following problems? Please select the response that best describes how you have been feeling.',
  5,
  'research_based',
  true
);

-- ============================================================================
-- GAD-7 (Generalized Anxiety Disorder 7-item)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-gad7-standard-v1',
  'Generalized Anxiety Disorder 7-item',
  'GAD-7',
  'anxiety',
  'A 7-item instrument for screening and measuring the severity of generalized anxiety disorder.',
  '1.0',
  '[
    {
      "id": "gad7_1",
      "text": "Feeling nervous, anxious, or on edge",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_2",
      "text": "Not being able to stop or control worrying",
      "type": "scale", 
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_3",
      "text": "Worrying too much about different things",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_4",
      "text": "Trouble relaxing",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_5",
      "text": "Being so restless that it is hard to sit still",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_6",
      "text": "Becoming easily annoyed or irritable",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    },
    {
      "id": "gad7_7",
      "text": "Feeling afraid, as if something awful might happen",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 3,
      "labels": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 21,
    "min_score": 0,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 4,
        "label": "Minimal Anxiety",
        "description": "No or minimal anxiety symptoms present.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Continue current coping strategies and wellness activities."
      },
      {
        "min": 5, "max": 9,
        "label": "Mild Anxiety",
        "description": "Mild anxiety symptoms that may occasionally interfere with activities.",
        "severity": "mild",
        "clinical_significance": "mild",
        "recommendations": "Consider stress management techniques and relaxation training."
      },
      {
        "min": 10, "max": 14,
        "label": "Moderate Anxiety",
        "description": "Moderate anxiety symptoms impacting daily functioning.",
        "severity": "moderate",
        "clinical_significance": "moderate", 
        "recommendations": "Therapy recommended for anxiety management. Consider CBT and relaxation techniques."
      },
      {
        "min": 15, "max": 21,
        "label": "Severe Anxiety",
        "description": "Severe anxiety symptoms requiring immediate attention.",
        "severity": "severe",
        "clinical_significance": "severe",
        "recommendations": "Immediate treatment recommended. Consider therapy and medication evaluation."
      }
    ]
  }',
  '{
    "clinical_cutoff": 10,
    "optimal_range": [0, 4]
  }',
  'Over the last 2 weeks, how often have you been bothered by the following problems?',
  3,
  'research_based',
  true
);

-- ============================================================================
-- BDI-II (Beck Depression Inventory-II)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-bdi2-standard-v1',
  'Beck Depression Inventory-II',
  'BDI-II',
  'depression',
  'A 21-item self-report measure of depression severity in adolescents and adults.',
  '2.0',
  '[
    {
      "id": "bdi_1",
      "text": "Sadness",
      "type": "single_choice",
      "options": [
        "I do not feel sad",
        "I feel sad much of the time", 
        "I am sad all the time",
        "I am so sad or unhappy that I cannot stand it"
      ],
      "required": true
    },
    {
      "id": "bdi_2",
      "text": "Pessimism",
      "type": "single_choice",
      "options": [
        "I am not discouraged about my future",
        "I feel more discouraged about my future than I used to be",
        "I do not expect things to work out for me", 
        "I feel my future is hopeless and will only get worse"
      ],
      "required": true
    },
    {
      "id": "bdi_3",
      "text": "Past Failure",
      "type": "single_choice",
      "options": [
        "I do not feel like a failure",
        "I have failed more than I should have",
        "As I look back, I see a lot of failures",
        "I feel I am a total failure as a person"
      ],
      "required": true
    },
    {
      "id": "bdi_4",
      "text": "Loss of Pleasure",
      "type": "single_choice", 
      "options": [
        "I get as much pleasure as I ever did from the things I enjoy",
        "I do not enjoy things as much as I used to",
        "I get very little pleasure from the things I used to enjoy",
        "I cannot get any pleasure from the things I used to enjoy"
      ],
      "required": true
    },
    {
      "id": "bdi_5",
      "text": "Guilty Feelings",
      "type": "single_choice",
      "options": [
        "I do not feel particularly guilty",
        "I feel guilty over many things I have done or should have done",
        "I feel quite guilty most of the time",
        "I feel guilty all of the time"
      ],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 63,
    "min_score": 0,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 13,
        "label": "Minimal Depression",
        "description": "These ups and downs are considered normal mood fluctuations.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Continue current activities and monitor mood changes."
      },
      {
        "min": 14, "max": 19,
        "label": "Mild Depression",
        "description": "Mild mood disturbance that may benefit from intervention.",
        "severity": "mild", 
        "clinical_significance": "mild",
        "recommendations": "Consider counseling and lifestyle modifications."
      },
      {
        "min": 20, "max": 28,
        "label": "Moderate Depression",
        "description": "Moderate depression requiring professional treatment.",
        "severity": "moderate",
        "clinical_significance": "moderate",
        "recommendations": "Professional treatment recommended including therapy and possible medication."
      },
      {
        "min": 29, "max": 63,
        "label": "Severe Depression", 
        "description": "Severe depression requiring immediate comprehensive treatment.",
        "severity": "severe",
        "clinical_significance": "severe",
        "recommendations": "Immediate comprehensive treatment required. Consider intensive interventions."
      }
    ]
  }',
  '{
    "clinical_cutoff": 14,
    "optimal_range": [0, 13]
  }',
  'This questionnaire consists of 21 groups of statements. Please read each group of statements carefully, and then pick out the one statement in each group that best describes the way you have been feeling during the past two weeks, including today.',
  8,
  'research_based',
  true
);

-- ============================================================================
-- SWLS (Satisfaction with Life Scale)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-swls-standard-v1',
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing',
  'A 5-item scale designed to measure global cognitive judgments of satisfaction with ones life.',
  '1.0',
  '[
    {
      "id": "swls_1",
      "text": "In most ways my life is close to my ideal",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 7,
      "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"],
      "required": true
    },
    {
      "id": "swls_2",
      "text": "The conditions of my life are excellent",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 7,
      "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"],
      "required": true
    },
    {
      "id": "swls_3",
      "text": "I am satisfied with my life",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 7,
      "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"],
      "required": true
    },
    {
      "id": "swls_4",
      "text": "So far I have gotten the important things I want in life",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 7,
      "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"],
      "required": true
    },
    {
      "id": "swls_5",
      "text": "If I could live my life over, I would change almost nothing",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 7,
      "labels": ["Strongly Disagree", "Disagree", "Slightly Disagree", "Neither Agree nor Disagree", "Slightly Agree", "Agree", "Strongly Agree"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 35,
    "min_score": 5,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 5, "max": 9,
        "label": "Extremely Dissatisfied",
        "description": "Extremely dissatisfied with life. Major life changes may be needed.",
        "severity": "severe",
        "clinical_significance": "severe",
        "recommendations": "Comprehensive life satisfaction assessment and intervention planning."
      },
      {
        "min": 10, "max": 14,
        "label": "Dissatisfied", 
        "description": "Dissatisfied with life. Several areas need improvement.",
        "severity": "moderate",
        "clinical_significance": "moderate",
        "recommendations": "Explore sources of dissatisfaction and develop improvement strategies."
      },
      {
        "min": 15, "max": 19,
        "label": "Slightly Dissatisfied",
        "description": "Slightly below neutral in life satisfaction.",
        "severity": "mild",
        "clinical_significance": "mild",
        "recommendations": "Identify specific areas for improvement and set achievable goals."
      },
      {
        "min": 20, "max": 24,
        "label": "Neutral",
        "description": "Neutral point on the satisfaction scale.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Maintain current functioning and explore opportunities for growth."
      },
      {
        "min": 25, "max": 29,
        "label": "Satisfied",
        "description": "Satisfied with life. Good overall functioning.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Continue positive practices and maintain life satisfaction."
      },
      {
        "min": 30, "max": 35,
        "label": "Extremely Satisfied",
        "description": "Extremely satisfied with life. Excellent functioning.",
        "severity": "minimal", 
        "clinical_significance": "subclinical",
        "recommendations": "Maintain excellent life satisfaction and consider sharing strategies with others."
      }
    ]
  }',
  '{}',
  'Below are five statements that you may agree or disagree with. Using the 1-7 scale below, indicate your agreement with each item by placing the appropriate number on the line preceding that item.',
  3,
  'research_based',
  true
);

-- ============================================================================
-- PSS-10 (Perceived Stress Scale)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-pss10-standard-v1',
  'Perceived Stress Scale-10',
  'PSS-10',
  'stress',
  'A 10-item scale measuring the degree to which situations in ones life are appraised as stressful.',
  '1.0',
  '[
    {
      "id": "pss_1",
      "text": "In the last month, how often have you been upset because of something that happened unexpectedly?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    },
    {
      "id": "pss_2",
      "text": "In the last month, how often have you felt that you were unable to control the important things in your life?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    },
    {
      "id": "pss_3",
      "text": "In the last month, how often have you felt nervous and stressed?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    },
    {
      "id": "pss_4",
      "text": "In the last month, how often have you felt confident about your ability to handle your personal problems?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "reverse_scored": true,
      "required": true
    },
    {
      "id": "pss_5",
      "text": "In the last month, how often have you felt that things were going your way?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "reverse_scored": true,
      "required": true
    },
    {
      "id": "pss_6",
      "text": "In the last month, how often have you found that you could not cope with all the things that you had to do?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    },
    {
      "id": "pss_7",
      "text": "In the last month, how often have you been able to control irritations in your life?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "reverse_scored": true,
      "required": true
    },
    {
      "id": "pss_8",
      "text": "In the last month, how often have you felt that you were on top of things?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "reverse_scored": true,
      "required": true
    },
    {
      "id": "pss_9",
      "text": "In the last month, how often have you been angered because of things that were outside of your control?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    },
    {
      "id": "pss_10",
      "text": "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 40,
    "min_score": 0,
    "reverse_scored_items": ["pss_4", "pss_5", "pss_7", "pss_8"]
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 13,
        "label": "Low Stress",
        "description": "Low perceived stress levels. Good coping resources.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Maintain current stress management strategies."
      },
      {
        "min": 14, "max": 26,
        "label": "Moderate Stress",
        "description": "Moderate perceived stress levels requiring attention.",
        "severity": "moderate",
        "clinical_significance": "moderate",
        "recommendations": "Develop additional stress management techniques and coping strategies."
      },
      {
        "min": 27, "max": 40,
        "label": "High Stress",
        "description": "High perceived stress levels requiring intervention.",
        "severity": "severe",
        "clinical_significance": "significant",
        "recommendations": "Immediate stress management intervention recommended. Consider therapy and lifestyle changes."
      }
    ]
  }',
  '{
    "clinical_cutoff": 20
  }',
  'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate by circling how often you felt or thought a certain way.',
  5,
  'research_based',
  true
);

-- ============================================================================
-- PCL-5 (PTSD Checklist for DSM-5) - Abbreviated Version
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-pcl5-standard-v1',
  'PTSD Checklist for DSM-5',
  'PCL-5',
  'trauma',
  'A 20-item self-report measure that assesses the 20 DSM-5 symptoms of PTSD.',
  '1.0',
  '[
    {
      "id": "pcl5_1",
      "text": "Repeated, disturbing, and unwanted memories of the stressful experience",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
      "required": true
    },
    {
      "id": "pcl5_2",
      "text": "Repeated, disturbing dreams of the stressful experience",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
      "required": true
    },
    {
      "id": "pcl5_3",
      "text": "Suddenly feeling or acting as if the stressful experience were actually happening again",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
      "required": true
    },
    {
      "id": "pcl5_4",
      "text": "Feeling very upset when something reminded you of the stressful experience",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
      "required": true
    },
    {
      "id": "pcl5_5",
      "text": "Having strong physical reactions when something reminded you of the stressful experience",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 80,
    "min_score": 0,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 32,
        "label": "Below Clinical Threshold",
        "description": "PTSD symptoms below clinical threshold.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Monitor symptoms and provide psychoeducation about trauma responses."
      },
      {
        "min": 33, "max": 80,
        "label": "Probable PTSD",
        "description": "Symptoms suggest probable PTSD diagnosis requiring clinical evaluation.",
        "severity": "severe",
        "clinical_significance": "significant",
        "recommendations": "Comprehensive trauma assessment recommended. Consider evidence-based PTSD treatments."
      }
    ]
  }',
  '{
    "clinical_cutoff": 33
  }',
  'Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then circle one of the numbers to the right to indicate how much you have been bothered by that problem in the past month.',
  7,
  'research_based',
  true
);

-- ============================================================================
-- CD-RISC-10 (Connor-Davidson Resilience Scale)
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-cdrisc10-standard-v1',
  'Connor-Davidson Resilience Scale-10',
  'CD-RISC-10',
  'wellbeing',
  'A 10-item scale that measures resilience and ability to cope with adversity.',
  '1.0',
  '[
    {
      "id": "cdrisc_1",
      "text": "I am able to adapt when changes occur",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_2",
      "text": "I have at least one close and secure relationship that helps me when I am stressed",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_3",
      "text": "When there are no clear solutions to my problems, sometimes fate or God can help",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_4",
      "text": "I can deal with whatever comes my way",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_5",
      "text": "Past successes give me confidence in dealing with new challenges",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_6",
      "text": "I see the humorous side of things",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_7",
      "text": "Having to cope with stress can make me stronger",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_8",
      "text": "I tend to bounce back after illness, injury, or other hardships",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_9",
      "text": "Things happen for a reason",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    },
    {
      "id": "cdrisc_10",
      "text": "I can achieve my goals, even when there are obstacles",
      "type": "scale",
      "scale_min": 0,
      "scale_max": 4,
      "labels": ["Not true at all", "Rarely true", "Sometimes true", "Often true", "True nearly all the time"],
      "required": true
    }
  ]',
  '{
    "method": "sum",
    "max_score": 40,
    "min_score": 0,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 0, "max": 20,
        "label": "Lower Resilience",
        "description": "Lower resilience levels that may benefit from resilience building.",
        "severity": "moderate",
        "clinical_significance": "moderate",
        "recommendations": "Focus on building resilience skills and coping strategies."
      },
      {
        "min": 21, "max": 30,
        "label": "Moderate Resilience",
        "description": "Moderate resilience levels with room for growth.",
        "severity": "mild",
        "clinical_significance": "mild",
        "recommendations": "Continue developing resilience skills and maintain support systems."
      },
      {
        "min": 31, "max": 40,
        "label": "High Resilience",
        "description": "High resilience levels indicating strong coping abilities.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Maintain current resilience practices and consider mentoring others."
      }
    ]
  }',
  '{}',
  'Please indicate how much you agree with the following statements as they apply to you over the last month.',
  4,
  'research_based',
  true
);

-- ============================================================================
-- MAAS (Mindful Attention Awareness Scale) - Short Version
-- ============================================================================

INSERT INTO assessment_templates (
  id, name, abbreviation, category, description, version,
  questions, scoring_config, interpretation_rules, clinical_cutoffs,
  instructions, estimated_duration_minutes, evidence_level, is_active
) VALUES (
  'template-maas-standard-v1',
  'Mindful Attention Awareness Scale',
  'MAAS',
  'wellbeing',
  'A 15-item scale designed to assess a core characteristic of dispositional mindfulness.',
  '1.0',
  '[
    {
      "id": "maas_1",
      "text": "I could be experiencing some emotion and not be conscious of it until some time later",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 6,
      "labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"],
      "required": true
    },
    {
      "id": "maas_2",
      "text": "I break or spill things because of carelessness, not paying attention, or thinking of something else",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 6,
      "labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"],
      "required": true
    },
    {
      "id": "maas_3",
      "text": "I find it difficult to stay focused on what is happening in the present",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 6,
      "labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"],
      "required": true
    },
    {
      "id": "maas_4",
      "text": "I tend to walk quickly to get where I am going without paying attention to what I experience along the way",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 6,
      "labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"],
      "required": true
    },
    {
      "id": "maas_5",
      "text": "I tend not to notice feelings of physical tension or discomfort until they really grab my attention",
      "type": "scale",
      "scale_min": 1,
      "scale_max": 6,
      "labels": ["Almost Always", "Very Frequently", "Somewhat Frequently", "Somewhat Infrequently", "Very Infrequently", "Almost Never"],
      "required": true
    }
  ]',
  '{
    "method": "average",
    "max_score": 6,
    "min_score": 1,
    "reverse_scored_items": []
  }',
  '{
    "ranges": [
      {
        "min": 1, "max": 3,
        "label": "Lower Mindfulness",
        "description": "Lower levels of mindful awareness in daily life.",
        "severity": "moderate",
        "clinical_significance": "moderate",
        "recommendations": "Consider mindfulness training and meditation practices."
      },
      {
        "min": 3.1, "max": 4.5,
        "label": "Moderate Mindfulness",
        "description": "Moderate levels of mindful awareness.",
        "severity": "mild",
        "clinical_significance": "mild",
        "recommendations": "Continue developing mindfulness skills through regular practice."
      },
      {
        "min": 4.6, "max": 6,
        "label": "High Mindfulness",
        "description": "High levels of mindful awareness and present-moment attention.",
        "severity": "minimal",
        "clinical_significance": "subclinical",
        "recommendations": "Maintain mindfulness practices and consider advanced techniques."
      }
    ]
  }',
  '{}',
  'Below is a collection of statements about your everyday experience. Please indicate how frequently or infrequently you currently have each experience.',
  4,
  'research_based',
  true
);