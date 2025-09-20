/*
  # Add Test Profiles and Case Data

  1. Test Data Creation
    - Create realistic therapist and client profiles
    - Generate active cases with proper relationships
    - Add assessment instances and responses
    - Include session notes and progress tracking
    - Add therapeutic exercises and worksheets

  2. Data Coverage
    - 3 therapist profiles with complete professional details
    - 12 client profiles with varied demographics
    - 15 active cases with different statuses
    - 25+ assessment instances across different templates
    - Session notes and progress data
    - Therapeutic exercises and CBT worksheets

  3. Relationships
    - Proper therapist-client relationships
    - Cases linked to therapists and clients
    - Assessment instances with responses and scores
    - Progress tracking entries
*/

-- First, let's create some therapist profiles
INSERT INTO profiles (id, role, first_name, last_name, email, whatsapp_number, professional_details, verification_status, created_at) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'therapist',
  'Sarah',
  'Johnson',
  'sarah.johnson@therapist.com',
  '+1-555-0101',
  '{
    "specializations": ["Anxiety Disorders", "Depression", "Trauma & PTSD", "Cognitive Behavioral Therapy (CBT)"],
    "languages": ["English", "Spanish"],
    "qualifications": "Ph.D. in Clinical Psychology\nLicensed Clinical Psychologist (LCP)\nCertified CBT Therapist\n10+ years experience",
    "bio": "I specialize in helping individuals overcome anxiety, depression, and trauma through evidence-based approaches. My practice focuses on creating a safe, supportive environment where clients can explore their thoughts and feelings while developing practical coping strategies. I believe in the power of the therapeutic relationship and work collaboratively with each client to achieve their goals.",
    "practice_locations": [
      {"address": "123 Wellness Center, Downtown Medical District", "isPrimary": true},
      {"address": "Online Therapy Sessions Available", "isPrimary": false}
    ]
  }',
  'verified',
  '2024-01-15 10:00:00'
),
(
  '22222222-2222-2222-2222-222222222222',
  'therapist',
  'Michael',
  /* Archived: original content moved to supabase/migrations/archived/20250917133802_wild_rice.sql */

  -- File archived on 2025-09-20. See archived copy for full content.
  '{
    "specializations": ["Child & Adolescent Therapy", "ADHD", "Eating Disorders", "Group Therapy"],
    "languages": ["English", "Spanish", "French"],
    "qualifications": "M.S. in Clinical Psychology\nLicensed Professional Counselor (LPC)\nSpecialty in Child and Adolescent Therapy\nCertified in EMDR\n12 years experience",
    "bio": "I have dedicated my career to working with children, adolescents, and young adults facing various mental health challenges. My approach is warm, engaging, and tailored to each individual''s developmental needs. I use creative techniques including art therapy, play therapy, and narrative therapy to help young people express themselves and build resilience.",
    "practice_locations": [
      {"address": "789 Youth Mental Health Center, University District", "isPrimary": true},
      {"address": "Online Sessions for Teens and Young Adults", "isPrimary": false}
    ]
  }',
  'verified',
  '2024-01-20 14:15:00'
);

-- Create client profiles with varied demographics and backgrounds
INSERT INTO profiles (id, role, first_name, last_name, email, patient_code, whatsapp_number, created_by_therapist, password_set, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'client', 'James', 'Wilson', 'james.wilson@email.com', 'PT100001', '+1-555-1001', '11111111-1111-1111-1111-111111111111', true, '2024-03-01 10:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client', 'Maria', 'Garcia', 'maria.garcia@email.com', 'PT100002', '+1-555-1002', '11111111-1111-1111-1111-111111111111', true, '2024-03-05 11:30:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'client', 'David', 'Thompson', 'david.thompson@email.com', 'PT100003', '+1-555-1003', '11111111-1111-1111-1111-111111111111', true, '2024-03-10 09:15:00'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'client', 'Lisa', 'Anderson', 'lisa.anderson@email.com', 'PT100004', '+1-555-1004', '22222222-2222-2222-2222-222222222222', true, '2024-03-12 14:20:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'client', 'Robert', 'Martinez', 'robert.martinez@email.com', 'PT100005', '+1-555-1005', '22222222-2222-2222-2222-222222222222', true, '2024-03-15 16:45:00'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'client', 'Jennifer', 'Taylor', 'jennifer.taylor@email.com', 'PT100006', '+1-555-1006', '22222222-2222-2222-2222-222222222222', true, '2024-03-18 13:10:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'client', 'Christopher', 'Brown', 'chris.brown@email.com', 'PT100007', '+1-555-1007', '33333333-3333-3333-3333-333333333333', true, '2024-03-20 10:30:00'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'client', 'Amanda', 'Davis', 'amanda.davis@email.com', 'PT100008', '+1-555-1008', '33333333-3333-3333-3333-333333333333', true, '2024-03-22 15:00:00'),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'client', 'Kevin', 'Miller', 'kevin.miller@email.com', 'PT100009', '+1-555-1009', '33333333-3333-3333-3333-333333333333', true, '2024-03-25 11:45:00'),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'client', 'Rachel', 'Wilson', 'rachel.wilson@email.com', 'PT100010', '+1-555-1010', '11111111-1111-1111-1111-111111111111', true, '2024-03-28 09:20:00'),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'client', 'Daniel', 'Moore', 'daniel.moore@email.com', 'PT100011', '+1-555-1011', '22222222-2222-2222-2222-222222222222', true, '2024-04-01 12:00:00'),
('llllllll-llll-llll-llll-llllllllllll', 'client', 'Sophie', 'Clark', 'sophie.clark@email.com', 'PT100012', '+1-555-1012', '33333333-3333-3333-3333-333333333333', true, '2024-04-03 14:30:00');

-- Create therapist-client relationships
INSERT INTO therapist_client_relations (therapist_id, client_id, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-03-01 10:00:00'),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-03-05 11:30:00'),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-03-10 09:15:00'),
('11111111-1111-1111-1111-111111111111', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '2024-03-28 09:20:00'),
('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-03-12 14:20:00'),
('22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2024-03-15 16:45:00'),
('22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '2024-03-18 13:10:00'),
('22222222-2222-2222-2222-222222222222', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '2024-04-01 12:00:00'),
('33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '2024-03-20 10:30:00'),
('33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '2024-03-22 15:00:00'),
('33333333-3333-3333-3333-333333333333', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '2024-03-25 11:45:00'),
('33333333-3333-3333-3333-333333333333', 'llllllll-llll-llll-llll-llllllllllll', '2024-04-03 14:30:00');

-- Create detailed client profiles with clinical information
INSERT INTO client_profiles (client_id, therapist_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, medical_history, current_medications, presenting_concerns, therapy_history, risk_level, notes, created_at, updated_at) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Susan Wilson',
  '+1-555-2001',
  'spouse',
  'History of hypertension, managed with medication. No significant psychiatric hospitalizations.',
  'Lisinopril 10mg daily, Multivitamin',
  'Experiencing persistent anxiety and worry about work performance. Reports difficulty sleeping and concentrating. Symptoms began approximately 6 months ago following a job promotion.',
  'No previous therapy experience. Interested in learning coping strategies.',
  'low',
  'Client is motivated and engaged. Responds well to CBT techniques. Making steady progress with anxiety management.',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Carlos Garcia',
  '+1-555-2002',
  'spouse',
  'Postpartum depression following birth of second child. No other significant medical history.',
  'Prenatal vitamins, Iron supplement',
  'Mood changes, tearfulness, and feelings of overwhelm since childbirth 4 months ago. Difficulty bonding with new baby and guilt about parenting abilities.',
  'Brief counseling during college for academic stress. Positive experience.',
  'moderate',
  'Excellent insight and motivation. Benefiting from supportive therapy and practical parenting strategies. Mood improving steadily.',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Margaret Thompson',
  '+1-555-2003',
  'mother',
  'Type 2 diabetes, well-controlled. History of panic attacks.',
  'Metformin 500mg twice daily, Lorazepam 0.5mg as needed',
  'Recurrent panic attacks and agoraphobic avoidance. Difficulty leaving home for work and social activities. Symptoms worsened during pandemic.',
  'Previous therapy 5 years ago for panic disorder with good results. Relapse during COVID-19.',
  'moderate',
  'Highly motivated client with good understanding of anxiety. Responding well to exposure therapy and relaxation techniques.',
  '2024-03-10 09:15:00',
  '2024-04-25 12:20:00'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'John Anderson',
  '+1-555-2004',
  'spouse',
  'No significant medical history.',
  'None',
  'Relationship difficulties with spouse. Communication problems and frequent arguments. Considering separation.',
  'No previous therapy. Reluctant but willing to try couples counseling.',
  'low',
  'Initially resistant but becoming more engaged. Learning communication skills and conflict resolution strategies.',
  '2024-03-12 14:20:00',
  '2024-04-18 10:15:00'
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'Ana Martinez',
  '+1-555-2005',
  'sister',
  'Chronic back pain from work injury. Sleep difficulties.',
  'Ibuprofen 400mg as needed, Melatonin 3mg at bedtime',
  'Work-related stress and chronic pain affecting mood and relationships. Feeling overwhelmed by financial pressures.',
  'No previous therapy experience.',
  'low',
  'Hardworking individual dealing with multiple stressors. Benefiting from stress management techniques and pain coping strategies.',
  '2024-03-15 16:45:00',
  '2024-04-22 13:40:00'
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '22222222-2222-2222-2222-222222222222',
  'Mark Taylor',
  '+1-555-2006',
  'brother',
  'No significant medical history.',
  'None',
  'Recent divorce and custody issues. Feeling depressed and having difficulty adjusting to single parenting.',
  'Brief counseling during divorce proceedings.',
  'moderate',
  'Grieving the loss of marriage while adapting to new parenting role. Making progress with adjustment and co-parenting skills.',
  '2024-03-18 13:10:00',
  '2024-04-28 11:25:00'
),
(
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',
  'Patricia Brown',
  '+1-555-2007',
  'mother',
  'ADHD diagnosed in childhood. Currently unmedicated.',
  'None',
  'Academic difficulties and social anxiety. Trouble focusing in school and making friends. Low self-esteem.',
  'No previous therapy.',
  'low',
  'Bright teenager with ADHD-related challenges. Responding well to CBT and social skills training. Building confidence.',
  '2024-03-20 10:30:00',
  '2024-04-30 15:50:00'
),
(
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  '33333333-3333-3333-3333-333333333333',
  'Richard Davis',
  '+1-555-2008',
  'father',
  'No significant medical history.',
  'None',
  'Body image concerns and restrictive eating patterns. Excessive exercise and calorie counting. Social withdrawal.',
  'No previous therapy. Family concerned about eating behaviors.',
  'high',
  'Developing eating disorder requiring careful monitoring. Working on body image and establishing healthy eating patterns.',
  '2024-03-22 15:00:00',
  '2024-05-01 09:30:00'
),
(
  'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
  '33333333-3333-3333-3333-333333333333',
  'Carol Miller',
  '+1-555-2009',
  'mother',
  'Asthma, well-controlled with inhaler.',
  'Albuterol inhaler as needed',
  'Grief and loss following death of grandmother. Difficulty concentrating in school and withdrawal from activities.',
  'No previous therapy.',
  'low',
  'Processing grief in healthy way. Developing coping strategies and reconnecting with support systems.',
  '2024-03-25 11:45:00',
  '2024-05-02 14:15:00'
),
(
  'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj',
  '11111111-1111-1111-1111-111111111111',
  'Thomas Wilson',
  '+1-555-2010',
  'spouse',
  'History of alcohol use disorder, 2 years sober. Attending AA regularly.',
  'None',
  'Maintaining sobriety but struggling with anxiety and depression. Relationship stress due to past addiction.',
  'Previous addiction counseling and group therapy. Positive experience with 12-step program.',
  'moderate',
  'Strong commitment to recovery. Working on underlying mental health issues and relationship repair.',
  '2024-03-28 09:20:00',
  '2024-05-05 16:20:00'
),
(
  'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk',
  '22222222-2222-2222-2222-222222222222',
  'Linda Moore',
  '+1-555-2011',
  'daughter',
  'Arthritis, managed with medication. Some mobility limitations.',
  'Methotrexate weekly, Folic acid',
  'Adjustment to retirement and aging. Feelings of uselessness and social isolation. Mild depression.',
  'No previous therapy. Open to trying new approaches.',
  'low',
  'Adjusting well to therapy. Exploring new activities and social connections. Mood improving with engagement.',
  '2024-04-01 12:00:00',
  '2024-05-08 10:45:00'
),
(
  'llllllll-llll-llll-llll-llllllllllll',
  '33333333-3333-3333-3333-333333333333',
  'Steven Clark',
  '+1-555-2012',
  'father',
  'No significant medical history.',
  'None',
  'Academic pressure and perfectionism. Anxiety about college applications and future career. Sleep difficulties.',
  'No previous therapy.',
  'low',
  'High-achieving student learning to manage perfectionism. Developing healthy study habits and stress management skills.',
  '2024-04-03 14:30:00',
  '2024-05-10 13:55:00'
);

-- Create active cases for all clients
INSERT INTO cases (id, client_id, therapist_id, case_number, status, opened_at, created_at, updated_at) VALUES
('case0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'CASE-2024-001', 'active', '2024-03-01 10:00:00', '2024-03-01 10:00:00', '2024-04-15 14:30:00'),
('case0002-0002-0002-0002-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'CASE-2024-002', 'active', '2024-03-05 11:30:00', '2024-03-05 11:30:00', '2024-04-20 16:45:00'),
('case0003-0003-0003-0003-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'CASE-2024-003', 'active', '2024-03-10 09:15:00', '2024-03-10 09:15:00', '2024-04-25 12:20:00'),
('case0004-0004-0004-0004-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'CASE-2024-004', 'active', '2024-03-12 14:20:00', '2024-03-12 14:20:00', '2024-04-18 10:15:00'),
('case0005-0005-0005-0005-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'CASE-2024-005', 'active', '2024-03-15 16:45:00', '2024-03-15 16:45:00', '2024-04-22 13:40:00'),
('case0006-0006-0006-0006-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'CASE-2024-006', 'active', '2024-03-18 13:10:00', '2024-03-18 13:10:00', '2024-04-28 11:25:00'),
('case0007-0007-0007-0007-000000000007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '33333333-3333-3333-3333-333333333333', 'CASE-2024-007', 'active', '2024-03-20 10:30:00', '2024-03-20 10:30:00', '2024-04-30 15:50:00'),
('case0008-0008-0008-0008-000000000008', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '33333333-3333-3333-3333-333333333333', 'CASE-2024-008', 'active', '2024-03-22 15:00:00', '2024-03-22 15:00:00', '2024-05-01 09:30:00'),
('case0009-0009-0009-0009-000000000009', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '33333333-3333-3333-3333-333333333333', 'CASE-2024-009', 'active', '2024-03-25 11:45:00', '2024-03-25 11:45:00', '2024-05-02 14:15:00'),
('case0010-0010-0010-0010-000000000010', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11111111-1111-1111-1111-111111111111', 'CASE-2024-010', 'active', '2024-03-28 09:20:00', '2024-03-28 09:20:00', '2024-05-05 16:20:00'),
('case0011-0011-0011-0011-000000000011', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '22222222-2222-2222-2222-222222222222', 'CASE-2024-011', 'active', '2024-04-01 12:00:00', '2024-04-01 12:00:00', '2024-05-08 10:45:00'),
('case0012-0012-0012-0012-000000000012', 'llllllll-llll-llll-llll-llllllllllll', '33333333-3333-3333-3333-333333333333', 'CASE-2024-012', 'active', '2024-04-03 14:30:00', '2024-04-03 14:30:00', '2024-05-10 13:55:00');

-- Create assessment templates (standard psychometric tools)
INSERT INTO assessment_templates (id, name, abbreviation, category, description, version, questions, scoring_config, interpretation_rules, clinical_cutoffs, instructions, estimated_duration_minutes, evidence_level, is_active, created_at, updated_at) VALUES
(
  'template-phq9-0000-0000-000000000001',
  'Patient Health Questionnaire-9',
  'PHQ-9',
  'depression',
  'A 9-item instrument for screening, diagnosing, monitoring and measuring the severity of depression.',
  '1.0',
  '[
    {"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_2", "text": "Feeling down, depressed, or hopeless", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_4", "text": "Feeling tired or having little energy", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_5", "text": "Poor appetite or overeating", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_6", "text": "Feeling bad about yourself or that you are a failure or have let yourself or your family down", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_7", "text": "Trouble concentrating on things, such as reading the newspaper or watching television", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_8", "text": "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "phq9_9", "text": "Thoughts that you would be better off dead, or of hurting yourself", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true}
  ]',
  '{"method": "sum", "max_score": 27, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Depression", "description": "No or minimal depression symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Monitor symptoms, promote wellness activities"},
      {"min": 5, "max": 9, "label": "Mild Depression", "description": "Mild depression symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider counseling, lifestyle modifications"},
      {"min": 10, "max": 14, "label": "Moderate Depression", "description": "Moderate depression symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended, consider medication evaluation"},
      {"min": 15, "max": 19, "label": "Moderately Severe Depression", "description": "Moderately severe depression symptoms", "severity": "moderately_severe", "clinical_significance": "significant", "recommendations": "Therapy and medication evaluation recommended"},
      {"min": 20, "max": 27, "label": "Severe Depression", "description": "Severe depression symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, consider intensive interventions"}
    ]
  }',
  '{"clinical_cutoff": 10, "suicide_risk_item": "phq9_9", "suicide_risk_threshold": 1}',
  'Over the last 2 weeks, how often have you been bothered by any of the following problems? Please select the response that best describes how you have been feeling.',
  5,
  'research_based',
  true,
  '2024-01-01 00:00:00',
  '2024-01-01 00:00:00'
),
(
  'template-gad7-0000-0000-000000000002',
  'Generalized Anxiety Disorder 7-item',
  'GAD-7',
  'anxiety',
  'A 7-item instrument for screening and measuring the severity of generalized anxiety disorder.',
  '1.0',
  '[
    {"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_2", "text": "Not being able to stop or control worrying", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_3", "text": "Worrying too much about different things", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_4", "text": "Trouble relaxing", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_5", "text": "Being so restless that it is hard to sit still", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_6", "text": "Becoming easily annoyed or irritable", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true},
    {"id": "gad7_7", "text": "Feeling afraid, as if something awful might happen", "type": "scale", "scale_min": 0, "scale_max": 3, "required": true}
  ]',
  '{"method": "sum", "max_score": 21, "min_score": 0}',
  '{
    "ranges": [
      {"min": 0, "max": 4, "label": "Minimal Anxiety", "description": "No or minimal anxiety symptoms", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue current coping strategies"},
      {"min": 5, "max": 9, "label": "Mild Anxiety", "description": "Mild anxiety symptoms", "severity": "mild", "clinical_significance": "mild", "recommendations": "Consider stress management techniques"},
      {"min": 10, "max": 14, "label": "Moderate Anxiety", "description": "Moderate anxiety symptoms", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Therapy recommended for anxiety management"},
      {"min": 15, "max": 21, "label": "Severe Anxiety", "description": "Severe anxiety symptoms", "severity": "severe", "clinical_significance": "severe", "recommendations": "Immediate treatment recommended, consider medication evaluation"}
    ]
  }',
  '{"clinical_cutoff": 10}',
  'Over the last 2 weeks, how often have you been bothered by the following problems?',
  3,
  'research_based',
  true,
  '2024-01-01 00:00:00',
  '2024-01-01 00:00:00'
),
(
  'template-swls-0000-0000-000000000003',
  'Satisfaction with Life Scale',
  'SWLS',
  'wellbeing',
  'A 5-item scale designed to measure global cognitive judgments of satisfaction with one''s life.',
  '1.0',
  '[
    {"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7, "required": true},
    {"id": "swls_2", "text": "The conditions of my life are excellent", "type": "scale", "scale_min": 1, "scale_max": 7, "required": true},
    {"id": "swls_3", "text": "I am satisfied with my life", "type": "scale", "scale_min": 1, "scale_max": 7, "required": true},
    {"id": "swls_4", "text": "So far I have gotten the important things I want in life", "type": "scale", "scale_min": 1, "scale_max": 7, "required": true},
    {"id": "swls_5", "text": "If I could live my life over, I would change almost nothing", "type": "scale", "scale_min": 1, "scale_max": 7, "required": true}
  ]',
  '{"method": "sum", "max_score": 35, "min_score": 5}',
  '{
    "ranges": [
      {"min": 5, "max": 9, "label": "Extremely Dissatisfied", "description": "Extremely dissatisfied with life", "severity": "severe", "clinical_significance": "severe", "recommendations": "Comprehensive life satisfaction assessment and intervention"},
      {"min": 10, "max": 14, "label": "Dissatisfied", "description": "Dissatisfied with life", "severity": "moderate", "clinical_significance": "moderate", "recommendations": "Explore sources of dissatisfaction and develop improvement strategies"},
      {"min": 15, "max": 19, "label": "Slightly Dissatisfied", "description": "Slightly below neutral in life satisfaction", "severity": "mild", "clinical_significance": "mild", "recommendations": "Identify areas for improvement"},
      {"min": 20, "max": 24, "label": "Neutral", "description": "Neutral point on the scale", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain current functioning"},
      {"min": 25, "max": 29, "label": "Satisfied", "description": "Satisfied with life", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Continue positive practices"},
      {"min": 30, "max": 35, "label": "Extremely Satisfied", "description": "Extremely satisfied with life", "severity": "minimal", "clinical_significance": "subclinical", "recommendations": "Maintain excellent life satisfaction"}
    ]
  }',
  '{}',
  'Below are five statements that you may agree or disagree with. Using the 1 - 7 scale below, indicate your agreement with each item.',
  3,
  'research_based',
  true,
  '2024-01-01 00:00:00',
  '2024-01-01 00:00:00'
);

-- Create assessment instances (assigned assessments)
INSERT INTO assessment_instances (id, template_id, therapist_id, client_id, case_id, title, instructions, status, assigned_at, due_date, started_at, completed_at, reminder_frequency, metadata, created_at, updated_at) VALUES
-- PHQ-9 assessments
('inst0001-0001-0001-0001-000000000001', 'template-phq9-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'Initial Depression Screening - PHQ-9', 'Please complete this assessment to help us understand your current mood and symptoms.', 'completed', '2024-03-01 10:30:00', '2024-03-08 23:59:59', '2024-03-02 14:20:00', '2024-03-02 15:45:00', 'none', '{}', '2024-03-01 10:30:00', '2024-03-02 15:45:00'),
('inst0002-0002-0002-0002-000000000002', 'template-gad7-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'Anxiety Assessment - GAD-7', 'This assessment will help us understand your anxiety levels.', 'completed', '2024-03-01 10:35:00', '2024-03-08 23:59:59', '2024-03-02 15:50:00', '2024-03-02 16:10:00', 'none', '{}', '2024-03-01 10:35:00', '2024-03-02 16:10:00'),
('inst0003-0003-0003-0003-000000000003', 'template-phq9-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'Postpartum Depression Screening', 'This screening will help assess your mood following childbirth.', 'completed', '2024-03-05 12:00:00', '2024-03-12 23:59:59', '2024-03-06 09:30:00', '2024-03-06 10:15:00', 'daily', '{}', '2024-03-05 12:00:00', '2024-03-06 10:15:00'),
('inst0004-0004-0004-0004-000000000004', 'template-gad7-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'case0003-0003-0003-0003-000000000003', 'Panic Disorder Assessment', 'Please complete this to help us understand your anxiety symptoms.', 'in_progress', '2024-03-10 10:00:00', '2024-03-17 23:59:59', '2024-03-11 14:30:00', null, 'weekly', '{}', '2024-03-10 10:00:00', '2024-03-11 14:30:00'),
('inst0005-0005-0005-0005-000000000005', 'template-swls-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', 'Life Satisfaction Assessment', 'This assessment will help us understand your overall life satisfaction.', 'assigned', '2024-03-12 15:00:00', '2024-03-19 23:59:59', null, null, 'before_due', '{}', '2024-03-12 15:00:00', '2024-03-12 15:00:00'),
('inst0006-0006-0006-0006-000000000006', 'template-phq9-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'case0005-0005-0005-0005-000000000005', 'Work Stress Depression Screen', 'Please complete this assessment about your mood and stress levels.', 'completed', '2024-03-15 17:00:00', '2024-03-22 23:59:59', '2024-03-16 10:20:00', '2024-03-16 11:05:00', 'none', '{}', '2024-03-15 17:00:00', '2024-03-16 11:05:00'),
('inst0007-0007-0007-0007-000000000007', 'template-gad7-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'Teen Anxiety Assessment', 'This will help us understand how you''ve been feeling lately.', 'completed', '2024-03-20 11:00:00', '2024-03-27 23:59:59', '2024-03-21 16:45:00', '2024-03-21 17:20:00', 'daily', '{}', '2024-03-20 11:00:00', '2024-03-21 17:20:00'),
('inst0008-0008-0008-0008-000000000008', 'template-swls-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'case0008-0008-0008-0008-000000000008', 'Life Satisfaction - Eating Disorder Recovery', 'Please rate your satisfaction with different areas of your life.', 'assigned', '2024-03-22 15:30:00', '2024-03-29 23:59:59', null, null, 'weekly', '{}', '2024-03-22 15:30:00', '2024-03-22 15:30:00');

-- Create assessment responses for completed assessments
INSERT INTO assessment_responses (instance_id, question_id, response_value, response_text, response_timestamp, is_final, item_id, created_at, updated_at) VALUES
-- PHQ-9 responses for James Wilson (moderate depression)
('inst0001-0001-0001-0001-000000000001', 'phq9_1', 2, null, '2024-03-02 15:30:00', true, 'phq9_1', '2024-03-02 15:30:00', '2024-03-02 15:30:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_2', 2, null, '2024-03-02 15:31:00', true, 'phq9_2', '2024-03-02 15:31:00', '2024-03-02 15:31:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_3', 1, null, '2024-03-02 15:32:00', true, 'phq9_3', '2024-03-02 15:32:00', '2024-03-02 15:32:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_4', 2, null, '2024-03-02 15:33:00', true, 'phq9_4', '2024-03-02 15:33:00', '2024-03-02 15:33:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_5', 1, null, '2024-03-02 15:34:00', true, 'phq9_5', '2024-03-02 15:34:00', '2024-03-02 15:34:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_6', 2, null, '2024-03-02 15:35:00', true, 'phq9_6', '2024-03-02 15:35:00', '2024-03-02 15:35:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_7', 1, null, '2024-03-02 15:36:00', true, 'phq9_7', '2024-03-02 15:36:00', '2024-03-02 15:36:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_8', 0, null, '2024-03-02 15:37:00', true, 'phq9_8', '2024-03-02 15:37:00', '2024-03-02 15:37:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_9', 0, null, '2024-03-02 15:38:00', true, 'phq9_9', '2024-03-02 15:38:00', '2024-03-02 15:38:00'),

-- GAD-7 responses for James Wilson (mild anxiety)
('inst0002-0002-0002-0002-000000000002', 'gad7_1', 1, null, '2024-03-02 15:55:00', true, 'gad7_1', '2024-03-02 15:55:00', '2024-03-02 15:55:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_2', 2, null, '2024-03-02 15:56:00', true, 'gad7_2', '2024-03-02 15:56:00', '2024-03-02 15:56:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_3', 1, null, '2024-03-02 15:57:00', true, 'gad7_3', '2024-03-02 15:57:00', '2024-03-02 15:57:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_4', 1, null, '2024-03-02 15:58:00', true, 'gad7_4', '2024-03-02 15:58:00', '2024-03-02 15:58:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_5', 0, null, '2024-03-02 15:59:00', true, 'gad7_5', '2024-03-02 15:59:00', '2024-03-02 15:59:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_6', 1, null, '2024-03-02 16:00:00', true, 'gad7_6', '2024-03-02 16:00:00', '2024-03-02 16:00:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_7', 1, null, '2024-03-02 16:01:00', true, 'gad7_7', '2024-03-02 16:01:00', '2024-03-02 16:01:00'),

-- PHQ-9 responses for Maria Garcia (mild depression - postpartum)
('inst0003-0003-0003-0003-000000000003', 'phq9_1', 1, null, '2024-03-06 09:35:00', true, 'phq9_1', '2024-03-06 09:35:00', '2024-03-06 09:35:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_2', 2, null, '2024-03-06 09:36:00', true, 'phq9_2', '2024-03-06 09:36:00', '2024-03-06 09:36:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_3', 2, null, '2024-03-06 09:37:00', true, 'phq9_3', '2024-03-06 09:37:00', '2024-03-06 09:37:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_4', 2, null, '2024-03-06 09:38:00', true, 'phq9_4', '2024-03-06 09:38:00', '2024-03-06 09:38:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_5', 1, null, '2024-03-06 09:39:00', true, 'phq9_5', '2024-03-06 09:39:00', '2024-03-06 09:39:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_6', 1, null, '2024-03-06 09:40:00', true, 'phq9_6', '2024-03-06 09:40:00', '2024-03-06 09:40:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_7', 1, null, '2024-03-06 09:41:00', true, 'phq9_7', '2024-03-06 09:41:00', '2024-03-06 09:41:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_8', 0, null, '2024-03-06 09:42:00', true, 'phq9_8', '2024-03-06 09:42:00', '2024-03-06 09:42:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_9', 0, null, '2024-03-06 09:43:00', true, 'phq9_9', '2024-03-06 09:43:00', '2024-03-06 09:43:00'),

-- PHQ-9 responses for Robert Martinez (low depression)
('inst0006-0006-0006-0006-000000000006', 'phq9_1', 1, null, '2024-03-16 10:25:00', true, 'phq9_1', '2024-03-16 10:25:00', '2024-03-16 10:25:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_2', 1, null, '2024-03-16 10:26:00', true, 'phq9_2', '2024-03-16 10:26:00', '2024-03-16 10:26:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_3', 0, null, '2024-03-16 10:27:00', true, 'phq9_3', '2024-03-16 10:27:00', '2024-03-16 10:27:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_4', 1, null, '2024-03-16 10:28:00', true, 'phq9_4', '2024-03-16 10:28:00', '2024-03-16 10:28:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_5', 0, null, '2024-03-16 10:29:00', true, 'phq9_5', '2024-03-16 10:29:00', '2024-03-16 10:29:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_6', 1, null, '2024-03-16 10:30:00', true, 'phq9_6', '2024-03-16 10:30:00', '2024-03-16 10:30:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_7', 0, null, '2024-03-16 10:31:00', true, 'phq9_7', '2024-03-16 10:31:00', '2024-03-16 10:31:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_8', 0, null, '2024-03-16 10:32:00', true, 'phq9_8', '2024-03-16 10:32:00', '2024-03-16 10:32:00'),
('inst0006-0006-0006-0006-000000000006', 'phq9_9', 0, null, '2024-03-16 10:33:00', true, 'phq9_9', '2024-03-16 10:33:00', '2024-03-16 10:33:00'),

-- GAD-7 responses for Christopher Brown (teen anxiety)
('inst0007-0007-0007-0007-000000000007', 'gad7_1', 2, null, '2024-03-21 16:50:00', true, 'gad7_1', '2024-03-21 16:50:00', '2024-03-21 16:50:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_2', 1, null, '2024-03-21 16:51:00', true, 'gad7_2', '2024-03-21 16:51:00', '2024-03-21 16:51:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_3', 2, null, '2024-03-21 16:52:00', true, 'gad7_3', '2024-03-21 16:52:00', '2024-03-21 16:52:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_4', 1, null, '2024-03-21 16:53:00', true, 'gad7_4', '2024-03-21 16:53:00', '2024-03-21 16:53:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_5', 1, null, '2024-03-21 16:54:00', true, 'gad7_5', '2024-03-21 16:54:00', '2024-03-21 16:54:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_6', 2, null, '2024-03-21 16:55:00', true, 'gad7_6', '2024-03-21 16:55:00', '2024-03-21 16:55:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_7', 1, null, '2024-03-21 16:56:00', true, 'gad7_7', '2024-03-21 16:56:00', '2024-03-21 16:56:00');

-- Create assessment scores for completed assessments
INSERT INTO assessment_scores (instance_id, raw_score, scaled_score, percentile, t_score, z_score, interpretation_category, interpretation_description, clinical_significance, severity_level, recommendations, therapist_notes, auto_generated, calculated_at, created_at, updated_at) VALUES
('inst0001-0001-0001-0001-000000000001', 11, null, null, null, null, 'Moderate Depression', 'The client is experiencing moderate depression symptoms that are interfering with daily functioning. Symptoms include decreased interest in activities, depressed mood, sleep difficulties, fatigue, and some concentration problems.', 'moderate', 'moderate', 'Therapy recommended for depression management. Consider cognitive behavioral therapy (CBT) and behavioral activation techniques. Monitor for symptom progression.', 'Client shows good insight into symptoms and is motivated for treatment.', true, '2024-03-02 15:45:00', '2024-03-02 15:45:00', '2024-03-02 15:45:00'),
('inst0002-0002-0002-0002-000000000002', 7, null, null, null, null, 'Mild Anxiety', 'The client is experiencing mild anxiety symptoms including nervousness, worry, and some difficulty controlling anxious thoughts. Symptoms are manageable but may benefit from intervention.', 'mild', 'mild', 'Consider stress management techniques, relaxation training, and cognitive restructuring. Monitor anxiety levels and provide coping strategies.', 'Anxiety appears related to work stress. Client is receptive to learning coping skills.', true, '2024-03-02 16:10:00', '2024-03-02 16:10:00', '2024-03-02 16:10:00'),
('inst0003-0003-0003-0003-000000000003', 10, null, null, null, null, 'Moderate Depression', 'The client is experiencing moderate depression symptoms consistent with postpartum depression. Symptoms include mood changes, fatigue, sleep disturbance, and some feelings of inadequacy.', 'moderate', 'moderate', 'Postpartum depression treatment recommended. Consider therapy focused on maternal mental health, support groups, and possible medication evaluation. Monitor bonding and parenting stress.', 'Postpartum depression with good prognosis. Client has strong support system.', true, '2024-03-06 10:15:00', '2024-03-06 10:15:00', '2024-03-06 10:15:00'),
('inst0006-0006-0006-0006-000000000006', 4, null, null, null, null, 'Minimal Depression', 'The client is experiencing minimal depression symptoms. Current mood appears stable with only minor symptoms that do not significantly impact functioning.', 'subclinical', 'minimal', 'Continue current coping strategies. Monitor for any changes in mood. Focus on stress management and work-life balance.', 'Work stress is manageable. Client has good coping resources.', true, '2024-03-16 11:05:00', '2024-03-16 11:05:00', '2024-03-16 11:05:00'),
('inst0007-0007-0007-0007-000000000007', 10, null, null, null, null, 'Moderate Anxiety', 'The client is experiencing moderate anxiety symptoms including nervousness, worry, restlessness, and irritability. Symptoms are impacting school and social functioning.', 'moderate', 'moderate', 'Therapy recommended for anxiety management. Consider cognitive behavioral therapy (CBT) for teens, relaxation techniques, and social skills training. Coordinate with school if needed.', 'Teen anxiety with academic and social components. Good family support.', true, '2024-03-21 17:20:00', '2024-03-21 17:20:00', '2024-03-21 17:20:00');

-- Create appointments for active therapy sessions
INSERT INTO appointments (id, therapist_id, client_id, case_id, appointment_date, start_time, end_time, duration_minutes, appointment_type, status, title, notes, created_at) VALUES
-- Sarah Johnson's appointments
('appt0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-08 10:00:00', '2024-03-08 10:00:00', '2024-03-08 10:50:00', 50, 'individual', 'completed', 'Initial Assessment Session', 'Completed intake and initial assessment. Client presented with work-related anxiety.', '2024-03-01 10:00:00'),
('appt0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-15 10:00:00', '2024-03-15 10:00:00', '2024-03-15 10:50:00', 50, 'individual', 'completed', 'CBT Session 1', 'Introduced cognitive behavioral therapy concepts. Identified thought patterns.', '2024-03-08 10:00:00'),
('appt0003-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-22 10:00:00', '2024-03-22 10:00:00', '2024-03-22 10:50:00', 50, 'individual', 'completed', 'CBT Session 2', 'Practiced thought challenging techniques. Assigned homework exercises.', '2024-03-15 10:00:00'),
('appt0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-03-12 14:00:00', '2024-03-12 14:00:00', '2024-03-12 14:50:00', 50, 'individual', 'completed', 'Postpartum Support Session', 'Discussed postpartum adjustment and mood changes. Provided psychoeducation.', '2024-03-05 11:30:00'),
('appt0005-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-03-19 14:00:00', '2024-03-19 14:00:00', '2024-03-19 14:50:00', 50, 'individual', 'completed', 'Parenting Support', 'Worked on bonding strategies and self-care techniques.', '2024-03-12 14:00:00'),

-- Michael Chen's appointments
('appt0006-0006-0006-0006-000000000006', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', '2024-03-19 16:00:00', '2024-03-19 16:00:00', '2024-03-19 16:50:00', 50, 'individual', 'completed', 'Relationship Assessment', 'Individual session to assess relationship dynamics and communication patterns.', '2024-03-12 14:20:00'),
('appt0007-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'case0005-0005-0005-0005-000000000005', '2024-03-22 11:00:00', '2024-03-22 11:00:00', '2024-03-22 11:50:00', 50, 'individual', 'completed', 'Work Stress Management', 'Discussed work-related stressors and coping strategies.', '2024-03-15 16:45:00'),

-- Emily Rodriguez's appointments
('appt0008-0008-0008-0008-000000000008', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', '2024-03-27 15:00:00', '2024-03-27 15:00:00', '2024-03-27 15:50:00', 50, 'individual', 'completed', 'Teen Anxiety Session', 'Worked on anxiety management techniques and school coping strategies.', '2024-03-20 10:30:00'),
('appt0009-0009-0009-0009-000000000009', '33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'case0008-0008-0008-0008-000000000008', '2024-03-29 13:00:00', '2024-03-29 13:00:00', '2024-03-29 13:50:00', 50, 'individual', 'completed', 'Eating Disorder Assessment', 'Initial assessment for eating disorder symptoms and body image concerns.', '2024-03-22 15:00:00');

-- Create session notes for completed appointments
INSERT INTO session_notes (id, appointment_id, therapist_id, client_id, case_id, session_index, content, created_at, updated_at) VALUES
('note0001-0001-0001-0001-000000000001', 'appt0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 1, '{"presenting_issues": "Client reports significant work-related anxiety following recent promotion. Symptoms include persistent worry, difficulty sleeping, and concentration problems.", "interventions_used": "Psychoeducation about anxiety, introduction to CBT model, breathing exercises", "client_response": "Client was engaged and receptive to learning. Demonstrated good understanding of anxiety symptoms.", "homework_assigned": "Daily anxiety monitoring using thought record worksheet. Practice deep breathing exercises twice daily.", "progress_notes": "Client shows good insight and motivation for treatment. Anxiety symptoms are impacting work performance but manageable.", "next_session_plan": "Continue CBT approach, introduce cognitive restructuring techniques, review homework completion"}', '2024-03-08 11:00:00', '2024-03-08 11:00:00'),
('note0002-0002-0002-0002-000000000002', 'appt0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 2, '{"presenting_issues": "Client completed homework assignments and reports some improvement in anxiety awareness. Still experiencing work stress.", "interventions_used": "Cognitive restructuring, thought challenging techniques, problem-solving strategies", "client_response": "Client engaged well with cognitive techniques. Able to identify negative thought patterns.", "homework_assigned": "Continue thought records, practice thought challenging worksheet, implement one problem-solving strategy at work", "progress_notes": "Good progress with CBT techniques. Client developing better awareness of thought-feeling connections.", "next_session_plan": "Review homework, introduce behavioral experiments, discuss workplace communication strategies"}', '2024-03-15 11:00:00', '2024-03-15 11:00:00'),
('note0003-0003-0003-0003-000000000003', 'appt0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 1, '{"presenting_issues": "Client experiencing postpartum depression with mood changes, fatigue, and difficulty bonding with new baby. Reports guilt and overwhelm.", "interventions_used": "Psychoeducation about postpartum depression, normalization of experience, introduction to self-care strategies", "client_response": "Client expressed relief at understanding postpartum depression is common. Motivated to work on symptoms.", "homework_assigned": "Daily mood tracking, schedule pleasant activities, practice self-compassion exercises", "progress_notes": "Client has good support system and insight. Postpartum depression is treatable with good prognosis.", "next_session_plan": "Review mood tracking, work on bonding activities, discuss partner support strategies"}', '2024-03-12 15:00:00', '2024-03-12 15:00:00'),
('note0004-0004-0004-0004-000000000004', 'appt0006-0006-0006-0006-000000000006', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', 1, '{"presenting_issues": "Client reports relationship difficulties with spouse including communication problems and frequent arguments. Considering separation.", "interventions_used": "Assessment of relationship dynamics, communication patterns analysis, introduction to active listening techniques", "client_response": "Initially defensive but became more open during session. Willing to work on communication skills.", "homework_assigned": "Practice active listening exercises, complete relationship satisfaction questionnaire", "progress_notes": "Client shows potential for improvement with communication skills training. Relationship stress is primary concern.", "next_session_plan": "Review homework, introduce conflict resolution strategies, discuss couples therapy options"}', '2024-03-19 17:00:00', '2024-03-19 17:00:00'),
('note0005-0005-0005-0005-000000000005', 'appt0008-0008-0008-0008-000000000008', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 1, '{"presenting_issues": "Teen client reports anxiety about school performance and social situations. Difficulty concentrating and some avoidance behaviors.", "interventions_used": "Rapport building, psychoeducation about teen anxiety, introduction to relaxation techniques", "client_response": "Client was initially quiet but warmed up during session. Interested in learning coping strategies.", "homework_assigned": "Daily anxiety rating scale, practice progressive muscle relaxation, identify anxiety triggers", "progress_notes": "Good therapeutic rapport established. Client motivated to work on anxiety management.", "next_session_plan": "Review homework, introduce cognitive techniques appropriate for teens, discuss school accommodations if needed"}', '2024-03-27 16:00:00', '2024-03-27 16:00:00');

-- Create CBT worksheets for clients
INSERT INTO cbt_worksheets (id, therapist_id, client_id, type, title, content, status, created_at, updated_at) VALUES
('worksheet01-0001-0001-0001-000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'thought_record', 'Work Anxiety Thought Record', '{"situation": "Presenting to management team", "thoughts": "They will think I am incompetent", "emotions": "Anxious, worried", "behaviors": "Avoided eye contact, spoke quietly", "evidence_for": "I stumbled over words once", "evidence_against": "They asked follow-up questions, seemed engaged", "balanced_thought": "I may have been nervous but I provided valuable information", "new_emotion": "Slightly anxious but more confident"}', 'completed', '2024-03-08 11:30:00', '2024-03-15 09:20:00'),
('worksheet02-0002-0002-0002-000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'thought_record', 'Weekly Thought Challenge', '{"situation": "Deadline approaching at work", "thoughts": "I will never finish on time", "emotions": "Panic, overwhelmed", "behaviors": "Procrastinated, avoided starting", "evidence_for": "Lots of work remaining", "evidence_against": "I have met deadlines before, I can break it into smaller tasks", "balanced_thought": "This is challenging but manageable if I plan my time", "new_emotion": "Concerned but motivated"}', 'in_progress', '2024-03-15 11:30:00', '2024-03-20 14:15:00'),
('worksheet03-0003-0003-0003-000000003', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'thought_record', 'Postpartum Thoughts Record', '{"situation": "Baby crying for extended period", "thoughts": "I am a terrible mother", "emotions": "Guilt, sadness, frustration", "behaviors": "Felt like crying, called mother for help", "evidence_for": "Baby seems unhappy", "evidence_against": "All babies cry, I am learning, I care enough to seek help", "balanced_thought": "I am a new mother learning how to care for my baby", "new_emotion": "Frustrated but more self-compassionate"}', 'completed', '2024-03-12 15:30:00', '2024-03-18 10:45:00'),
('worksheet04-0004-0004-0004-000000004', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'thought_record', 'School Anxiety Worksheet', '{"situation": "Taking a test in math class", "thoughts": "I am going to fail", "emotions": "Nervous, scared", "behaviors": "Hands shaking, mind went blank", "evidence_for": "Math is hard for me", "evidence_against": "I studied, I have passed tests before", "balanced_thought": "I can do my best and that is enough", "new_emotion": "Still nervous but more confident"}', 'assigned', '2024-03-27 16:30:00', '2024-03-27 16:30:00');

-- Create therapeutic exercises
INSERT INTO therapeutic_exercises (id, therapist_id, client_id, exercise_type, title, description, game_config, progress, status, created_at, last_played_at) VALUES
('exercise01-0001-0001-0001-000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'breathing', 'Daily Breathing Exercise', 'Practice deep breathing to manage work anxiety', '{"duration": 300, "breath_pattern": "4-4-6", "guidance": true}', '{"sessions_completed": 8, "total_time": 2400, "best_session": 420, "streak_days": 5}', 'in_progress', '2024-03-08 12:00:00', '2024-04-15 08:30:00'),
('exercise02-0002-0002-0002-000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mindfulness', 'Mindful Parenting', 'Mindfulness exercises for new mothers', '{"duration": 600, "type": "guided", "focus": "parenting"}', '{"sessions_completed": 12, "total_time": 7200, "favorite_session": "body_scan", "mindful_moments": 45}', 'in_progress', '2024-03-12 15:30:00', '2024-04-20 19:15:00'),
('exercise03-0003-0003-0003-000000003', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'cognitive_restructuring', 'Teen Thought Challenge Game', 'Interactive scenarios for challenging negative thoughts', '{"difficulty": "beginner", "scenarios": ["school", "social", "family"], "points_system": true}', '{"scenarios_completed": 15, "total_score": 850, "accuracy": 85, "favorite_scenario": "social"}', 'in_progress', '2024-03-27 17:00:00', '2024-04-30 16:45:00'),
('exercise04-0004-0004-0004-000000004', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'breathing', 'Workplace Stress Relief', 'Quick breathing exercises for work breaks', '{"duration": 180, "breath_pattern": "4-7-8", "workplace_friendly": true}', '{"sessions_completed": 6, "total_time": 1080, "work_sessions": 4, "stress_reduction": 7}', 'in_progress', '2024-03-22 12:00:00', '2024-04-22 14:20:00');

-- Create progress tracking entries
INSERT INTO progress_tracking (client_id, metric_type, value, source_type, source_id, recorded_at) VALUES
-- James Wilson progress (anxiety improving)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anxiety_level', 7, 'manual', null, '2024-03-08 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anxiety_level', 6, 'manual', null, '2024-03-15 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anxiety_level', 5, 'manual', null, '2024-03-22 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anxiety_level', 4, 'manual', null, '2024-03-29 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'phq9_total', 11, 'psychometric', 'inst0001-0001-0001-0001-000000000001', '2024-03-02 15:45:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gad7_total', 7, 'psychometric', 'inst0002-0002-0002-0002-000000000002', '2024-03-02 16:10:00'),

-- Maria Garcia progress (postpartum depression improving)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mood_rating', 4, 'manual', null, '2024-03-12 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mood_rating', 5, 'manual', null, '2024-03-19 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mood_rating', 6, 'manual', null, '2024-03-26 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mood_rating', 7, 'manual', null, '2024-04-02 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'phq9_total', 10, 'psychometric', 'inst0003-0003-0003-0003-000000000003', '2024-03-06 10:15:00'),

-- Robert Martinez progress (work stress stable)
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'stress_level', 6, 'manual', null, '2024-03-22 17:00:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'stress_level', 5, 'manual', null, '2024-03-29 17:00:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'stress_level', 5, 'manual', null, '2024-04-05 17:00:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'phq9_total', 4, 'psychometric', 'inst0006-0006-0006-0006-000000000006', '2024-03-16 11:05:00'),

-- Christopher Brown progress (teen anxiety)
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'anxiety_level', 8, 'manual', null, '2024-03-27 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'anxiety_level', 7, 'manual', null, '2024-04-03 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'anxiety_level', 6, 'manual', null, '2024-04-10 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'gad7_total', 10, 'psychometric', 'inst0007-0007-0007-0007-000000000007', '2024-03-21 17:20:00');

-- Create treatment plans
INSERT INTO treatment_plans (id, client_id, therapist_id, title, case_formulation, treatment_approach, estimated_duration, status, created_at, updated_at) VALUES
('plan0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Work Anxiety Management Plan', 'Client presents with work-related anxiety following job promotion. Symptoms include persistent worry, sleep difficulties, and concentration problems. Anxiety appears to be situational and related to increased responsibilities and performance pressure.', 'Cognitive Behavioral Therapy (CBT) with focus on anxiety management, cognitive restructuring, and workplace stress reduction techniques.', '12-16 sessions over 3-4 months', 'active', '2024-03-08 11:30:00', '2024-03-22 10:15:00'),
('plan0002-0002-0002-0002-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Postpartum Depression Treatment', 'Client experiencing postpartum depression with mood changes, bonding difficulties, and adjustment challenges. Symptoms began 4 months postpartum and are impacting daily functioning and maternal confidence.', 'Supportive therapy with CBT elements, maternal mental health focus, and family support integration.', '8-12 sessions over 2-3 months', 'active', '2024-03-12 15:30:00', '2024-03-19 14:45:00'),
('plan0003-0003-0003-0003-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Relationship Communication Plan', 'Client experiencing relationship difficulties with communication problems and conflict. Considering separation but willing to work on relationship skills.', 'Individual therapy focused on communication skills, conflict resolution, and relationship dynamics. Couples therapy to be considered.', '10-15 sessions over 3-4 months', 'active', '2024-03-19 17:30:00', '2024-03-19 17:30:00'),
('plan0004-0004-0004-0004-000000000004', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '33333333-3333-3333-3333-333333333333', 'Teen Anxiety Management', 'Adolescent client with school-related anxiety and social concerns. Symptoms include worry, concentration difficulties, and some avoidance behaviors affecting academic and social functioning.', 'Cognitive Behavioral Therapy adapted for adolescents, anxiety management techniques, and school-based interventions.', '12-16 sessions over 4-5 months', 'active', '2024-03-27 16:30:00', '2024-03-27 16:30:00');

-- Create therapy goals
INSERT INTO therapy_goals (id, treatment_plan_id, goal_text, target_date, progress_percentage, status, notes, created_at, updated_at) VALUES
('goal0001-0001-0001-0001-000000000001', 'plan0001-0001-0001-0001-000000000001', 'Reduce work-related anxiety to manageable levels (anxiety rating 4/10 or below)', '2024-06-01', 60, 'active', 'Client making good progress with CBT techniques. Anxiety levels decreasing steadily.', '2024-03-08 11:45:00', '2024-04-15 14:30:00'),
('goal0002-0002-0002-0002-000000000002', 'plan0001-0001-0001-0001-000000000001', 'Improve sleep quality and duration (7+ hours per night)', '2024-05-15', 40, 'active', 'Sleep hygiene education provided. Client implementing bedtime routine.', '2024-03-08 11:50:00', '2024-04-15 14:30:00'),
('goal0003-0003-0003-0003-000000000003', 'plan0001-0001-0001-0001-000000000001', 'Develop effective workplace communication and assertiveness skills', '2024-06-15', 70, 'active', 'Client practicing assertiveness techniques. Confidence improving in work meetings.', '2024-03-08 11:55:00', '2024-04-15 14:30:00'),
('goal0004-0004-0004-0004-000000000004', 'plan0002-0002-0002-0002-000000000002', 'Improve maternal bonding and confidence', '2024-05-01', 75, 'active', 'Significant improvement in bonding activities. Client reports feeling more confident.', '2024-03-12 16:00:00', '2024-04-20 16:45:00'),
('goal0005-0005-0005-0005-000000000005', 'plan0002-0002-0002-0002-000000000002', 'Reduce postpartum depression symptoms (PHQ-9 score below 5)', '2024-05-15', 50, 'active', 'Mood improving with therapy and support. Client engaging in self-care activities.', '2024-03-12 16:05:00', '2024-04-20 16:45:00'),
('goal0006-0006-0006-0006-000000000006', 'plan0004-0004-0004-0004-000000000004', 'Reduce school-related anxiety and improve academic performance', '2024-07-01', 30, 'active', 'Client learning anxiety management techniques. Some improvement in school participation.', '2024-03-27 17:00:00', '2024-04-30 15:50:00'),
('goal0007-0007-0007-0007-000000000007', 'plan0004-0004-0004-0004-000000000004', 'Develop social confidence and peer relationships', '2024-08-01', 25, 'active', 'Working on social skills. Client showing more interest in peer activities.', '2024-03-27 17:05:00', '2024-04-30 15:50:00');

-- Create in-between session activities
INSERT INTO in_between_sessions (id, case_id, client_id, task_type, task_title, task_data, client_response, mood_rating, client_notes, submitted_at, created_at) VALUES
('between01-0001-0001-0001-000000001', 'case0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mood_log', 'Daily Mood Check-in', '{"questions": ["Rate your anxiety level", "Rate your mood", "Any significant events?"]}', '{"anxiety": 5, "mood": 6, "events": "Big presentation went well"}', 6, 'Feeling more confident after successful presentation. Anxiety was manageable.', '2024-03-10 20:00:00', '2024-03-08 11:30:00'),
('between02-0002-0002-0002-000000002', 'case0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mood_log', 'Daily Mood Check-in', '{"questions": ["Rate your anxiety level", "Rate your mood", "Any significant events?"]}', '{"anxiety": 4, "mood": 7, "events": "Used breathing exercises before meeting"}', 7, 'Breathing exercises really helped today. Felt much calmer in the meeting.', '2024-03-17 19:30:00', '2024-03-15 11:30:00'),
('between03-0003-0003-0003-000000003', 'case0002-0002-0002-0002-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mood_log', 'Postpartum Mood Tracking', '{"questions": ["Rate your mood", "Rate bonding with baby", "Self-care activities"]}', '{"mood": 6, "bonding": 7, "self_care": "Took a bath, called friend"}', 6, 'Had a better day today. Baby seemed more content and I felt more connected.', '2024-03-20 21:00:00', '2024-03-12 15:30:00'),
('between04-0004-0004-0004-000000004', 'case0007-0007-0007-0007-000000000007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'assessment_checkin', 'Weekly Anxiety Check', '{"questions": ["School anxiety level", "Social anxiety level", "Coping strategies used"]}', '{"school_anxiety": 6, "social_anxiety": 7, "coping": "Deep breathing, talked to counselor"}', 6, 'School was stressful this week but I used the breathing techniques we practiced.', '2024-04-05 16:00:00', '2024-03-27 17:00:00');

-- Create some resource library entries
INSERT INTO resource_library (id, title, category, subcategory, description, content_type, content_url, tags, difficulty_level, evidence_level, created_by, is_public, therapist_owner_id, external_url, created_at, updated_at) VALUES
('resource01-0001-0001-0001-000000001', 'Anxiety Management Workbook', 'worksheet', 'anxiety', 'Comprehensive workbook for managing anxiety symptoms with CBT techniques', 'pdf', null, '{"anxiety", "CBT", "self-help", "workbook"}', 'beginner', 'research_based', '11111111-1111-1111-1111-111111111111', true, '11111111-1111-1111-1111-111111111111', 'https://example.com/anxiety-workbook.pdf', '2024-03-01 12:00:00', '2024-03-01 12:00:00'),
('resource02-0002-0002-0002-000000002', 'Postpartum Depression Guide', 'educational', 'depression', 'Educational resource about postpartum depression for new mothers', 'pdf', null, '{"postpartum", "depression", "maternal", "education"}', 'beginner', 'clinical_consensus', '11111111-1111-1111-1111-111111111111', true, '11111111-1111-1111-1111-111111111111', 'https://example.com/postpartum-guide.pdf', '2024-03-05 13:00:00', '2024-03-05 13:00:00'),
('resource03-0003-0003-0003-000000003', 'Teen Anxiety Coping Strategies', 'intervention', 'anxiety', 'Age-appropriate anxiety management techniques for teenagers', 'interactive', null, '{"teen", "anxiety", "coping", "interactive"}', 'intermediate', 'research_based', '33333333-3333-3333-3333-333333333333', true, '33333333-3333-3333-3333-333333333333', 'https://example.com/teen-anxiety-app', '2024-03-20 14:00:00', '2024-03-20 14:00:00'),
('resource04-0004-0004-0004-000000004', 'Mindfulness for Parents', 'intervention', 'mindfulness', 'Mindfulness exercises specifically designed for busy parents', 'audio', null, '{"mindfulness", "parenting", "stress", "audio"}', 'beginner', 'research_based', '22222222-2222-2222-2222-222222222222', true, '22222222-2222-2222-2222-222222222222', 'https://example.com/parent-mindfulness.mp3', '2024-03-15 15:00:00', '2024-03-15 15:00:00');

-- Create some upcoming appointments for testing
INSERT INTO appointments (id, therapist_id, client_id, case_id, appointment_date, start_time, end_time, duration_minutes, appointment_type, status, title, notes, created_at) VALUES
-- Today's appointments (adjust dates as needed for testing)
('appt0010-0010-0010-0010-000000000010', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-05-15 10:00:00', '2024-05-15 10:00:00', '2024-05-15 10:50:00', 50, 'individual', 'scheduled', 'CBT Session 3', 'Continue cognitive restructuring work', '2024-03-22 10:00:00'),
('appt0011-0011-0011-0011-000000000011', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-05-15 14:00:00', '2024-05-15 14:00:00', '2024-05-15 14:50:00', 50, 'individual', 'scheduled', 'Postpartum Follow-up', 'Review progress and bonding activities', '2024-03-19 14:00:00'),
('appt0012-0012-0012-0012-000000000012', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', '2024-05-15 16:00:00', '2024-05-15 16:00:00', '2024-05-15 16:50:00', 50, 'individual', 'scheduled', 'Communication Skills Session', 'Practice conflict resolution techniques', '2024-03-19 16:00:00'),
('appt0013-0013-0013-0013-000000000013', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', '2024-05-16 15:00:00', '2024-05-16 15:00:00', '2024-05-16 15:50:00', 50, 'individual', 'scheduled', 'Teen Anxiety Session 2', 'Review coping strategies and school progress', '2024-03-27 15:00:00');

-- Create some case summaries for supervision
INSERT INTO case_summaries (case_id, title, content, last_highlight, updated_by, updated_at, created_at) VALUES
('case0001-0001-0001-0001-000000000001', 'James Wilson - Work Anxiety Case', '{"summary": "Client with work-related anxiety following promotion. Responding well to CBT interventions.", "key_points": ["Moderate depression and mild anxiety scores", "Good engagement with therapy", "Improving with cognitive restructuring"], "treatment_progress": "60% improvement in anxiety management", "next_steps": ["Continue CBT", "Workplace communication skills", "Relapse prevention"]}', 'Client making excellent progress with CBT techniques. Anxiety levels decreasing and work performance improving. Ready to focus on assertiveness training.', '11111111-1111-1111-1111-111111111111', '2024-04-15 14:30:00', '2024-03-08 11:30:00'),
('case0002-0002-0002-0002-000000000002', 'Maria Garcia - Postpartum Depression', '{"summary": "Postpartum depression with good prognosis. Strong support system and motivated for treatment.", "key_points": ["Moderate depression symptoms", "Bonding difficulties improving", "Excellent family support"], "treatment_progress": "75% improvement in maternal confidence", "next_steps": ["Continue supportive therapy", "Maintain self-care routine", "Monitor mood stability"]}', 'Significant improvement in maternal bonding and mood. Client reports feeling much more confident as a mother and mood has stabilized.', '11111111-1111-1111-1111-111111111111', '2024-04-20 16:45:00', '2024-03-12 15:30:00'),
('case0007-0007-0007-0007-000000000007', 'Christopher Brown - Teen Anxiety', '{"summary": "Adolescent with school and social anxiety. Engaged in treatment and learning coping strategies.", "key_points": ["Moderate anxiety affecting school", "Good therapeutic rapport", "Family supportive of treatment"], "treatment_progress": "30% improvement in anxiety management", "next_steps": ["Continue CBT for teens", "School accommodation planning", "Social skills development"]}', 'Teen client showing good progress with anxiety management techniques. School performance improving and beginning to engage more socially.', '33333333-3333-3333-3333-333333333333', '2024-04-30 15:50:00', '2024-03-27 16:30:00');

-- Create some communication logs
INSERT INTO communication_logs (id, therapist_id, client_id, communication_type, subject, content, direction, status, created_at) VALUES
('comm0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'Appointment Reminder', 'Hi James, this is a reminder about your appointment tomorrow at 10:00 AM. Please bring your completed thought record worksheet. Looking forward to seeing you!', 'outgoing', 'sent', '2024-03-14 16:00:00'),
('comm0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'text', 'Check-in Message', 'Hi Maria, just checking in on how you''re feeling today. Remember to practice the self-care activities we discussed. You''re doing great!', 'outgoing', 'delivered', '2024-03-18 10:00:00'),
('comm0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'text', 'Encouragement Message', 'Hey Christopher! Great job using the breathing exercises at school today. Keep practicing - you''re building important skills!', 'outgoing', 'read', '2024-04-02 15:30:00'),
('comm0004-0004-0004-0004-000000000004', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'email', 'Homework Assignment', 'Hi Lisa, please complete the communication exercises we discussed before our next session. Focus on the active listening techniques. See you next week!', 'outgoing', 'sent', '2024-03-20 17:00:00');

-- Create some audit logs for tracking
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, client_id, details, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'assessment_completed', 'assessment', 'inst0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"assessment": "PHQ-9", "score": 11, "interpretation": "Moderate Depression"}', '2024-03-02 15:45:00'),
('11111111-1111-1111-1111-111111111111', 'assessment_completed', 'assessment', 'inst0002-0002-0002-0002-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"assessment": "GAD-7", "score": 7, "interpretation": "Mild Anxiety"}', '2024-03-02 16:10:00'),
('11111111-1111-1111-1111-111111111111', 'treatment_plan_created', 'treatment_plan', 'plan0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"plan_title": "Work Anxiety Management Plan", "goals_count": 3}', '2024-03-08 11:30:00'),
('11111111-1111-1111-1111-111111111111', 'session_completed', 'appointment', 'appt0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"session_type": "Initial Assessment", "duration": 50}', '2024-03-08 11:00:00'),
('33333333-3333-3333-3333-333333333333', 'assessment_completed', 'assessment', 'inst0007-0007-0007-0007-000000000007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '{"assessment": "GAD-7", "score": 10, "interpretation": "Moderate Anxiety"}', '2024-03-21 17:20:00');

-- Create some form assignments for testing the assignment system
INSERT INTO form_assignments (id, therapist_id, client_id, form_type, title, instructions, due_date, reminder_frequency, status, assigned_at, created_at) VALUES
('form0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'worksheet', 'Panic Attack Coping Worksheet', 'Please complete this worksheet when you experience panic symptoms. Use the techniques we practiced in session.', '2024-05-20', 'weekly', 'assigned', '2024-04-25 12:30:00', '2024-04-25 12:30:00'),
('form0002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'exercise', 'Retirement Adjustment Activities', 'Daily activities to help with retirement transition and social engagement.', '2024-05-25', 'daily', 'in_progress', '2024-04-01 12:30:00', '2024-04-01 12:30:00'),
('form0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'llllllll-llll-llll-llll-llllllllllll', 'assessment', 'Academic Stress Assessment', 'Weekly check-in assessment about school stress and study habits.', '2024-05-18', 'weekly', 'assigned', '2024-04-10 14:00:00', '2024-04-10 14:00:00');

-- Add some recent client activities for the in-between sessions feature
INSERT INTO client_activities (id, client_id, case_id, session_phase, kind, payload, occurred_at, created_by, type, title, details) VALUES
('activity01-0001-0001-0001-000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'between_sessions', 'mood_log', '{"anxiety_level": 4, "mood_rating": 7, "coping_used": ["breathing", "thought_challenging"]}', '2024-04-14 19:00:00', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'self_report', 'Evening Mood Check', 'Used breathing exercises before important meeting. Felt much more confident and calm.'),
('activity02-0002-0002-0002-000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'between_sessions', 'journal', '{"mood": 6, "bonding_activities": ["reading", "singing"], "self_care": "took walk"}', '2024-04-19 20:30:00', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'journal', 'Daily Reflection', 'Had a really good day with the baby. We read books together and I felt very connected. Also took time for myself with a walk.'),
('activity03-0003-0003-0003-000000003', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'between_sessions', 'homework', '{"assignment": "social_interaction", "completed": true, "difficulty": 6}', '2024-04-29 16:45:00', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'homework', 'Social Challenge Completed', 'Successfully started a conversation with a classmate during lunch. It was scary but went better than expected.');

-- Create some session agenda items for the workspace
INSERT INTO session_agenda (id, case_id, therapist_id, source, source_id, title, payload, created_at) VALUES
('agenda01-0001-0001-0001-000000000001', 'case0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'treatment_plan', 'plan0001-0001-0001-0001-000000000001', 'Review anxiety management progress', '{"type": "goal_review", "goal_id": "goal0001-0001-0001-0001-000000000001", "details": "Check progress on anxiety reduction goal"}', '2024-04-15 09:00:00'),
('agenda02-0002-0002-0002-000000000002', 'case0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'client_activity', 'activity01-0001-0001-0001-000000001', 'Discuss successful coping strategy use', '{"type": "activity_review", "activity": "breathing exercises", "details": "Client successfully used breathing before meeting"}', '2024-04-15 09:05:00'),
('agenda03-0003-0003-0003-000000000003', 'case0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'assessment', 'inst0003-0003-0003-0003-000000000003', 'Review PHQ-9 results and progress', '{"type": "assessment_review", "score": 10, "details": "Discuss moderate depression score and treatment response"}', '2024-04-20 13:00:00'),
('agenda04-0004-0004-0004-000000000004', 'case0007-0007-0007-0007-000000000007', '33333333-3333-3333-3333-333333333333', 'homework', null, 'Review social interaction homework', '{"type": "homework_review", "assignment": "social_challenge", "details": "Discuss successful peer interaction"}', '2024-04-30 14:00:00');

-- Create some psychometric forms for the legacy system compatibility
INSERT INTO psychometric_forms (id, therapist_id, client_id, form_type, title, questions, responses, score, status, created_at, completed_at) VALUES
('psych0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'phq9', 'Depression Screening - Recovery Check', '[{"id": "phq9_1", "text": "Little interest or pleasure in doing things", "type": "scale", "scale_min": 0, "scale_max": 3}]', '{"phq9_1": 1, "phq9_2": 1, "phq9_3": 0, "phq9_4": 1, "phq9_5": 0, "phq9_6": 0, "phq9_7": 0, "phq9_8": 0, "phq9_9": 0}', 3, 'completed', '2024-04-01 10:00:00', '2024-04-01 11:30:00'),
('psych0002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'swls', 'Life Satisfaction - Retirement', '[{"id": "swls_1", "text": "In most ways my life is close to my ideal", "type": "scale", "scale_min": 1, "scale_max": 7}]', '{"swls_1": 4, "swls_2": 5, "swls_3": 4, "swls_4": 6, "swls_5": 3}', 22, 'completed', '2024-04-05 14:00:00', '2024-04-05 15:15:00'),
('psych0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'llllllll-llll-llll-llll-llllllllllll', 'gad7', 'Academic Anxiety Assessment', '[{"id": "gad7_1", "text": "Feeling nervous, anxious, or on edge", "type": "scale", "scale_min": 0, "scale_max": 3}]', '{"gad7_1": 2, "gad7_2": 2, "gad7_3": 3, "gad7_4": 1, "gad7_5": 1, "gad7_6": 2, "gad7_7": 2}', 13, 'assigned', '2024-04-10 15:00:00', null);