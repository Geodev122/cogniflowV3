/*
  # Comprehensive Test Data Population
  
  1. Test Therapists and Clients
    - 3 therapists with different specializations
    - 12 clients with varied demographics and conditions
    - Complete professional and clinical profiles
    
  2. Active Cases and Treatment Plans
    - Realistic case scenarios
    - Treatment plans with goals and interventions
    - Progress tracking data
    
  3. Assessment Data
    - Multiple assessment instances at different stages
    - Complete response data and scoring
    - Realistic clinical interpretations
    
  4. Session and Communication Data
    - Appointment history and upcoming sessions
    - Session notes with clinical content
    - Communication logs and client activities
*/

-- ============================================================================
-- TEST THERAPIST PROFILES
-- ============================================================================

INSERT INTO profiles (
  id, role, first_name, last_name, email, phone, whatsapp_number,
  professional_details, verification_status, profile_completion_percentage,
  created_at, updated_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'therapist',
  'Dr. Sarah',
  'Johnson',
  'sarah.johnson@therapist.com',
  '+1-555-0101',
  '+1-555-0101',
  '{
    "specializations": ["Anxiety Disorders", "Depression", "Trauma & PTSD", "Cognitive Behavioral Therapy (CBT)"],
    "languages": ["English", "Spanish"],
    "qualifications": "Ph.D. in Clinical Psychology\\nLicensed Clinical Psychologist (LCP)\\nCertified CBT Therapist\\n10+ years experience",
    "bio": "I specialize in helping individuals overcome anxiety, depression, and trauma through evidence-based approaches. My practice focuses on creating a safe, supportive environment where clients can explore their thoughts and feelings while developing practical coping strategies. I believe in the power of the therapeutic relationship and work collaboratively with each client to achieve their goals.",
    "practice_locations": [
      {"address": "123 Wellness Center, Downtown Medical District", "isPrimary": true},
      {"address": "Online Therapy Sessions Available", "isPrimary": false}
    ],
    "years_experience": 10,
    "license_numbers": ["LCP-12345", "CBT-67890"],
    "education": "Ph.D. Clinical Psychology, University of California"
  }',
  'verified',
  100,
  '2024-01-15 10:00:00',
  '2024-01-15 10:00:00'
),
(
  '22222222-2222-2222-2222-222222222222',
  'therapist',
  'Dr. Michael',
  /* Archived: original content moved to supabase/migrations/archived/20250917144418_fragrant_island.sql */

  -- File archived on 2025-09-20. See archived copy for full content.
  '33333333-3333-3333-3333-333333333333',
  'therapist',
  'Dr. Emily',
  'Rodriguez',
  'emily.rodriguez@therapist.com',
  '+1-555-0103',
  '+1-555-0103',
  '{
    "specializations": ["Child & Adolescent Therapy", "ADHD", "Eating Disorders", "Group Therapy"],
    "languages": ["English", "Spanish", "French"],
    "qualifications": "M.S. in Clinical Psychology\\nLicensed Professional Counselor (LPC)\\nSpecialty in Child and Adolescent Therapy\\nCertified in EMDR\\n12 years experience",
    "bio": "I have dedicated my career to working with children, adolescents, and young adults facing various mental health challenges. My approach is warm, engaging, and tailored to each individual''s developmental needs. I use creative techniques including art therapy, play therapy, and narrative therapy to help young people express themselves and build resilience.",
    "practice_locations": [
      {"address": "789 Youth Mental Health Center, University District", "isPrimary": true},
      {"address": "Online Sessions for Teens and Young Adults", "isPrimary": false}
    ],
    "years_experience": 12,
    "license_numbers": ["LPC-98765", "EMDR-11111"],
    "education": "M.S. Clinical Psychology, University of Texas"
  }',
  'verified',
  100,
  '2024-01-20 14:15:00',
  '2024-01-20 14:15:00'
);

-- ============================================================================
-- TEST CLIENT PROFILES
-- ============================================================================

INSERT INTO profiles (
  id, role, first_name, last_name, email, phone, whatsapp_number,
  patient_code, created_by_therapist, password_set, city, country,
  created_at, updated_at
) VALUES 
-- Dr. Sarah Johnson's clients
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'client', 'James', 'Wilson', 'james.wilson@email.com', '+1-555-1001', '+1-555-1001', 'PT100001', '11111111-1111-1111-1111-111111111111', true, 'Los Angeles', 'USA', '2024-03-01 10:00:00', '2024-03-01 10:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client', 'Maria', 'Garcia', 'maria.garcia@email.com', '+1-555-1002', '+1-555-1002', 'PT100002', '11111111-1111-1111-1111-111111111111', true, 'Los Angeles', 'USA', '2024-03-05 11:30:00', '2024-03-05 11:30:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'client', 'David', 'Thompson', 'david.thompson@email.com', '+1-555-1003', '+1-555-1003', 'PT100003', '11111111-1111-1111-1111-111111111111', true, 'Beverly Hills', 'USA', '2024-03-10 09:15:00', '2024-03-10 09:15:00'),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'client', 'Rachel', 'Wilson', 'rachel.wilson@email.com', '+1-555-1010', '+1-555-1010', 'PT100010', '11111111-1111-1111-1111-111111111111', true, 'Santa Monica', 'USA', '2024-03-28 09:20:00', '2024-03-28 09:20:00'),

-- Dr. Michael Chen's clients  
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'client', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '+1-555-1004', '+1-555-1004', 'PT100004', '22222222-2222-2222-2222-222222222222', true, 'Pasadena', 'USA', '2024-03-12 14:20:00', '2024-03-12 14:20:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'client', 'Robert', 'Martinez', 'robert.martinez@email.com', '+1-555-1005', '+1-555-1005', 'PT100005', '22222222-2222-2222-2222-222222222222', true, 'Glendale', 'USA', '2024-03-15 16:45:00', '2024-03-15 16:45:00'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'client', 'Jennifer', 'Taylor', 'jennifer.taylor@email.com', '+1-555-1006', '+1-555-1006', 'PT100006', '22222222-2222-2222-2222-222222222222', true, 'Burbank', 'USA', '2024-03-18 13:10:00', '2024-03-18 13:10:00'),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'client', 'Daniel', 'Moore', 'daniel.moore@email.com', '+1-555-1011', '+1-555-1011', 'PT100011', '22222222-2222-2222-2222-222222222222', true, 'Long Beach', 'USA', '2024-04-01 12:00:00', '2024-04-01 12:00:00'),

-- Dr. Emily Rodriguez's clients
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'client', 'Christopher', 'Brown', 'chris.brown@email.com', '+1-555-1007', '+1-555-1007', 'PT100007', '33333333-3333-3333-3333-333333333333', true, 'Irvine', 'USA', '2024-03-20 10:30:00', '2024-03-20 10:30:00'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'client', 'Amanda', 'Davis', 'amanda.davis@email.com', '+1-555-1008', '+1-555-1008', 'PT100008', '33333333-3333-3333-3333-333333333333', true, 'Orange County', 'USA', '2024-03-22 15:00:00', '2024-03-22 15:00:00'),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'client', 'Kevin', 'Miller', 'kevin.miller@email.com', '+1-555-1009', '+1-555-1009', 'PT100009', '33333333-3333-3333-3333-333333333333', true, 'Anaheim', 'USA', '2024-03-25 11:45:00', '2024-03-25 11:45:00'),
('llllllll-llll-llll-llll-llllllllllll', 'client', 'Sophie', 'Clark', 'sophie.clark@email.com', '+1-555-1012', '+1-555-1012', 'PT100012', '33333333-3333-3333-3333-333333333333', true, 'Newport Beach', 'USA', '2024-04-03 14:30:00', '2024-04-03 14:30:00');

-- ============================================================================
-- THERAPIST-CLIENT RELATIONSHIPS
-- ============================================================================

INSERT INTO therapist_client_relations (therapist_id, client_id, status, created_at) VALUES
-- Dr. Sarah Johnson's clients
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', '2024-03-01 10:00:00'),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', '2024-03-05 11:30:00'),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active', '2024-03-10 09:15:00'),
('11111111-1111-1111-1111-111111111111', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'active', '2024-03-28 09:20:00'),

-- Dr. Michael Chen's clients
('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', '2024-03-12 14:20:00'),
('22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'active', '2024-03-15 16:45:00'),
('22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'active', '2024-03-18 13:10:00'),
('22222222-2222-2222-2222-222222222222', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'active', '2024-04-01 12:00:00'),

-- Dr. Emily Rodriguez's clients
('33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'active', '2024-03-20 10:30:00'),
('33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'active', '2024-03-22 15:00:00'),
('33333333-3333-3333-3333-333333333333', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'active', '2024-03-25 11:45:00'),
('33333333-3333-3333-3333-333333333333', 'llllllll-llll-llll-llll-llllllllllll', 'active', '2024-04-03 14:30:00');

-- ============================================================================
-- DETAILED CLIENT PROFILES
-- ============================================================================

INSERT INTO client_profiles (
  client_id, therapist_id, emergency_contact_name, emergency_contact_phone, 
  emergency_contact_relationship, date_of_birth, gender, address,
  medical_history, current_medications, presenting_concerns, therapy_history,
  risk_level, notes, intake_completed_at, created_at, updated_at
) VALUES 
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Susan Wilson', '+1-555-2001', 'spouse',
  '1985-06-15', 'male', '123 Main St, Los Angeles, CA 90210',
  'History of hypertension, managed with medication. No significant psychiatric hospitalizations.',
  'Lisinopril 10mg daily, Multivitamin',
  'Experiencing persistent anxiety and worry about work performance. Reports difficulty sleeping and concentrating. Symptoms began approximately 6 months ago following a job promotion to senior management role. Client describes feeling overwhelmed by new responsibilities and fear of failure.',
  'No previous therapy experience. Interested in learning coping strategies. Has read self-help books about anxiety.',
  'low',
  'Client is highly motivated and engaged in treatment. Responds well to CBT techniques and homework assignments. Making steady progress with anxiety management. Strong support system at home. Excellent insight into symptoms and triggers.',
  '2024-03-01 10:00:00',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Carlos Garcia', '+1-555-2002', 'spouse',
  '1990-03-22', 'female', '456 Oak Ave, Los Angeles, CA 90211',
  'Postpartum depression following birth of second child. No other significant medical history. Normal pregnancy and delivery.',
  'Prenatal vitamins, Iron supplement',
  'Mood changes, tearfulness, and feelings of overwhelm since childbirth 4 months ago. Difficulty bonding with new baby and guilt about parenting abilities. Reports feeling like a failure as a mother despite having successfully raised first child.',
  'Brief counseling during college for academic stress. Positive experience with supportive therapy.',
  'moderate',
  'Excellent insight and motivation for treatment. Benefiting from supportive therapy and practical parenting strategies. Mood improving steadily with treatment. Strong family support system. Bonding with baby improving significantly.',
  '2024-03-05 11:30:00',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Margaret Thompson', '+1-555-2003', 'mother',
  '1978-11-08', 'male', '789 Pine St, Beverly Hills, CA 90212',
  'Type 2 diabetes, well-controlled with medication. History of panic attacks starting 3 years ago.',
  'Metformin 500mg twice daily, Lorazepam 0.5mg as needed for panic',
  'Recurrent panic attacks and agoraphobic avoidance. Difficulty leaving home for work and social activities. Symptoms significantly worsened during COVID-19 pandemic. Now avoiding grocery stores, restaurants, and social gatherings.',
  'Previous therapy 5 years ago for panic disorder with good results using CBT. Relapse during COVID-19 pandemic due to health anxiety.',
  'moderate',
  'Highly motivated client with good understanding of anxiety and panic. Responding well to gradual exposure therapy and relaxation techniques. Previous positive therapy experience is helpful. Making steady progress with agoraphobic avoidance.',
  '2024-03-10 09:15:00',
  '2024-03-10 09:15:00',
  '2024-04-25 12:20:00'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'John Anderson', '+1-555-2004', 'spouse',
  '1982-09-12', 'female', '321 Elm St, Pasadena, CA 91101',
  'No significant medical history. Generally healthy.',
  'None currently',
  'Relationship difficulties with spouse of 8 years. Communication problems and frequent arguments about finances, parenting, and household responsibilities. Considering separation but wants to try therapy first.',
  'No previous therapy experience. Initially reluctant but willing to try couples counseling.',
  'low',
  'Initially resistant to therapy but becoming more engaged over time. Learning communication skills and conflict resolution strategies. Showing improvement in active listening and emotional regulation during conflicts.',
  '2024-03-12 14:20:00',
  '2024-03-12 14:20:00',
  '2024-04-18 10:15:00'
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'Ana Martinez', '+1-555-2005', 'sister',
  '1975-07-30', 'male', '654 Maple Dr, Glendale, CA 91201',
  'Chronic back pain from work injury 2 years ago. Sleep difficulties related to pain.',
  'Ibuprofen 400mg as needed for pain, Melatonin 3mg at bedtime',
  'Work-related stress and chronic pain affecting mood and relationships. Feeling overwhelmed by financial pressures due to reduced work capacity. Worried about job security and family financial stability.',
  'No previous therapy experience. Open to learning stress management techniques.',
  'low',
  'Hardworking individual dealing with multiple stressors including chronic pain and financial concerns. Benefiting from stress management techniques and pain coping strategies. Learning to pace activities and communicate needs effectively.',
  '2024-03-15 16:45:00',
  '2024-03-15 16:45:00',
  '2024-04-22 13:40:00'
),
(
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',
  'Patricia Brown', '+1-555-2007', 'mother',
  '2008-04-18', 'male', '987 Cedar Ln, Irvine, CA 92602',
  'ADHD diagnosed in childhood, currently unmedicated. No other significant medical history.',
  'None currently - discontinued ADHD medication 6 months ago',
  'Academic difficulties and social anxiety at high school. Trouble focusing in classes and completing assignments. Difficulty making friends and low self-esteem. Parents concerned about declining grades.',
  'No previous therapy experience. Some school counseling for academic support.',
  'low',
  'Bright teenager with ADHD-related challenges affecting academic and social functioning. Responding well to CBT techniques and social skills training. Building confidence and developing better study strategies.',
  '2024-03-20 10:30:00',
  '2024-03-20 10:30:00',
  '2024-04-30 15:50:00'
),
(
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  '33333333-3333-3333-3333-333333333333',
  'Richard Davis', '+1-555-2008', 'father',
  '2006-12-03', 'female', '147 Birch St, Orange County, CA 92660',
  'No significant medical history. Generally healthy adolescent.',
  'None currently',
  'Body image concerns and restrictive eating patterns developing over past 8 months. Excessive exercise (2+ hours daily) and calorie counting. Social withdrawal from friends and family activities. Weight loss of 15 pounds.',
  'No previous therapy experience. Family very concerned about eating behaviors and social isolation.',
  'high',
  'Developing eating disorder requiring careful monitoring and specialized treatment. Working on body image distortions and establishing healthy eating patterns. Family therapy component included for support.',
  '2024-03-22 15:00:00',
  '2024-03-22 15:00:00',
  '2024-05-01 09:30:00'
),
(
  'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
  '33333333-3333-3333-3333-333333333333',
  'Carol Miller', '+1-555-2009', 'mother',
  '2007-08-25', 'male', '258 Willow Way, Anaheim, CA 92801',
  'Asthma, well-controlled with rescue inhaler. No other significant medical issues.',
  'Albuterol inhaler as needed for asthma',
  'Grief and loss following death of beloved grandmother 3 months ago. Difficulty concentrating in school and withdrawal from previously enjoyed activities. Close relationship with grandmother who helped raise him.',
  'No previous therapy experience. Family supportive of counseling.',
  'low',
  'Processing grief in developmentally appropriate way. Developing healthy coping strategies and reconnecting with support systems. Good family support and therapeutic engagement.',
  '2024-03-25 11:45:00',
  '2024-03-25 11:45:00',
  '2024-05-02 14:15:00'
),
(
  'llllllll-llll-llll-llll-llllllllllll',
  '33333333-3333-3333-3333-333333333333',
  'Steven Clark', '+1-555-2012', 'father',
  '2006-01-14', 'female', '369 Spruce Ave, Newport Beach, CA 92660',
  'No significant medical history. High-achieving student.',
  'None currently',
  'Academic pressure and perfectionism causing significant stress. Anxiety about college applications and future career choices. Sleep difficulties due to worry. Extremely high standards for academic performance.',
  'No previous therapy experience. Academically gifted student.',
  'low',
  'High-achieving student learning to manage perfectionism and academic pressure. Developing healthy study habits and stress management skills. Working on realistic goal-setting and self-compassion.',
  '2024-04-03 14:30:00',
  '2024-04-03 14:30:00',
  '2024-05-10 13:55:00'
);

-- ============================================================================
-- ACTIVE CASES
-- ============================================================================

INSERT INTO cases (
  id, client_id, therapist_id, case_number, status, current_phase,
  diagnosis_codes, formulation, intake_data, treatment_plan,
  opened_at, created_at, updated_at
) VALUES 
(
  'case0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'CASE-2024-001',
  'active',
  'active_treatment',
  ARRAY['F41.1', 'Z56.9'],
  'Client presents with work-related anxiety disorder following recent job promotion. Cognitive factors include catastrophic thinking about work performance and fear of failure. Behavioral factors include avoidance of challenging tasks and procrastination. Environmental factors include increased work demands and pressure. Maintaining factors include perfectionist thinking patterns and lack of assertiveness skills.',
  '{
    "presenting_problem": "Work-related anxiety following promotion",
    "onset": "6 months ago",
    "triggers": ["work presentations", "deadlines", "performance reviews"],
    "current_functioning": "Moderate impairment in work performance",
    "support_system": "Strong - spouse and family",
    "motivation": "High - wants to succeed in new role"
  }',
  '{
    "general_aim": "Reduce work-related anxiety and improve job performance confidence",
    "goals": [
      {
        "id": "goal_001",
        "title": "Reduce anxiety to manageable levels (4/10 or below)",
        "target_date": "2024-06-01",
        "progress": 60,
        "status": "active",
        "interventions": ["CBT", "exposure therapy", "relaxation training"]
      },
      {
        "id": "goal_002", 
        "title": "Improve sleep quality (7+ hours nightly)",
        "target_date": "2024-05-15",
        "progress": 40,
        "status": "active",
        "interventions": ["sleep hygiene", "relaxation techniques"]
      },
      {
        "id": "goal_003",
        "title": "Develop workplace assertiveness skills",
        "target_date": "2024-06-15",
        "progress": 70,
        "status": "active",
        "interventions": ["assertiveness training", "role-playing", "behavioral experiments"]
      }
    ],
    "interventions": [
      {"type": "assessment", "name": "PHQ-9", "frequency": "bi-weekly"},
      {"type": "assessment", "name": "GAD-7", "frequency": "weekly"},
      {"type": "worksheet", "name": "Thought Record", "frequency": "daily"},
      {"type": "exercise", "name": "Breathing Exercises", "frequency": "twice daily"}
    ]
  }',
  '2024-03-01 10:00:00',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00'
),
(
  'case0002-0002-0002-0002-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'CASE-2024-002',
  'active',
  'stabilization',
  ARRAY['F53.0'],
  'Client experiencing postpartum depression with onset 4 months after delivery of second child. Cognitive factors include negative self-evaluation as a mother and catastrophic thinking about baby''s wellbeing. Behavioral factors include social withdrawal and reduced self-care. Biological factors include hormonal changes and sleep deprivation.',
  '{
    "presenting_problem": "Postpartum depression with bonding difficulties",
    "onset": "4 months postpartum",
    "triggers": ["baby crying", "parenting challenges", "sleep deprivation"],
    "current_functioning": "Mild to moderate impairment in daily activities",
    "support_system": "Excellent - spouse, family, friends",
    "motivation": "Very high - wants to be best mother possible"
  }',
  '{
    "general_aim": "Resolve postpartum depression and improve maternal confidence",
    "goals": [
      {
        "id": "goal_004",
        "title": "Improve maternal bonding and confidence",
        "target_date": "2024-05-01",
        "progress": 75,
        "status": "active",
        "interventions": ["bonding activities", "self-compassion work", "parenting skills"]
      },
      {
        "id": "goal_005",
        "title": "Reduce depression symptoms (PHQ-9 < 5)",
        "target_date": "2024-05-15", 
        "progress": 50,
        "status": "active",
        "interventions": ["CBT", "behavioral activation", "support groups"]
      }
    ]
  }',
  '2024-03-05 11:30:00',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00'
),
(
  'case0007-0007-0007-0007-000000000007',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',
  'CASE-2024-007',
  'active',
  'assessment',
  ARRAY['F41.9', 'F90.9'],
  'Adolescent client with generalized anxiety disorder and ADHD-related academic difficulties. Cognitive factors include perfectionist thinking and catastrophic predictions about academic failure. Social factors include peer comparison and social anxiety. Academic factors include attention difficulties and executive function challenges.',
  '{
    "presenting_problem": "School anxiety and academic difficulties",
    "onset": "Beginning of current school year",
    "triggers": ["tests", "presentations", "social situations"],
    "current_functioning": "Moderate impairment in academic and social domains",
    "support_system": "Good - family support, some peer relationships",
    "motivation": "Moderate - wants to do well but feels overwhelmed"
  }',
  '{
    "general_aim": "Reduce anxiety and improve academic and social functioning",
    "goals": [
      {
        "id": "goal_006",
        "title": "Reduce school-related anxiety",
        "target_date": "2024-07-01",
        "progress": 30,
        "status": "active",
        "interventions": ["CBT for teens", "exposure therapy", "relaxation training"]
      },
      {
        "id": "goal_007",
        "title": "Develop social confidence and peer relationships",
        "target_date": "2024-08-01",
        "progress": 25,
        "status": "active",
        "interventions": ["social skills training", "group therapy", "peer interaction exercises"]
      }
    ]
  }',
  '2024-03-20 10:30:00',
  '2024-03-20 10:30:00',
  '2024-04-30 15:50:00'
);

-- ============================================================================
-- ASSESSMENT INSTANCES WITH REALISTIC SCENARIOS
-- ============================================================================

INSERT INTO assessment_instances (
  id, template_id, therapist_id, client_id, case_id, title, instructions,
  status, assigned_at, due_date, started_at, completed_at,
  reminder_frequency, metadata, created_at, updated_at
) VALUES 
-- James Wilson assessments (completed)
(
  'inst0001-0001-0001-0001-000000000001',
  'template-phq9-standard-v1',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'Initial Depression Screening - PHQ-9',
  'Please complete this assessment to help us understand your current mood and any depression symptoms you may be experiencing.',
  'completed',
  '2024-03-01 10:30:00',
  '2024-03-08 23:59:59',
  '2024-03-02 14:20:00',
  '2024-03-02 15:45:00',
  'none',
  '{"priority": "high", "clinical_context": "initial_assessment"}',
  '2024-03-01 10:30:00',
  '2024-03-02 15:45:00'
),
(
  'inst0002-0002-0002-0002-000000000002',
  'template-gad7-standard-v1',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'Anxiety Assessment - GAD-7',
  'This assessment will help us understand your anxiety levels and develop appropriate treatment strategies.',
  'completed',
  '2024-03-01 10:35:00',
  '2024-03-08 23:59:59',
  '2024-03-02 15:50:00',
  '2024-03-02 16:10:00',
  'none',
  '{"priority": "high", "clinical_context": "initial_assessment"}',
  '2024-03-01 10:35:00',
  '2024-03-02 16:10:00'
),

-- Maria Garcia assessments (postpartum)
(
  'inst0003-0003-0003-0003-000000000003',
  'template-phq9-standard-v1',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  'Postpartum Depression Screening',
  'This screening will help assess your mood and any depression symptoms following childbirth.',
  'completed',
  '2024-03-05 12:00:00',
  '2024-03-12 23:59:59',
  '2024-03-06 09:30:00',
  '2024-03-06 10:15:00',
  'daily',
  '{"priority": "high", "clinical_context": "postpartum_screening"}',
  '2024-03-05 12:00:00',
  '2024-03-06 10:15:00'
),

-- David Thompson assessment (in progress)
(
  'inst0004-0004-0004-0004-000000000004',
  'template-gad7-standard-v1',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'case0003-0003-0003-0003-000000000003',
  'Panic Disorder Assessment',
  'Please complete this assessment to help us understand your anxiety and panic symptoms.',
  'in_progress',
  '2024-03-10 10:00:00',
  '2024-03-17 23:59:59',
  '2024-03-11 14:30:00',
  null,
  'weekly',
  '{"priority": "medium", "clinical_context": "panic_assessment"}',
  '2024-03-10 10:00:00',
  '2024-03-11 14:30:00'
),

-- Lisa Anderson assessment (assigned)
(
  'inst0005-0005-0005-0005-000000000005',
  'template-swls-standard-v1',
  '22222222-2222-2222-2222-222222222222',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'case0004-0004-0004-0004-000000000004',
  'Life Satisfaction Assessment',
  'This assessment will help us understand your overall life satisfaction and identify areas for improvement.',
  'assigned',
  '2024-03-12 15:00:00',
  '2024-03-19 23:59:59',
  null,
  null,
  'before_due',
  '{"priority": "medium", "clinical_context": "relationship_assessment"}',
  '2024-03-12 15:00:00',
  '2024-03-12 15:00:00'
),

-- Christopher Brown assessment (teen anxiety)
(
  'inst0007-0007-0007-0007-000000000007',
  'template-gad7-standard-v1',
  '33333333-3333-3333-3333-333333333333',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  'case0007-0007-0007-0007-000000000007',
  'Teen Anxiety Assessment',
  'This assessment will help us understand how you have been feeling lately and develop strategies to help you feel better.',
  'completed',
  '2024-03-20 11:00:00',
  '2024-03-27 23:59:59',
  '2024-03-21 16:45:00',
  '2024-03-21 17:20:00',
  'daily',
  '{"priority": "high", "clinical_context": "teen_anxiety"}',
  '2024-03-20 11:00:00',
  '2024-03-21 17:20:00'
),

-- Amanda Davis assessment (eating disorder - assigned)
(
  'inst0008-0008-0008-0008-000000000008',
  'template-swls-standard-v1',
  '33333333-3333-3333-3333-333333333333',
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'case0008-0008-0008-0008-000000000008',
  'Life Satisfaction - Eating Disorder Recovery',
  'Please rate your satisfaction with different areas of your life. This will help us understand how you are feeling overall.',
  'assigned',
  '2024-03-22 15:30:00',
  '2024-03-29 23:59:59',
  null,
  null,
  'weekly',
  '{"priority": "high", "clinical_context": "eating_disorder_assessment"}',
  '2024-03-22 15:30:00',
  '2024-03-22 15:30:00'
);

-- ============================================================================
-- ASSESSMENT RESPONSES FOR COMPLETED ASSESSMENTS
-- ============================================================================

-- James Wilson PHQ-9 responses (moderate depression score: 11)
INSERT INTO assessment_responses (instance_id, question_id, item_id, response_value, response_timestamp, is_final, created_at, updated_at) VALUES
('inst0001-0001-0001-0001-000000000001', 'phq9_1', 'phq9_1', 2, '2024-03-02 15:30:00', true, '2024-03-02 15:30:00', '2024-03-02 15:30:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_2', 'phq9_2', 2, '2024-03-02 15:31:00', true, '2024-03-02 15:31:00', '2024-03-02 15:31:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_3', 'phq9_3', 1, '2024-03-02 15:32:00', true, '2024-03-02 15:32:00', '2024-03-02 15:32:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_4', 'phq9_4', 2, '2024-03-02 15:33:00', true, '2024-03-02 15:33:00', '2024-03-02 15:33:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_5', 'phq9_5', 1, '2024-03-02 15:34:00', true, '2024-03-02 15:34:00', '2024-03-02 15:34:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_6', 'phq9_6', 2, '2024-03-02 15:35:00', true, '2024-03-02 15:35:00', '2024-03-02 15:35:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_7', 'phq9_7', 1, '2024-03-02 15:36:00', true, '2024-03-02 15:36:00', '2024-03-02 15:36:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_8', 'phq9_8', 0, '2024-03-02 15:37:00', true, '2024-03-02 15:37:00', '2024-03-02 15:37:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_9', 'phq9_9', 0, '2024-03-02 15:38:00', true, '2024-03-02 15:38:00', '2024-03-02 15:38:00');

-- James Wilson GAD-7 responses (mild anxiety score: 7)
INSERT INTO assessment_responses (instance_id, question_id, item_id, response_value, response_timestamp, is_final, created_at, updated_at) VALUES
('inst0002-0002-0002-0002-000000000002', 'gad7_1', 'gad7_1', 1, '2024-03-02 15:55:00', true, '2024-03-02 15:55:00', '2024-03-02 15:55:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_2', 'gad7_2', 2, '2024-03-02 15:56:00', true, '2024-03-02 15:56:00', '2024-03-02 15:56:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_3', 'gad7_3', 1, '2024-03-02 15:57:00', true, '2024-03-02 15:57:00', '2024-03-02 15:57:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_4', 'gad7_4', 1, '2024-03-02 15:58:00', true, '2024-03-02 15:58:00', '2024-03-02 15:58:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_5', 'gad7_5', 0, '2024-03-02 15:59:00', true, '2024-03-02 15:59:00', '2024-03-02 15:59:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_6', 'gad7_6', 1, '2024-03-02 16:00:00', true, '2024-03-02 16:00:00', '2024-03-02 16:00:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_7', 'gad7_7', 1, '2024-03-02 16:01:00', true, '2024-03-02 16:01:00', '2024-03-02 16:01:00');

-- Maria Garcia PHQ-9 responses (mild depression score: 10)
INSERT INTO assessment_responses (instance_id, question_id, item_id, response_value, response_timestamp, is_final, created_at, updated_at) VALUES
('inst0003-0003-0003-0003-000000000003', 'phq9_1', 'phq9_1', 1, '2024-03-06 09:35:00', true, '2024-03-06 09:35:00', '2024-03-06 09:35:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_2', 'phq9_2', 2, '2024-03-06 09:36:00', true, '2024-03-06 09:36:00', '2024-03-06 09:36:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_3', 'phq9_3', 2, '2024-03-06 09:37:00', true, '2024-03-06 09:37:00', '2024-03-06 09:37:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_4', 'phq9_4', 2, '2024-03-06 09:38:00', true, '2024-03-06 09:38:00', '2024-03-06 09:38:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_5', 'phq9_5', 1, '2024-03-06 09:39:00', true, '2024-03-06 09:39:00', '2024-03-06 09:39:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_6', 'phq9_6', 1, '2024-03-06 09:40:00', true, '2024-03-06 09:40:00', '2024-03-06 09:40:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_7', 'phq9_7', 1, '2024-03-06 09:41:00', true, '2024-03-06 09:41:00', '2024-03-06 09:41:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_8', 'phq9_8', 0, '2024-03-06 09:42:00', true, '2024-03-06 09:42:00', '2024-03-06 09:42:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_9', 'phq9_9', 0, '2024-03-06 09:43:00', true, '2024-03-06 09:43:00', '2024-03-06 09:43:00');

-- Christopher Brown GAD-7 responses (moderate anxiety score: 10)
INSERT INTO assessment_responses (instance_id, question_id, item_id, response_value, response_timestamp, is_final, created_at, updated_at) VALUES
('inst0007-0007-0007-0007-000000000007', 'gad7_1', 'gad7_1', 2, '2024-03-21 16:50:00', true, '2024-03-21 16:50:00', '2024-03-21 16:50:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_2', 'gad7_2', 1, '2024-03-21 16:51:00', true, '2024-03-21 16:51:00', '2024-03-21 16:51:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_3', 'gad7_3', 2, '2024-03-21 16:52:00', true, '2024-03-21 16:52:00', '2024-03-21 16:52:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_4', 'gad7_4', 1, '2024-03-21 16:53:00', true, '2024-03-21 16:53:00', '2024-03-21 16:53:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_5', 'gad7_5', 1, '2024-03-21 16:54:00', true, '2024-03-21 16:54:00', '2024-03-21 16:54:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_6', 'gad7_6', 2, '2024-03-21 16:55:00', true, '2024-03-21 16:55:00', '2024-03-21 16:55:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_7', 'gad7_7', 1, '2024-03-21 16:56:00', true, '2024-03-21 16:56:00', '2024-03-21 16:56:00');

-- ============================================================================
-- ASSESSMENT SCORES AND INTERPRETATIONS
-- ============================================================================

INSERT INTO assessment_scores (
  instance_id, raw_score, interpretation_category, interpretation_description,
  clinical_significance, severity_level, recommendations, therapist_notes,
  auto_generated, calculated_at, created_at, updated_at
) VALUES 
(
  'inst0001-0001-0001-0001-000000000001',
  11,
  'Moderate Depression',
  'The client is experiencing moderate depression symptoms that are interfering with daily functioning. Symptoms include decreased interest in activities, depressed mood, sleep difficulties, fatigue, and some concentration problems. The score indicates clinically significant depression requiring professional intervention.',
  'moderate',
  'moderate',
  'Therapy recommended for depression management. Consider cognitive behavioral therapy (CBT) and behavioral activation techniques. Monitor for symptom progression and assess need for medication evaluation. Focus on work-related stressors and coping strategies.',
  'Client shows good insight into symptoms and is motivated for treatment. Work-related anxiety appears to be contributing to depressive symptoms.',
  true,
  '2024-03-02 15:45:00',
  '2024-03-02 15:45:00',
  '2024-03-02 15:45:00'
),
(
  'inst0002-0002-0002-0002-000000000002',
  7,
  'Mild Anxiety',
  'The client is experiencing mild anxiety symptoms including nervousness, worry, and some difficulty controlling anxious thoughts. Symptoms are manageable but may benefit from intervention to prevent progression.',
  'mild',
  'mild',
  'Consider stress management techniques, relaxation training, and cognitive restructuring. Monitor anxiety levels and provide coping strategies. Focus on work-related triggers and performance anxiety.',
  'Anxiety appears directly related to work stress and new job responsibilities. Client is receptive to learning coping skills.',
  true,
  '2024-03-02 16:10:00',
  '2024-03-02 16:10:00',
  '2024-03-02 16:10:00'
),
(
  'inst0003-0003-0003-0003-000000000003',
  10,
  'Moderate Depression',
  'The client is experiencing moderate depression symptoms consistent with postpartum depression. Symptoms include mood changes, fatigue, sleep disturbance, and feelings of inadequacy as a mother. This is a treatable condition with good prognosis.',
  'moderate',
  'moderate',
  'Postpartum depression treatment recommended. Consider therapy focused on maternal mental health, support groups, and possible medication evaluation if symptoms persist. Monitor mother-infant bonding and provide parenting support.',
  'Postpartum depression with good prognosis given strong support system and client motivation. Bonding concerns are improving with intervention.',
  true,
  '2024-03-06 10:15:00',
  '2024-03-06 10:15:00',
  '2024-03-06 10:15:00'
),
(
  'inst0007-0007-0007-0007-000000000007',
  10,
  'Moderate Anxiety',
  'The client is experiencing moderate anxiety symptoms including nervousness, worry, restlessness, and irritability. Symptoms are impacting school performance and social functioning, which is common in adolescents with anxiety disorders.',
  'moderate',
  'moderate',
  'Therapy recommended for anxiety management. Consider cognitive behavioral therapy (CBT) adapted for adolescents, relaxation techniques, and social skills training. Coordinate with school counselors if needed for academic accommodations.',
  'Teen anxiety with both academic and social components. Good family support and therapeutic engagement. Client is motivated to learn coping strategies.',
  true,
  '2024-03-21 17:20:00',
  '2024-03-21 17:20:00',
  '2024-03-21 17:20:00'
);

-- ============================================================================
-- APPOINTMENTS AND SESSION HISTORY
-- ============================================================================

INSERT INTO appointments (
  id, therapist_id, client_id, case_id, appointment_date, start_time, end_time,
  duration_minutes, appointment_type, status, title, notes, location, created_at
) VALUES 
-- Dr. Sarah Johnson's completed sessions
(
  'appt0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '2024-03-08 10:00:00',
  '2024-03-08 10:00:00',
  '2024-03-08 10:50:00',
  50,
  'individual',
  'completed',
  'Initial Assessment Session',
  'Completed comprehensive intake and initial assessment. Client presented with significant work-related anxiety following recent promotion.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-01 10:00:00'
),
(
  'appt0002-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '2024-03-15 10:00:00',
  '2024-03-15 10:00:00',
  '2024-03-15 10:50:00',
  50,
  'individual',
  'completed',
  'CBT Session 1 - Cognitive Restructuring',
  'Introduced cognitive behavioral therapy concepts. Identified negative thought patterns and cognitive distortions.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-08 10:00:00'
),
(
  'appt0003-0003-0003-0003-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '2024-03-22 10:00:00',
  '2024-03-22 10:00:00',
  '2024-03-22 10:50:00',
  50,
  'individual',
  'completed',
  'CBT Session 2 - Thought Challenging',
  'Practiced thought challenging techniques and behavioral experiments. Assigned homework exercises for workplace situations.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-15 10:00:00'
),

-- Maria Garcia sessions
(
  'appt0004-0004-0004-0004-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  '2024-03-12 14:00:00',
  '2024-03-12 14:00:00',
  '2024-03-12 14:50:00',
  50,
  'individual',
  'completed',
  'Postpartum Support Session',
  'Discussed postpartum adjustment and mood changes. Provided psychoeducation about postpartum depression.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-05 11:30:00'
),

-- Christopher Brown session
(
  'appt0008-0008-0008-0008-000000000008',
  '33333333-3333-3333-3333-333333333333',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  'case0007-0007-0007-0007-000000000007',
  '2024-03-27 15:00:00',
  '2024-03-27 15:00:00',
  '2024-03-27 15:50:00',
  50,
  'individual',
  'completed',
  'Teen Anxiety Session - Coping Strategies',
  'Worked on anxiety management techniques specifically for school situations and social interactions.',
  '789 Youth Mental Health Center, University District',
  '2024-03-20 10:30:00'
),

-- Upcoming appointments for today's testing
(
  'appt0010-0010-0010-0010-000000000010',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  CURRENT_DATE + INTERVAL '2 hours',
  CURRENT_DATE + INTERVAL '2 hours',
  CURRENT_DATE + INTERVAL '2 hours 50 minutes',
  50,
  'individual',
  'scheduled',
  'CBT Session 3 - Behavioral Experiments',
  'Continue cognitive restructuring work and introduce behavioral experiments for workplace anxiety.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-22 10:00:00'
),
(
  'appt0011-0011-0011-0011-000000000011',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  CURRENT_DATE + INTERVAL '6 hours',
  CURRENT_DATE + INTERVAL '6 hours',
  CURRENT_DATE + INTERVAL '6 hours 50 minutes',
  50,
  'individual',
  'scheduled',
  'Postpartum Follow-up Session',
  'Review progress with bonding activities and mood management strategies.',
  '123 Wellness Center, Downtown Medical District',
  '2024-03-19 14:00:00'
);

-- ============================================================================
-- SESSION NOTES WITH CLINICAL CONTENT
-- ============================================================================

INSERT INTO session_notes (
  id, appointment_id, therapist_id, client_id, case_id, session_index,
  content, finalized, created_at, updated_at
) VALUES 
(
  'note0001-0001-0001-0001-000000000001',
  'appt0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  1,
  '{
    "session_type": "Initial Assessment",
    "presenting_issues": "Client reports significant work-related anxiety following recent promotion to senior management position. Symptoms include persistent worry about job performance, difficulty sleeping (averaging 4-5 hours per night), concentration problems affecting work quality, and physical symptoms including muscle tension and headaches.",
    "mental_status": "Alert and oriented x3. Mood anxious, affect congruent. Speech normal rate and volume. Thought process linear and goal-directed. No evidence of psychosis. Insight good, judgment intact.",
    "interventions_used": ["Psychoeducation about anxiety disorders", "Introduction to CBT model", "Deep breathing exercises", "Anxiety symptom tracking"],
    "client_response": "Client was highly engaged and receptive to learning. Demonstrated good understanding of anxiety symptoms and their impact. Motivated for treatment and willing to complete homework assignments.",
    "homework_assigned": "Daily anxiety monitoring using 1-10 scale with trigger identification. Practice deep breathing exercises twice daily (morning and before bed). Complete thought record worksheet for work-related anxious thoughts.",
    "progress_notes": "Client shows excellent insight and motivation for treatment. Anxiety symptoms are significantly impacting work performance but client has good coping resources and support system. No safety concerns identified.",
    "next_session_plan": "Continue CBT approach focusing on cognitive restructuring. Introduce thought challenging techniques. Review homework completion and adjust strategies as needed. Begin workplace-specific interventions.",
    "risk_assessment": "Low risk - no suicidal ideation, good support system, motivated for treatment"
  }',
  true,
  '2024-03-08 11:00:00',
  '2024-03-08 11:00:00'
),
(
  'note0002-0002-0002-0002-000000000002',
  'appt0002-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  2,
  '{
    "session_type": "CBT Session",
    "presenting_issues": "Client completed homework assignments with good compliance. Reports some improvement in anxiety awareness and ability to identify triggers. Still experiencing significant work stress but using breathing exercises regularly.",
    "interventions_used": ["Cognitive restructuring techniques", "Thought challenging exercises", "Problem-solving strategies for workplace situations", "Assertiveness training introduction"],
    "client_response": "Client engaged very well with cognitive techniques. Able to identify several negative thought patterns including catastrophizing and all-or-nothing thinking. Demonstrated good understanding of thought-feeling connections.",
    "homework_assigned": "Continue daily thought records with focus on work situations. Practice thought challenging worksheet for at least 3 work-related anxious thoughts. Implement one assertiveness strategy in workplace (speaking up in meetings).",
    "progress_notes": "Significant progress with CBT techniques. Client developing better awareness of cognitive patterns and their impact on emotions. Sleep improving slightly (5-6 hours per night). Work performance stabilizing.",
    "next_session_plan": "Review homework and thought challenging practice. Introduce behavioral experiments for workplace anxiety. Discuss specific assertiveness strategies and role-play difficult workplace conversations.",
    "risk_assessment": "Low risk - continued motivation, no safety concerns"
  }',
  true,
  '2024-03-15 11:00:00',
  '2024-03-15 11:00:00'
);

-- ============================================================================
-- CBT WORKSHEETS AND THERAPEUTIC EXERCISES
-- ============================================================================

INSERT INTO cbt_worksheets (
  id, therapist_id, client_id, case_id, type, title, content, responses, status,
  created_at, updated_at
) VALUES 
(
  'worksheet01-0001-0001-0001-000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'thought_record',
  'Work Anxiety Thought Record - Week 1',
  '{
    "instructions": "When you notice anxiety at work, complete this thought record to identify and challenge unhelpful thoughts.",
    "template": {
      "situation": "Describe the specific situation that triggered anxiety",
      "thoughts": "What thoughts went through your mind?",
      "emotions": "What emotions did you feel? (Rate intensity 1-10)",
      "behaviors": "What did you do? How did you respond?",
      "evidence_for": "What evidence supports this thought?",
      "evidence_against": "What evidence contradicts this thought?",
      "balanced_thought": "What would be a more balanced, realistic thought?",
      "new_emotion": "How do you feel after considering the balanced thought?"
    }
  }',
  '{
    "situation": "Presenting quarterly results to the executive team",
    "thoughts": "They will think I am completely incompetent and should never have been promoted",
    "emotions": "Anxious (8/10), worried (7/10), ashamed (6/10)",
    "behaviors": "Avoided eye contact, spoke very quietly, rushed through presentation",
    "evidence_for": "I stumbled over a few words and forgot one minor statistic",
    "evidence_against": "They asked thoughtful follow-up questions, seemed engaged with the content, complimented the thoroughness of my analysis, invited me to lead the next project",
    "balanced_thought": "I may have been nervous, but I provided valuable information and insights. Minor mistakes don''t negate my overall competence",
    "new_emotion": "Slightly anxious (4/10) but more confident (7/10)"
  }',
  'completed',
  '2024-03-08 11:30:00',
  '2024-03-15 09:20:00'
),
(
  'worksheet02-0002-0002-0002-000000002',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  'thought_record',
  'Postpartum Thoughts and Self-Compassion',
  '{
    "instructions": "Use this worksheet to practice self-compassion when experiencing difficult thoughts about motherhood.",
    "focus": "maternal_self_compassion"
  }',
  '{
    "situation": "Baby crying for 2 hours straight, nothing seems to comfort him",
    "thoughts": "I am a terrible mother. I don''t know what I''m doing. My baby would be better off with someone else",
    "emotions": "Guilt (9/10), sadness (8/10), frustration (7/10), inadequacy (9/10)",
    "behaviors": "Started crying myself, called my mother for help, felt like giving up",
    "evidence_for": "Baby seems unhappy and I can''t figure out what he needs",
    "evidence_against": "All babies cry - it''s normal development. I am learning and this is my second child. I care enough to seek help. My first child is happy and well-adjusted. Other mothers struggle with this too.",
    "balanced_thought": "I am a caring mother who is learning how to understand my baby''s needs. Crying is normal baby behavior and doesn''t reflect my parenting ability",
    "new_emotion": "Still frustrated (4/10) but more self-compassionate (7/10) and hopeful (6/10)"
  }',
  'completed',
  '2024-03-12 15:30:00',
  '2024-03-18 10:45:00'
);

INSERT INTO therapeutic_exercises (
  id, therapist_id, client_id, case_id, exercise_type, title, description,
  game_config, progress, status, last_played_at, created_at
) VALUES 
(
  'exercise01-0001-0001-0001-000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'breathing',
  'Daily Breathing Exercise for Work Anxiety',
  'Practice deep breathing exercises to manage work-related anxiety and stress',
  '{
    "duration": 300,
    "breath_pattern": "4-4-6",
    "guidance": true,
    "background_sounds": "office_ambient",
    "reminders": ["before_meetings", "during_breaks"]
  }',
  '{
    "sessions_completed": 18,
    "total_time": 5400,
    "best_session_duration": 420,
    "current_streak_days": 12,
    "average_stress_reduction": 3.2,
    "favorite_time": "morning",
    "effectiveness_rating": 8.5
  }',
  'in_progress',
  '2024-04-15 08:30:00',
  '2024-03-08 12:00:00'
),
(
  'exercise02-0002-0002-0002-000000002',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  'mindfulness',
  'Mindful Parenting Exercises',
  'Mindfulness exercises specifically designed for new mothers to reduce stress and improve present-moment awareness',
  '{
    "duration": 600,
    "type": "guided",
    "focus": "parenting_mindfulness",
    "sessions": ["body_scan", "loving_kindness", "mindful_feeding", "stress_relief"]
  }',
  '{
    "sessions_completed": 24,
    "total_time": 14400,
    "favorite_session": "loving_kindness",
    "mindful_moments_daily": 8,
    "stress_reduction": 4.1,
    "parenting_confidence": 7.8,
    "sleep_quality_improvement": 2.3
  }',
  'in_progress',
  '2024-04-20 19:15:00',
  '2024-03-12 15:30:00'
);

-- ============================================================================
-- PROGRESS TRACKING DATA
-- ============================================================================

INSERT INTO progress_tracking (
  client_id, case_id, metric_type, value, source_type, source_id, recorded_at, created_at
) VALUES 
-- James Wilson progress over time (anxiety improving)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'anxiety_level', 8, 'manual', null, '2024-03-08 18:00:00', '2024-03-08 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'anxiety_level', 7, 'manual', null, '2024-03-15 18:00:00', '2024-03-15 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'anxiety_level', 5, 'manual', null, '2024-03-22 18:00:00', '2024-03-22 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'anxiety_level', 4, 'manual', null, '2024-03-29 18:00:00', '2024-03-29 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'anxiety_level', 4, 'manual', null, '2024-04-05 18:00:00', '2024-04-05 18:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'phq9_total', 11, 'psychometric', 'inst0001-0001-0001-0001-000000000001', '2024-03-02 15:45:00', '2024-03-02 15:45:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'gad7_total', 7, 'psychometric', 'inst0002-0002-0002-0002-000000000002', '2024-03-02 16:10:00', '2024-03-02 16:10:00'),

-- Maria Garcia progress (postpartum depression improving)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'mood_rating', 4, 'manual', null, '2024-03-12 20:00:00', '2024-03-12 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'mood_rating', 5, 'manual', null, '2024-03-19 20:00:00', '2024-03-19 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'mood_rating', 6, 'manual', null, '2024-03-26 20:00:00', '2024-03-26 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'mood_rating', 7, 'manual', null, '2024-04-02 20:00:00', '2024-04-02 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'maternal_confidence', 6, 'manual', null, '2024-04-09 20:00:00', '2024-04-09 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'phq9_total', 10, 'psychometric', 'inst0003-0003-0003-0003-000000000003', '2024-03-06 10:15:00', '2024-03-06 10:15:00'),

-- Christopher Brown progress (teen anxiety)
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 8, 'manual', null, '2024-03-27 19:00:00', '2024-03-27 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 7, 'manual', null, '2024-04-03 19:00:00', '2024-04-03 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 6, 'manual', null, '2024-04-10 19:00:00', '2024-04-10 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'school_performance', 6, 'manual', null, '2024-04-17 19:00:00', '2024-04-17 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'gad7_total', 10, 'psychometric', 'inst0007-0007-0007-0007-000000000007', '2024-03-21 17:20:00', '2024-03-21 17:20:00');

-- ============================================================================
-- TREATMENT PLANS
-- ============================================================================

INSERT INTO treatment_plans (
  id, client_id, therapist_id, case_id, title, case_formulation,
  treatment_approach, estimated_duration, goals, status, created_at, updated_at
) VALUES 
(
  'plan0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'case0001-0001-0001-0001-000000000001',
  'Work Anxiety Management and Performance Enhancement',
  'Client presents with work-related anxiety disorder (F41.1) following job promotion. Cognitive factors include catastrophic thinking about work performance, perfectionist standards, and fear of failure. Behavioral factors include avoidance of challenging tasks, procrastination, and reduced assertiveness. Environmental factors include increased work demands, new responsibilities, and performance pressure. Maintaining factors include perfectionist thinking patterns, lack of assertiveness skills, and insufficient stress management techniques.',
  'Cognitive Behavioral Therapy (CBT) with focus on anxiety management, cognitive restructuring, and workplace stress reduction. Treatment will include exposure therapy for work-related situations, assertiveness training, and relapse prevention strategies.',
  '12-16 sessions over 3-4 months',
  '[
    {
      "id": "goal_001",
      "title": "Reduce work-related anxiety to manageable levels (anxiety rating 4/10 or below)",
      "description": "Client will demonstrate reduced anxiety in work situations through use of coping strategies",
      "target_date": "2024-06-01",
      "progress": 60,
      "status": "active",
      "interventions": ["CBT", "exposure therapy", "relaxation training"],
      "measurement": "Daily anxiety ratings and weekly GAD-7 scores"
    },
    {
      "id": "goal_002",
      "title": "Improve sleep quality and duration (7+ hours per night)",
      "description": "Client will establish healthy sleep patterns and reduce sleep-related anxiety",
      "target_date": "2024-05-15",
      "progress": 40,
      "status": "active", 
      "interventions": ["sleep hygiene education", "relaxation techniques", "worry time scheduling"],
      "measurement": "Sleep diary and self-reported sleep quality"
    },
    {
      "id": "goal_003",
      "title": "Develop effective workplace communication and assertiveness skills",
      "description": "Client will demonstrate confident communication in work meetings and interactions",
      "target_date": "2024-06-15",
      "progress": 70,
      "status": "active",
      "interventions": ["assertiveness training", "role-playing", "behavioral experiments"],
      "measurement": "Self-reported confidence ratings and behavioral observations"
    }
  ]',
  'active',
  '2024-03-08 11:30:00',
  '2024-04-15 14:30:00'
);

-- ============================================================================
-- COMMUNICATION LOGS
-- ============================================================================

INSERT INTO communication_logs (
  id, therapist_id, client_id, case_id, communication_type, subject, content,
  direction, status, sent_at, created_at
) VALUES 
(
  'comm0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'email',
  'Appointment Reminder - CBT Session Tomorrow',
  'Hi James,\n\nThis is a friendly reminder about your therapy appointment tomorrow (March 15th) at 10:00 AM. Please bring your completed thought record worksheet that we discussed in our last session.\n\nIf you need to reschedule or have any questions, please don''t hesitate to reach out.\n\nLooking forward to seeing you tomorrow!\n\nBest regards,\nDr. Sarah Johnson',
  'outgoing',
  'sent',
  '2024-03-14 16:00:00',
  '2024-03-14 16:00:00'
),
(
  'comm0002-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  'whatsapp',
  'Postpartum Support Check-in',
  'Hi Maria! Just checking in on how you''re feeling today. Remember to practice the self-care activities we discussed - even 10 minutes for yourself makes a difference. You''re doing an amazing job as a mother! 💙',
  'outgoing',
  'delivered',
  '2024-03-18 10:00:00',
  '2024-03-18 10:00:00'
),
(
  'comm0003-0003-0003-0003-000000000003',
  '33333333-3333-3333-3333-333333333333',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  'case0007-0007-0007-0007-000000000007',
  'text',
  'Great Job with Breathing Exercises!',
  'Hey Christopher! I heard from your mom that you used the breathing exercises before your math test today. That''s exactly what we practiced - you''re building really important skills! Keep it up! 🌟',
  'outgoing',
  'read',
  '2024-04-02 15:30:00',
  '2024-04-02 15:30:00'
);

-- ============================================================================
-- CLIENT ACTIVITIES FOR IN-BETWEEN SESSIONS
-- ============================================================================

INSERT INTO client_activities (
  id, client_id, case_id, session_phase, kind, type, title, details,
  payload, occurred_at, created_by, created_at
) VALUES 
(
  'activity01-0001-0001-0001-000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  'between_sessions',
  'mood_log',
  'self_report',
  'Evening Anxiety Check-in',
  'Used breathing exercises before important board meeting today. Felt much more confident and calm during the presentation. Anxiety was manageable (4/10) compared to usual (8/10). Team responded positively to my ideas.',
  '{
    "anxiety_level": 4,
    "mood_rating": 7,
    "coping_strategies_used": ["deep_breathing", "thought_challenging", "positive_self_talk"],
    "effectiveness": 8,
    "situation": "board_meeting_presentation",
    "duration_minutes": 90
  }',
  '2024-04-14 19:00:00',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2024-04-14 19:00:00'
),
(
  'activity02-0002-0002-0002-000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'case0002-0002-0002-0002-000000000002',
  'between_sessions',
  'journal',
  'journal',
  'Daily Motherhood Reflection',
  'Had a really wonderful day with the baby today. We read books together for 30 minutes and I felt very connected and present. Also managed to take a 20-minute walk while baby napped - felt refreshed and proud of prioritizing self-care.',
  '{
    "mood_rating": 8,
    "bonding_activities": ["reading_together", "singing_lullabies", "tummy_time"],
    "self_care_activities": ["walk_outside", "hot_tea", "called_friend"],
    "maternal_confidence": 8,
    "energy_level": 6,
    "gratitude": ["baby_smiles", "supportive_husband", "sunny_weather"]
  }',
  '2024-04-19 20:30:00',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '2024-04-19 20:30:00'
),
(
  'activity03-0003-0003-0003-000000003',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  'case0007-0007-0007-0007-000000000007',
  'between_sessions',
  'homework',
  'homework',
  'Social Challenge Completed Successfully',
  'Successfully started a conversation with a classmate during lunch break. It was scary at first but went much better than I expected. We talked about the upcoming science project and discovered we have similar interests. Planning to work together on the assignment.',
  '{
    "assignment_type": "social_interaction",
    "completed": true,
    "anxiety_before": 8,
    "anxiety_during": 6,
    "anxiety_after": 3,
    "outcome": "positive",
    "duration_minutes": 15,
    "coping_strategies": ["deep_breathing", "positive_self_talk"],
    "confidence_gained": 7
  }',
  '2024-04-29 16:45:00',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '2024-04-29 16:45:00'
);

-- ============================================================================
-- SESSION AGENDA FOR WORKSPACE
-- ============================================================================

INSERT INTO session_agenda (
  id, case_id, therapist_id, source, source_id, title, payload, created_at
) VALUES 
(
  'agenda01-0001-0001-0001-000000000001',
  'case0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'treatment_plan',
  'plan0001-0001-0001-0001-000000000001',
  'Review anxiety management progress and workplace confidence',
  '{
    "type": "goal_review",
    "goal_id": "goal_001",
    "details": "Check progress on anxiety reduction goal - client reporting 4/10 anxiety levels",
    "priority": "high",
    "estimated_time": 15
  }',
  '2024-04-15 09:00:00'
),
(
  'agenda02-0002-0002-0002-000000000002',
  'case0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'client_activity',
  'activity01-0001-0001-0001-000000001',
  'Discuss successful use of coping strategies in board meeting',
  '{
    "type": "activity_review",
    "activity_type": "mood_log",
    "details": "Client successfully used breathing exercises and thought challenging before important presentation",
    "outcome": "positive",
    "priority": "medium"
  }',
  '2024-04-15 09:05:00'
),
(
  'agenda03-0003-0003-0003-000000000003',
  'case0002-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'assessment',
  'inst0003-0003-0003-0003-000000000003',
  'Review PHQ-9 results and postpartum depression progress',
  '{
    "type": "assessment_review",
    "assessment": "PHQ-9",
    "score": 10,
    "details": "Discuss moderate depression score and treatment response - mood improving with therapy",
    "priority": "high"
  }',
  '2024-04-20 13:00:00'
);

-- ============================================================================
-- RESOURCE LIBRARY WITH CLINICAL RESOURCES
-- ============================================================================

INSERT INTO resource_library (
  id, title, description, category, subcategory, content_type,
  tags, difficulty_level, evidence_level, is_public, therapist_owner_id,
  external_url, created_at, updated_at
) VALUES 
(
  'resource01-0001-0001-0001-000000001',
  'Comprehensive Anxiety Management Workbook',
  'Evidence-based workbook containing CBT techniques, thought records, exposure exercises, and relaxation strategies for managing anxiety disorders.',
  'worksheet',
  'anxiety',
  'pdf',
  ARRAY['anxiety', 'CBT', 'self-help', 'workbook', 'evidence-based'],
  'beginner',
  'research_based',
  true,
  '11111111-1111-1111-1111-111111111111',
  'https://example.com/anxiety-workbook.pdf',
  '2024-03-01 12:00:00',
  '2024-03-01 12:00:00'
),
(
  'resource02-0002-0002-0002-000000002',
  'Postpartum Depression: A Guide for New Mothers',
  'Comprehensive educational resource about postpartum depression including symptoms, treatment options, and self-care strategies for new mothers.',
  'educational',
  'depression',
  'pdf',
  ARRAY['postpartum', 'depression', 'maternal', 'education', 'self-care'],
  'beginner',
  'clinical_consensus',
  true,
  '11111111-1111-1111-1111-111111111111',
  'https://example.com/postpartum-guide.pdf',
  '2024-03-05 13:00:00',
  '2024-03-05 13:00:00'
),
(
  'resource03-0003-0003-0003-000000003',
  'Teen Anxiety Toolkit: Coping Strategies for Students',
  'Age-appropriate anxiety management techniques specifically designed for teenagers dealing with school and social anxiety.',
  'intervention',
  'anxiety',
  'interactive',
  ARRAY['teen', 'anxiety', 'coping', 'interactive', 'school'],
  'intermediate',
  'research_based',
  true,
  '33333333-3333-3333-3333-333333333333',
  'https://example.com/teen-anxiety-app',
  '2024-03-20 14:00:00',
  '2024-03-20 14:00:00'
),
(
  'resource04-0004-0004-0004-000000004',
  'Mindfulness for Busy Parents: Quick Stress Relief',
  'Collection of brief mindfulness exercises and stress relief techniques specifically designed for parents with limited time.',
  'intervention',
  'mindfulness',
  'audio',
  ARRAY['mindfulness', 'parenting', 'stress', 'audio', 'quick-relief'],
  'beginner',
  'research_based',
  true,
  '22222222-2222-2222-2222-222222222222',
  'https://example.com/parent-mindfulness.mp3',
  '2024-03-15 15:00:00',
  '2024-03-15 15:00:00'
);

-- ============================================================================
-- FORM ASSIGNMENTS FOR TESTING
-- ============================================================================

INSERT INTO form_assignments (
  id, therapist_id, client_id, case_id, form_type, title, instructions,
  due_date, reminder_frequency, status, assigned_at, created_at
) VALUES 
(
  'form0001-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'case0003-0003-0003-0003-000000000003',
  'worksheet',
  'Panic Attack Coping Strategies Worksheet',
  'Please complete this worksheet when you experience panic symptoms. Use the grounding techniques and breathing exercises we practiced in our session.',
  '2024-05-20',
  'weekly',
  'assigned',
  '2024-04-25 12:30:00',
  '2024-04-25 12:30:00'
),
(
  'form0002-0002-0002-0002-000000000002',
  '33333333-3333-3333-3333-333333333333',
  'llllllll-llll-llll-llll-llllllllllll',
  'case0012-0012-0012-0012-000000000012',
  'assessment',
  'Weekly Academic Stress Check-in',
  'Please complete this brief assessment about your school stress levels and study habits. This helps us track your progress.',
  '2024-05-18',
  'weekly',
  'assigned',
  '2024-04-10 14:00:00',
  '2024-04-10 14:00:00'
);

-- ============================================================================
-- AUDIT LOGS FOR COMPLIANCE
-- ============================================================================

INSERT INTO audit_logs (
  user_id, action, resource_type, resource_id, client_id, case_id, details, created_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'assessment_completed',
  'assessment_instance',
  'inst0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '{
    "assessment_name": "PHQ-9",
    "raw_score": 11,
    "interpretation": "Moderate Depression",
    "clinical_significance": "moderate",
    "completion_time_minutes": 5
  }',
  '2024-03-02 15:45:00'
),
(
  '11111111-1111-1111-1111-111111111111',
  'treatment_plan_created',
  'treatment_plan',
  'plan0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '{
    "plan_title": "Work Anxiety Management and Performance Enhancement",
    "goals_count": 3,
    "estimated_duration": "12-16 sessions",
    "primary_approach": "CBT"
  }',
  '2024-03-08 11:30:00'
),
(
  '11111111-1111-1111-1111-111111111111',
  'session_completed',
  'appointment',
  'appt0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'case0001-0001-0001-0001-000000000001',
  '{
    "session_type": "Initial Assessment",
    "duration_minutes": 50,
    "interventions": ["psychoeducation", "CBT_introduction", "breathing_exercises"],
    "homework_assigned": true
  }',
  '2024-03-08 11:00:00'
);

-- ============================================================================
-- CONSENT FORMS
-- ============================================================================

INSERT INTO consents (
  id, client_id, therapist_id, case_id, title, body, consent_type, created_at
) VALUES 
(
  'consent01-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'case0001-0001-0001-0001-000000000001',
  'Informed Consent for Psychological Treatment',
  'I understand that I am entering into a professional therapeutic relationship with Dr. Sarah Johnson. I understand the nature of therapy, potential risks and benefits, confidentiality policies, and my rights as a client. I consent to participate in therapy and understand that I may discontinue treatment at any time.',
  'treatment_consent',
  '2024-03-01 10:00:00'
),
(
  'consent02-0002-0002-0002-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'case0002-0002-0002-0002-000000000002',
  'Postpartum Depression Treatment Consent',
  'I understand that I am receiving specialized treatment for postpartum depression. I understand the treatment approach, potential benefits and risks, and the importance of follow-up care. I consent to treatment and assessment procedures.',
  'specialized_treatment',
  '2024-03-05 11:30:00'
);

-- ============================================================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================================================

REFRESH MATERIALIZED VIEW assessment_instance_latest_score;