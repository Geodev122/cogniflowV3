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
BEGIN;

/* Helper: cast-safe, idempotent insert pattern:
   INSERT INTO assessment_templates(<cols>)
   SELECT <constants...>
   WHERE NOT EXISTS (SELECT 1 FROM assessment_templates WHERE abbreviation = '<ABBR>' AND version = '<VER>');
*/

-- =============================================================================
-- PHQ-9
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression'::assessment_category,
  '9-item depression screener and severity measure.',
  '1.0',
  $$[
    {"id":"phq9_1","text":"Little interest or pleasure in doing things","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_2","text":"Feeling down, depressed, or hopeless","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_3","text":"Trouble falling or staying asleep, or sleeping too much","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_4","text":"Feeling tired or having little energy","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_5","text":"Poor appetite or overeating","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_6","text":"Feeling bad about yourself — or that you are a failure or have let yourself or your family down","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_7","text":"Trouble concentrating on things, such as reading the newspaper or watching television","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_8","text":"Moving or speaking so slowly that other people could have noticed — or the opposite: being so fidgety or restless that you have been moving around a lot more than usual","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"phq9_9","text":"Thoughts that you would be better off dead, or of hurting yourself","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true}
  ]$$::jsonb,
  $${
    "method":"sum","max_score":27,"min_score":0,"reverse_scored_items":[]
  }$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":4,"label":"Minimal","description":"Minimal symptoms.","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor; continue wellness."},
      {"min":5,"max":9,"label":"Mild","description":"Mild depression.","severity":"mild","clinical_significance":"mild","recommendations":"Consider counseling / lifestyle steps."},
      {"min":10,"max":14,"label":"Moderate","description":"Moderate depression.","severity":"moderate","clinical_significance":"moderate","recommendations":"Therapy recommended; consider med eval."},
      {"min":15,"max":19,"label":"Moderately Severe","description":"Marked functional impact.","severity":"moderately_severe","clinical_significance":"significant","recommendations":"Prompt therapy + med eval; consider higher level of care."},
      {"min":20,"max":27,"label":"Severe","description":"Severe depression.","severity":"severe","clinical_significance":"severe","recommendations":"Immediate comprehensive treatment; address safety."}
    ]
  }$$::jsonb,
  $${
    "clinical_cutoff":10,
    "suicide_risk_item":"phq9_9",
    "suicide_risk_threshold":1,
    "optimal_range":[0,4]
  }$$::jsonb,
  $$Over the last 2 weeks, how often have you been bothered by the following problems?$$,
  5,
  'research_based'::evidence_level,
  true,false,
  9,
  ARRAY['depression']::text[],
  ARRAY['standard','screening']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PHQ-9' AND version='1.0');

-- =============================================================================
-- GAD-7
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Generalized Anxiety Disorder 7-item',
  'GAD-7',
  'anxiety'::assessment_category,
  '7-item anxiety screener and severity measure.',
  '1.0',
  $$[
    {"id":"gad7_1","text":"Feeling nervous, anxious, or on edge","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_2","text":"Not being able to stop or control worrying","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_3","text":"Worrying too much about different things","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_4","text":"Trouble relaxing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_5","text":"Being so restless that it is hard to sit still","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_6","text":"Becoming easily annoyed or irritable","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true},
    {"id":"gad7_7","text":"Feeling afraid as if something awful might happen","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Several days","More than half the days","Nearly every day"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":21,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":4,"label":"Minimal","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain coping skills."},
      {"min":5,"max":9,"label":"Mild","severity":"mild","clinical_significance":"mild","recommendations":"Psychoeducation; stress management."},
      {"min":10,"max":14,"label":"Moderate","severity":"moderate","clinical_significance":"moderate","recommendations":"CBT recommended."},
      {"min":15,"max":21,"label":"Severe","severity":"severe","clinical_significance":"severe","recommendations":"Prompt treatment; consider med eval."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":10,"optimal_range":[0,4]}$$::jsonb,
  $$Over the last 2 weeks, how often have you been bothered by the following problems?$$,
  3,
  'research_based'::evidence_level,
  true,false,
  7,
  ARRAY['anxiety']::text[],
  ARRAY['standard','screening']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='GAD-7' AND version='1.0');

-- =============================================================================
-- BDI-II (full, 21 items, 0–3 per item)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Beck Depression Inventory-II',
  'BDI-II',
  'depression'::assessment_category,
  '21-item self-report of depression severity (adolescents and adults).',
  '2.0',
  $$[
    {"id":"bdi_1","text":"Sadness","type":"single_choice","options":["I do not feel sad.","I feel sad much of the time.","I am sad all the time.","I am so sad or unhappy that I can’t stand it."],"required":true},
    {"id":"bdi_2","text":"Pessimism","type":"single_choice","options":["I am not discouraged about my future.","I feel more discouraged about my future than I used to be.","I do not expect things to work out for me.","I feel my future is hopeless and will only get worse."],"required":true},
    {"id":"bdi_3","text":"Past failure","type":"single_choice","options":["I do not feel like a failure.","I have failed more than I should have.","As I look back, I see a lot of failures.","I feel I am a total failure as a person."],"required":true},
    {"id":"bdi_4","text":"Loss of pleasure","type":"single_choice","options":["I get as much pleasure as I ever did.","I don’t enjoy things as much as I used to.","I get very little pleasure from the things I used to enjoy.","I can’t get any pleasure from the things I used to enjoy."],"required":true},
    {"id":"bdi_5","text":"Guilty feelings","type":"single_choice","options":["I don’t feel particularly guilty.","I feel guilty over many things I have done or should have done.","I feel quite guilty most of the time.","I feel guilty all of the time."],"required":true},
    {"id":"bdi_6","text":"Punishment feelings","type":"single_choice","options":["I don’t feel I am being punished.","I feel I may be punished.","I expect to be punished.","I feel I am being punished."],"required":true},
    {"id":"bdi_7","text":"Self-dislike","type":"single_choice","options":["I feel the same about myself as ever.","I have lost confidence in myself.","I am disappointed in myself.","I dislike myself."],"required":true},
    {"id":"bdi_8","text":"Self-criticalness","type":"single_choice","options":["I don’t criticize or blame myself more than usual.","I am more critical of myself than I used to be.","I criticize myself for all of my faults.","I blame myself for everything bad that happens."],"required":true},
    {"id":"bdi_9","text":"Suicidal thoughts or wishes","type":"single_choice","options":["I don’t have any thoughts of killing myself.","I have thoughts of killing myself, but I would not carry them out.","I would like to kill myself.","I would kill myself if I had the chance."],"required":true},
    {"id":"bdi_10","text":"Crying","type":"single_choice","options":["I don’t cry any more than I used to.","I cry more than I used to.","I cry over every little thing.","I feel like crying, but I can’t."],"required":true},
    {"id":"bdi_11","text":"Agitation","type":"single_choice","options":["I am no more restless or wound up than usual.","I feel more restless or wound up than usual.","I am so restless or agitated that it’s hard to stay still.","I am so restless or agitated that I have to keep moving or doing something."],"required":true},
    {"id":"bdi_12","text":"Loss of interest","type":"single_choice","options":["I have not lost interest in other people or activities.","I am less interested than I used to be in other people or things.","I have lost most of my interest in other people or things.","It’s hard to get interested in anything."],"required":true},
    {"id":"bdi_13","text":"Indecisiveness","type":"single_choice","options":["I make decisions about as well as ever.","I find it more difficult to make decisions than usual.","I have much greater difficulty in making decisions than I used to.","I have trouble making any decisions."],"required":true},
    {"id":"bdi_14","text":"Worthlessness","type":"single_choice","options":["I do not feel I am worthless.","I don’t consider myself as worthwhile and useful as I used to.","I feel more worthless as compared to others.","I feel utterly worthless."],"required":true},
    {"id":"bdi_15","text":"Loss of energy","type":"single_choice","options":["I have as much energy as ever.","I have less energy than I used to have.","I don’t have enough energy to do very much.","I don’t have enough energy to do anything."],"required":true},
    {"id":"bdi_16","text":"Changes in sleeping pattern","type":"single_choice","options":["I have not experienced any change in my sleeping.","I sleep somewhat more/less than usual.","I sleep a lot more/less than usual.","I sleep most of the day / I wake up 1–2 hours early and can’t get back to sleep."],"required":true},
    {"id":"bdi_17","text":"Irritability","type":"single_choice","options":["I am no more irritable than usual.","I am more irritable than usual.","I am much more irritable than usual.","I am irritable all the time."],"required":true},
    {"id":"bdi_18","text":"Changes in appetite","type":"single_choice","options":["I have not experienced any change in my appetite.","My appetite is somewhat greater/less than usual.","My appetite is much greater/less than before.","I have no appetite at all / I crave food all the time."],"required":true},
    {"id":"bdi_19","text":"Concentration difficulty","type":"single_choice","options":["I can concentrate as well as ever.","I can’t concentrate as well as usual.","It’s hard to keep my mind on anything for very long.","I find I can’t concentrate on anything."],"required":true},
    {"id":"bdi_20","text":"Tiredness or fatigue","type":"single_choice","options":["I am no more tired or fatigued than usual.","I get more tired or fatigued more easily than usual.","I am too tired or fatigued to do a lot of the things I used to do.","I am too tired or fatigued to do most of the things I used to do."],"required":true},
    {"id":"bdi_21","text":"Loss of interest in sex","type":"single_choice","options":["I have not noticed any recent change in my interest in sex.","I am less interested in sex than I used to be.","I am much less interested in sex now.","I have lost interest in sex completely."],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":63,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":13,"label":"Minimal","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor mood; wellness steps."},
      {"min":14,"max":19,"label":"Mild","severity":"mild","clinical_significance":"mild","recommendations":"Consider counseling / lifestyle."},
      {"min":20,"max":28,"label":"Moderate","severity":"moderate","clinical_significance":"moderate","recommendations":"Therapy recommended; consider med eval."},
      {"min":29,"max":63,"label":"Severe","severity":"severe","clinical_significance":"severe","recommendations":"Comprehensive treatment; consider higher level of care."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":14,"optimal_range":[0,13]}$$::jsonb,
  $$Read each group and pick the one statement that best describes how you felt over the past two weeks, including today.$$,
  8,
  'research_based'::evidence_level,
  true,false,
  21,
  ARRAY['depression']::text[],
  ARRAY['standard','severity']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='BDI-II' AND version='2.0');

-- =============================================================================
-- SWLS
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing'::assessment_category,
  '5-item global life satisfaction scale.',
  '1.0',
  $$[
    {"id":"swls_1","text":"In most ways my life is close to my ideal.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_2","text":"The conditions of my life are excellent.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_3","text":"I am satisfied with my life.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_4","text":"So far I have gotten the important things I want in life.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true},
    {"id":"swls_5","text":"If I could live my life over, I would change almost nothing.","type":"scale","scale_min":1,"scale_max":7,"labels":["Strongly Disagree","Disagree","Slightly Disagree","Neither","Slightly Agree","Agree","Strongly Agree"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":35,"min_score":5,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":5,"max":9,"label":"Extremely Dissatisfied","severity":"severe","clinical_significance":"severe","recommendations":"Comprehensive review and planning."},
      {"min":10,"max":14,"label":"Dissatisfied","severity":"moderate","clinical_significance":"moderate","recommendations":"Identify domains for improvement."},
      {"min":15,"max":19,"label":"Slightly Dissatisfied","severity":"mild","clinical_significance":"mild","recommendations":"Set targeted goals."},
      {"min":20,"max":24,"label":"Neutral","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain and explore growth."},
      {"min":25,"max":29,"label":"Satisfied","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain positives."},
      {"min":30,"max":35,"label":"Extremely Satisfied","severity":"minimal","clinical_significance":"subclinical","recommendations":"Sustain strategies."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate your agreement with each statement using the 1–7 scale.$$,
  3,
  'research_based'::evidence_level,
  true,false,
  5,
  ARRAY['wellbeing']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='SWLS' AND version='1.0');

-- =============================================================================
-- PSS-10
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Perceived Stress Scale-10',
  'PSS-10',
  'stress'::assessment_category,
  '10-item perceived stress scale.',
  '1.0',
  $$[
    {"id":"pss_1","text":"In the last month, how often have you been upset because of something that happened unexpectedly?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_2","text":"...unable to control the important things in your life?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_3","text":"...felt nervous and stressed?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_4","text":"...felt confident about your ability to handle personal problems?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_5","text":"...felt things were going your way?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_6","text":"...found that you could not cope with all the things that you had to do?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_7","text":"...been able to control irritations in your life?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_8","text":"...felt that you were on top of things?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"reverse_scored":true,"required":true},
    {"id":"pss_9","text":"...been angered because of things outside of your control?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true},
    {"id":"pss_10","text":"...felt difficulties were piling up so high that you could not overcome them?","type":"scale","scale_min":0,"scale_max":4,"labels":["Never","Almost Never","Sometimes","Fairly Often","Very Often"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":40,"min_score":0,"reverse_scored_items":["pss_4","pss_5","pss_7","pss_8"]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":13,"label":"Low Stress","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain coping strategies."},
      {"min":14,"max":26,"label":"Moderate Stress","severity":"moderate","clinical_significance":"moderate","recommendations":"Add stress-management skills."},
      {"min":27,"max":40,"label":"High Stress","severity":"severe","clinical_significance":"significant","recommendations":"Intervention recommended; consider therapy."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":20}$$::jsonb,
  $$Think about your feelings and thoughts during the last month and indicate how often you felt a certain way.$$,
  5,
  'research_based'::evidence_level,
  true,false,
  10,
  ARRAY['stress']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PSS-10' AND version='1.0');

-- =============================================================================
-- PCL-5 (full, 20 items, 0–4 each, total 0–80)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'PTSD Checklist for DSM-5',
  'PCL-5',
  'trauma'::assessment_category,
  '20-item self-report measure of DSM-5 PTSD symptoms.',
  '1.0',
  $$[
    {"id":"pcl5_1","text":"Repeated, disturbing, and unwanted memories of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_2","text":"Repeated, disturbing dreams of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_3","text":"Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_4","text":"Feeling very upset when something reminded you of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_5","text":"Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_6","text":"Avoiding memories, thoughts, or feelings related to the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_7","text":"Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_8","text":"Trouble remembering important parts of the stressful experience?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_9","text":"Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_10","text":"Blaming yourself or someone else for the stressful experience or what happened after it?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_11","text":"Having strong negative feelings such as fear, horror, anger, guilt, or shame?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_12","text":"Loss of interest in activities that you used to enjoy?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_13","text":"Feeling distant or cut off from other people?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_14","text":"Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_15","text":"Irritable behavior, angry outbursts, or acting aggressively?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_16","text":"Taking too many risks or doing things that could cause you harm?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_17","text":"Being “superalert” or watchful or on guard?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_18","text":"Feeling jumpy or easily startled?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_19","text":"Having difficulty concentrating?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true},
    {"id":"pcl5_20","text":"Trouble falling or staying asleep?","type":"scale","scale_min":0,"scale_max":4,"labels":["Not at all","A little bit","Moderately","Quite a bit","Extremely"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":80,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":32,"label":"Below Clinical Threshold","severity":"minimal","clinical_significance":"subclinical","recommendations":"Monitor; provide psychoeducation."},
      {"min":33,"max":80,"label":"Probable PTSD","severity":"severe","clinical_significance":"significant","recommendations":"Comprehensive trauma assessment; consider evidence-based PTSD treatment."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":33}$$::jsonb,
  $$Below is a list of problems people sometimes have after a very stressful experience. Indicate how much you have been bothered by each problem in the past month.$$,
  7,
  'research_based'::evidence_level,
  true,false,
  20,
  ARRAY['trauma','intrusions','avoidance','cognitions_mood','arousal']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='PCL-5' AND version='1.0');

-- =============================================================================
-- CD-RISC-10
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Connor-Davidson Resilience Scale-10',
  'CD-RISC-10',
  'wellbeing'::assessment_category,
  '10-item measure of resilience.',
  '1.0',
  $$[
    {"id":"cdrisc_1","text":"I am able to adapt when changes occur.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_2","text":"I have at least one close and secure relationship that helps me when I am stressed.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_3","text":"When there are no clear solutions to my problems, sometimes fate or God can help.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_4","text":"I can deal with whatever comes my way.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_5","text":"Past successes give me confidence in dealing with new challenges.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_6","text":"I see the humorous side of things.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_7","text":"Having to cope with stress can make me stronger.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_8","text":"I tend to bounce back after illness, injury, or other hardships.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_9","text":"Things happen for a reason.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true},
    {"id":"cdrisc_10","text":"I can achieve my goals even when there are obstacles.","type":"scale","scale_min":0,"scale_max":4,"labels":["Not true at all","Rarely true","Sometimes true","Often true","True nearly all the time"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":40,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":20,"label":"Lower Resilience","severity":"moderate","clinical_significance":"moderate","recommendations":"Develop resilience skills."},
      {"min":21,"max":30,"label":"Moderate Resilience","severity":"mild","clinical_significance":"mild","recommendations":"Continue building skills and support."},
      {"min":31,"max":40,"label":"High Resilience","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain practices; consider mentoring."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate how true each statement has been for you over the last month.$$,
  4,
  'research_based'::evidence_level,
  true,false,
  10,
  ARRAY['resilience']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='CD-RISC-10' AND version='1.0');

-- =============================================================================
-- MAAS (15 items, average score 1–6)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Mindful Attention Awareness Scale',
  'MAAS',
  'wellbeing'::assessment_category,
  '15-item dispositional mindfulness scale (average score).',
  '1.0',
  $$[
    {"id":"maas_1","text":"I could be experiencing some emotion and not be conscious of it until some time later.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_2","text":"I break or spill things because of carelessness, not paying attention, or thinking of something else.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_3","text":"I find it difficult to stay focused on what is happening in the present.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_4","text":"I tend to walk quickly to get where I am going without paying attention to what I experience along the way.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_5","text":"I tend not to notice feelings of physical tension or discomfort until they really grab my attention.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_6","text":"I forget a person’s name almost as soon as I’ve been told it for the first time.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_7","text":"It seems I am “running on automatic,” without much awareness of what I’m doing.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_8","text":"I rush through activities without being really attentive to them.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_9","text":"I get so focused on the goal I want to achieve that I lose touch with what I am doing right now to get there.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_10","text":"I do jobs or tasks automatically, without being aware of what I’m doing.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_11","text":"I find myself listening to someone with one ear, doing something else at the same time.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_12","text":"I drive places on ‘automatic pilot’ and then wonder why I went there.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_13","text":"I find myself preoccupied with the future or the past.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_14","text":"I find myself doing things without paying attention.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true},
    {"id":"maas_15","text":"I snack without being aware that I’m eating.","type":"scale","scale_min":1,"scale_max":6,"labels":["Almost Always","Very Frequently","Somewhat Frequently","Somewhat Infrequently","Very Infrequently","Almost Never"],"required":true}
  ]$$::jsonb,
  $${"method":"average","max_score":6,"min_score":1,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":1.0,"max":3.0,"label":"Lower Mindfulness","severity":"moderate","clinical_significance":"moderate","recommendations":"Mindfulness training recommended."},
      {"min":3.1,"max":4.5,"label":"Moderate Mindfulness","severity":"mild","clinical_significance":"mild","recommendations":"Continue regular practice."},
      {"min":4.6,"max":6.0,"label":"High Mindfulness","severity":"minimal","clinical_significance":"subclinical","recommendations":"Maintain advanced practice."}
    ]
  }$$::jsonb,
  $${}$$::jsonb,
  $$Indicate how frequently or infrequently you currently have each experience.$$,
  4,
  'research_based'::evidence_level,
  true,false,
  15,
  ARRAY['mindfulness']::text[],
  ARRAY['standard']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='MAAS' AND version='1.0');

-- =============================================================================
-- BAI (Beck Anxiety Inventory) — 21 items, 0–3 each, total 0–63
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Beck Anxiety Inventory',
  'BAI',
  'anxiety'::assessment_category,
  '21-item measure of anxiety symptom severity.',
  '1.0',
  $$[
    {"id":"bai_1","text":"Numbness or tingling","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_2","text":"Feeling hot","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_3","text":"Wobbliness in legs","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_4","text":"Unable to relax","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_5","text":"Fear of worst happening","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_6","text":"Dizzy or lightheaded","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_7","text":"Heart pounding/racing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_8","text":"Unsteady","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_9","text":"Terrified","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_10","text":"Nervous","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_11","text":"Feeling of choking","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_12","text":"Hands trembling","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_13","text":"Shaky/unsteady","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_14","text":"Fear of losing control","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_15","text":"Difficulty breathing","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_16","text":"Fear of dying","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_17","text":"Scared","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_18","text":"Indigestion","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_19","text":"Faint/lightheaded","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_20","text":"Face flushed","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true},
    {"id":"bai_21","text":"Sweating (not due to heat/exercise)","type":"scale","scale_min":0,"scale_max":3,"labels":["Not at all","Mildly","Moderately","Severely"],"required":true}
  ]$$::jsonb,
  $${"method":"sum","max_score":63,"min_score":0,"reverse_scored_items":[]}$$::jsonb,
  $${
    "ranges":[
      {"min":0,"max":7,"label":"Minimal Anxiety","severity":"minimal","clinical_significance":"subclinical","recommendations":"Reassurance; monitor."},
      {"min":8,"max":15,"label":"Mild Anxiety","severity":"mild","clinical_significance":"mild","recommendations":"Psychoeducation; self-help; brief CBT."},
      {"min":16,"max":25,"label":"Moderate Anxiety","severity":"moderate","clinical_significance":"moderate","recommendations":"CBT recommended; consider med eval."},
      {"min":26,"max":63,"label":"Severe Anxiety","severity":"severe","clinical_significance":"severe","recommendations":"Prompt treatment; consider combined therapy/meds."}
    ]
  }$$::jsonb,
  $${"clinical_cutoff":16}$$::jsonb,
  $$Rate how much you have been bothered by each symptom during the past week, including today.$$,
  5,
  'research_based'::evidence_level,
  true,false,
  21,
  ARRAY['anxiety']::text[],
  ARRAY['standard','severity']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='BAI' AND version='1.0');

-- =============================================================================
-- MBI (Maslach Burnout Inventory – HSS, 22 items, 0–6; three subscales)
-- =============================================================================
INSERT INTO public.assessment_templates
(name, abbreviation, category, description, version,
 questions, scoring_config, interpretation_rules, clinical_cutoffs,
 instructions, estimated_duration_minutes, evidence_level, is_active, is_public,
 items_count, domains, tags)
SELECT
  'Maslach Burnout Inventory – Human Services Survey',
  'MBI-HSS',
  'stress'::assessment_category,
  '22-item burnout inventory with Emotional Exhaustion (EE), Depersonalization (DP), and Personal Accomplishment (PA) subscales.',
  '1.0',
  $$[
    {"id":"mbi_1","text":"I feel emotionally drained from my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_2","text":"I feel used up at the end of the workday.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_3","text":"I feel fatigued when I get up in the morning and have to face another day on the job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_4","text":"I can easily understand how my clients feel about things.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_5","text":"I feel I treat some clients as if they were impersonal objects.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_6","text":"Working with people all day is really a strain for me.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_7","text":"I deal very effectively with the problems of my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_8","text":"I feel burned out from my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_9","text":"I feel I’m positively influencing other people’s lives through my work.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_10","text":"I’ve become more callous toward people since I took this job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_11","text":"I worry that this job is hardening me emotionally.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_12","text":"I feel very energetic.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_13","text":"I feel frustrated by my job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_14","text":"I feel I’m working too hard on my job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_15","text":"I don’t really care what happens to some clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_16","text":"Working with people directly puts too much stress on me.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_17","text":"I can easily create a relaxed atmosphere with my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_18","text":"I feel exhilarated after working closely with my clients.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_19","text":"I have accomplished many worthwhile things in this job.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_20","text":"I feel like I’m at the end of my rope.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_21","text":"In my work, I deal with emotional problems very calmly.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true},
    {"id":"mbi_22","text":"I feel clients blame me for some of their problems.","type":"scale","scale_min":0,"scale_max":6,"labels":["Never","A few times a year or less","Once a month or less","A few times a month","Once a week","A few times a week","Every day"],"required":true}
  ]$$::jsonb,
  $${
    "method":"custom",
    "subscales":{
      "EE":{"label":"Emotional Exhaustion","items":["mbi_1","mbi_2","mbi_3","mbi_6","mbi_8","mbi_13","mbi_14","mbi_16","mbi_20"],"range":[0,54]},
      "DP":{"label":"Depersonalization","items":["mbi_5","mbi_10","mbi_11","mbi_15","mbi_22"],"range":[0,30]},
      "PA":{"label":"Personal Accomplishment","items":["mbi_4","mbi_7","mbi_9","mbi_12","mbi_17","mbi_18","mbi_19","mbi_21"],"range":[0,48],"direction":"higher_is_better"}
    }
  }$$::jsonb,
  $${
    "by_subscale":[
      {"domain":"EE","ranges":[{"min":0,"max":16,"label":"Low EE"},{"min":17,"max":26,"label":"Moderate EE"},{"min":27,"max":54,"label":"High EE"}]},
      {"domain":"DP","ranges":[{"min":0,"max":6,"label":"Low DP"},{"min":7,"max":12,"label":"Moderate DP"},{"min":13,"max":30,"label":"High DP"}]},
      {"domain":"PA","ranges":[{"min":0,"max":31,"label":"Low PA"},{"min":32,"max":38,"label":"Moderate PA"},{"min":39,"max":48,"label":"High PA"}]}
    ],
    "notes":"Higher EE/DP indicate greater burnout; lower PA indicates greater burnout."
  }$$::jsonb,
  $${}$$::jsonb,
  $$How often do you experience each feeling about your work? Rate from 0 (Never) to 6 (Every day).$$,
  10,
  'research_based'::evidence_level,
  true,false,
  22,
  ARRAY['burnout','EE','DP','PA']::text[],
  ARRAY['standard','subscales']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_templates WHERE abbreviation='MBI-HSS' AND version='1.0');

COMMIT;
