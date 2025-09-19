/*
  # Comprehensive Test Data Population
  
  ## Overview
  This migration creates realistic test data for the CBT practice management platform,
  including therapists, clients, cases, assessments, sessions, and progress tracking.
  
  ## Test Data Includes
  1. **3 Therapist Profiles** - Different specializations and experience levels
  2. **12 Client Profiles** - Diverse demographics and clinical presentations
  3. **Active Cases** - With treatment plans, goals, and progress
  4. **Assessment Data** - Completed and in-progress assessments with scores
  5. **Session History** - Appointments, notes, and clinical documentation
  6. **Progress Tracking** - Longitudinal data showing treatment outcomes
  7. **Resource Library** - Sample therapeutic resources and materials
  
  ## Clinical Scenarios
  - Work-related anxiety with CBT treatment
  - Postpartum depression with supportive therapy
  - Teen anxiety with family involvement
  - Relationship counseling and communication skills
  - Trauma recovery with evidence-based treatment
  - Stress management and resilience building
*/

-- ============================================================================
-- THERAPIST PROFILES
-- ============================================================================

-- Create comprehensive therapist profiles
INSERT INTO profiles (
  id, role, first_name, last_name, email, phone, whatsapp_number, 
  city, country, professional_details, verification_status, 
  profile_completion_percentage, created_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'therapist',
  'Dr. Sarah',
  'Johnson',
  'sarah.johnson@therapist.com',
  '+1-555-0101',
  '+1-555-0101',
  'New York',
  'United States',
  '{
    "specializations": ["Anxiety Disorders", "Depression", "Trauma & PTSD", "Cognitive Behavioral Therapy (CBT)", "Workplace Stress"],
    "languages": ["English", "Spanish"],
    "qualifications": "Ph.D. in Clinical Psychology\\nLicensed Clinical Psychologist (LCP)\\nCertified CBT Therapist\\nTrauma-Informed Care Certified\\n12+ years experience",
    "bio": "I specialize in helping individuals overcome anxiety, depression, and trauma through evidence-based approaches. My practice focuses on creating a safe, supportive environment where clients can explore their thoughts and feelings while developing practical coping strategies. I believe in the power of the therapeutic relationship and work collaboratively with each client to achieve their goals.",
    "practice_locations": [
      {"address": "123 Wellness Center, Downtown Medical District, New York, NY", "isPrimary": true},
      {"address": "Online Therapy Sessions Available Worldwide", "isPrimary": false}
    ],
    "credentials": ["PhD Clinical Psychology", "Licensed Clinical Psychologist", "CBT Certification"],
    "years_experience": 12,
    "session_fee": 150,
    "insurance_accepted": ["Aetna", "Blue Cross", "Cigna"],
    "availability": {"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-15:00"}
  }',
  'verified',
  100,
  '2024-01-15 10:00:00'
),
(
  '22222222-2222-2222-2222-222222222222',
  'therapist',
  'Dr. Michael',
  'Chen',
  'michael.chen@therapist.com',
  '+1-555-0102',
  '+1-555-0102',
  'Los Angeles',
  'United States',
  '{
    "specializations": ["Family Therapy", "Relationship Counseling", "Stress Management", "Mindfulness-Based Therapy", "Cultural Issues"],
    "languages": ["English", "Chinese (Mandarin)", "Chinese (Cantonese)"],
    "qualifications": "M.A. in Marriage and Family Therapy\\nLicensed Marriage and Family Therapist (LMFT)\\nMindfulness-Based Stress Reduction Certified\\nGottman Method Couples Therapy\\n8 years experience",
    "bio": "I work with individuals, couples, and families to strengthen relationships and improve communication. My approach integrates traditional therapy techniques with mindfulness practices to help clients develop greater self-awareness and emotional regulation. I believe that healing happens within the context of supportive relationships and honor the cultural backgrounds of all my clients.",
    "practice_locations": [
      {"address": "456 Family Wellness Center, Beverly Hills, CA", "isPrimary": true},
      {"address": "789 Community Health Center, Chinatown, LA", "isPrimary": false}
    ],
    "credentials": ["MA Marriage Family Therapy", "LMFT License", "MBSR Certification", "Gottman Training"],
    "years_experience": 8,
    "session_fee": 140,
    "insurance_accepted": ["Kaiser", "Blue Shield", "United Healthcare"],
    "availability": {"monday": "10:00-18:00", "tuesday": "10:00-18:00", "wednesday": "12:00-20:00", "thursday": "10:00-18:00", "friday": "10:00-16:00"}
  }',
  'verified',
  100,
  '2024-02-01 09:30:00'
),
(
  '33333333-3333-3333-3333-333333333333',
  'therapist',
  'Dr. Emily',
  'Rodriguez',
  'emily.rodriguez@therapist.com',
  '+1-555-0103',
  '+1-555-0103',
  'Miami',
  'United States',
  '{
    "specializations": ["Child & Adolescent Therapy", "ADHD", "Eating Disorders", "Group Therapy", "Bilingual Therapy"],
    "languages": ["English", "Spanish", "French"],
    "qualifications": "M.S. in Clinical Psychology\\nLicensed Professional Counselor (LPC)\\nSpecialty in Child and Adolescent Therapy\\nCertified in EMDR\\nPlay Therapy Certification\\n15 years experience",
    "bio": "I have dedicated my career to working with children, adolescents, and young adults facing various mental health challenges. My approach is warm, engaging, and tailored to each individuals developmental needs. I use creative techniques including art therapy, play therapy, and narrative therapy to help young people express themselves and build resilience. I am fluent in Spanish and French, allowing me to serve diverse communities.",
    "practice_locations": [
      {"address": "789 Youth Mental Health Center, University District, Miami, FL", "isPrimary": true},
      {"address": "Online Sessions for Teens and Young Adults", "isPrimary": false}
    ],
    "credentials": ["MS Clinical Psychology", "LPC License", "EMDR Certification", "Play Therapy Certification"],
    "years_experience": 15,
    "session_fee": 130,
    "insurance_accepted": ["Humana", "Aetna", "Florida Blue"],
    "availability": {"monday": "8:00-16:00", "tuesday": "8:00-16:00", "wednesday": "10:00-18:00", "thursday": "8:00-16:00", "friday": "8:00-14:00"}
  }',
  'verified',
  100,
  '2024-01-20 14:15:00'
);

-- ============================================================================
-- CLIENT PROFILES
-- ============================================================================

-- Create diverse client profiles with realistic backgrounds
INSERT INTO profiles (
  id, role, first_name, last_name, email, phone, whatsapp_number,
  city, country, patient_code, date_of_birth, gender,
  created_by_therapist, password_set, created_at
) VALUES 
-- Dr. Sarah Johnson's clients
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'client', 'James', 'Wilson', 'james.wilson@email.com', '+1-555-1001', '+1-555-1001', 'New York', 'United States', 'PT100001', '1985-03-15', 'male', '11111111-1111-1111-1111-111111111111', true, '2024-03-01 10:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client', 'Maria', 'Garcia', 'maria.garcia@email.com', '+1-555-1002', '+1-555-1002', 'New York', 'United States', 'PT100002', '1990-07-22', 'female', '11111111-1111-1111-1111-111111111111', true, '2024-03-05 11:30:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'client', 'David', 'Thompson', 'david.thompson@email.com', '+1-555-1003', '+1-555-1003', 'Brooklyn', 'United States', 'PT100003', '1978-11-08', 'male', '11111111-1111-1111-1111-111111111111', true, '2024-03-10 09:15:00'),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'client', 'Rachel', 'Wilson', 'rachel.wilson@email.com', '+1-555-1010', '+1-555-1010', 'Queens', 'United States', 'PT100010', '1982-09-14', 'female', '11111111-1111-1111-1111-111111111111', true, '2024-03-28 09:20:00'),

-- Dr. Michael Chen's clients  
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'client', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '+1-555-1004', '+1-555-1004', 'Los Angeles', 'United States', 'PT100004', '1987-05-30', 'female', '22222222-2222-2222-2222-222222222222', true, '2024-03-12 14:20:00'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'client', 'Robert', 'Martinez', 'robert.martinez@email.com', '+1-555-1005', '+1-555-1005', 'Los Angeles', 'United States', 'PT100005', '1975-12-03', 'male', '22222222-2222-2222-2222-222222222222', true, '2024-03-15 16:45:00'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'client', 'Jennifer', 'Taylor', 'jennifer.taylor@email.com', '+1-555-1006', '+1-555-1006', 'Pasadena', 'United States', 'PT100006', '1992-01-18', 'female', '22222222-2222-2222-2222-222222222222', true, '2024-03-18 13:10:00'),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'client', 'Daniel', 'Moore', 'daniel.moore@email.com', '+1-555-1011', '+1-555-1011', 'Santa Monica', 'United States', 'PT100011', '1955-08-25', 'male', '22222222-2222-2222-2222-222222222222', true, '2024-04-01 12:00:00'),

-- Dr. Emily Rodriguez's clients
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'client', 'Christopher', 'Brown', 'chris.brown@email.com', '+1-555-1007', '+1-555-1007', 'Miami', 'United States', 'PT100007', '2008-04-12', 'male', '33333333-3333-3333-3333-333333333333', true, '2024-03-20 10:30:00'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'client', 'Amanda', 'Davis', 'amanda.davis@email.com', '+1-555-1008', '+1-555-1008', 'Miami', 'United States', 'PT100008', '2006-10-05', 'female', '33333333-3333-3333-3333-333333333333', true, '2024-03-22 15:00:00'),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'client', 'Kevin', 'Miller', 'kevin.miller@email.com', '+1-555-1009', '+1-555-1009', 'Fort Lauderdale', 'United States', 'PT100009', '2007-06-28', 'male', '33333333-3333-3333-3333-333333333333', true, '2024-03-25 11:45:00'),
('llllllll-llll-llll-llll-llllllllllll', 'client', 'Sophie', 'Clark', 'sophie.clark@email.com', '+1-555-1012', '+1-555-1012', 'Orlando', 'United States', 'PT100012', '2005-12-15', 'female', '33333333-3333-3333-3333-333333333333', true, '2024-04-03 14:30:00');

-- ============================================================================
-- THERAPIST-CLIENT RELATIONSHIPS
-- ============================================================================

INSERT INTO therapist_client_relations (therapist_id, client_id, status, assigned_at) VALUES
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
  emergency_contact_relationship, address, occupation, marital_status,
  medical_history, current_medications, presenting_concerns, therapy_history,
  risk_level, notes, intake_completed_at, created_at, updated_at
) VALUES 
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Susan Wilson',
  '+1-555-2001',
  'spouse',
  '456 Oak Street, Apt 3B, New York, NY 10001',
  'Marketing Manager',
  'married',
  'History of hypertension, managed with medication. No significant psychiatric hospitalizations. Family history of anxiety disorders.',
  'Lisinopril 10mg daily, Multivitamin, Omega-3 supplement',
  'Experiencing persistent anxiety and worry about work performance following a recent promotion to senior management. Reports difficulty sleeping, concentrating, and physical symptoms including muscle tension and headaches. Symptoms began approximately 6 months ago and have been gradually worsening. Client is particularly concerned about public speaking and leading team meetings.',
  'No previous therapy experience. Has read self-help books about anxiety. Interested in learning practical coping strategies and cognitive techniques.',
  'low',
  'Client is highly motivated and engaged in treatment. Shows excellent insight into anxiety symptoms and demonstrates strong commitment to homework assignments. Responds very well to CBT techniques and is making steady progress with anxiety management. Has strong support system including spouse and close friends.',
  '2024-03-01 10:00:00',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Carlos Garcia',
  '+1-555-2002',
  'spouse',
  '789 Maple Avenue, Queens, NY 11375',
  'Graphic Designer',
  'married',
  'Postpartum depression following birth of second child. History of mild depression during college. No other significant medical history.',
  'Prenatal vitamins, Iron supplement, Vitamin D',
  'Experiencing mood changes, tearfulness, and feelings of overwhelm since childbirth 4 months ago. Reports difficulty bonding with new baby, guilt about parenting abilities, and concerns about being a good mother. Sleep is disrupted beyond normal newborn care. Feeling isolated and different from other mothers.',
  'Brief counseling during college for academic stress and mild depression. Positive experience with supportive therapy. Familiar with therapy process.',
  'moderate',
  'Excellent insight and motivation for treatment. Very responsive to psychoeducation about postpartum depression. Benefiting significantly from supportive therapy and practical parenting strategies. Mood improving steadily with treatment. Strong family support system.',
  '2024-03-05 11:30:00',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Margaret Thompson',
  '+1-555-2003',
  'mother',
  '321 Pine Street, Brooklyn, NY 11201',
  'Accountant',
  'single',
  'Type 2 diabetes, well-controlled with medication. History of panic attacks beginning in early 30s. Previous hospitalization for panic attack (thought it was heart attack).',
  'Metformin 500mg twice daily, Lorazepam 0.5mg as needed for panic attacks',
  'Recurrent panic attacks and agoraphobic avoidance that significantly worsened during the COVID-19 pandemic. Difficulty leaving home for work and social activities. Experiences intense fear of having panic attacks in public places. Avoids crowded areas, public transportation, and social gatherings.',
  'Previous therapy 5 years ago for panic disorder with good results using CBT and exposure therapy. Experienced relapse during COVID-19 pandemic due to increased isolation and health anxiety.',
  'moderate',
  'Highly motivated client with good understanding of anxiety and panic disorder from previous therapy experience. Responding well to gradual exposure therapy and relaxation techniques. Making steady progress in reducing avoidance behaviors.',
  '2024-03-10 09:15:00',
  '2024-03-10 09:15:00',
  '2024-04-25 12:20:00'
),
(
  'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj',
  '11111111-1111-1111-1111-111111111111',
  'Thomas Wilson',
  '+1-555-2010',
  'brother',
  '654 Cedar Lane, Manhattan, NY 10025',
  'Construction Supervisor',
  'divorced',
  'History of alcohol use disorder, 2 years sober. Attending AA regularly. History of depression during active addiction.',
  'None currently. Previously on antidepressants during early recovery.',
  'Maintaining sobriety but struggling with underlying anxiety and depression that contributed to previous alcohol use. Experiencing relationship stress due to past addiction and working on rebuilding trust with family. Work stress and financial pressures are triggering anxiety.',
  'Previous addiction counseling and group therapy with positive results. Completed inpatient treatment program. Active in 12-step program with sponsor.',
  'moderate',
  'Strong commitment to recovery and mental health treatment. Excellent insight into addiction and mental health connection. Working diligently on underlying anxiety and depression. Good support through AA program.',
  '2024-03-28 09:20:00',
  '2024-03-28 09:20:00',
  '2024-05-05 16:20:00'
),

-- Dr. Michael Chen's clients
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'John Anderson',
  '+1-555-2004',
  'spouse',
  '123 Sunset Boulevard, Los Angeles, CA 90028',
  'Software Engineer',
  'married',
  'No significant medical history. Occasional stress headaches.',
  'None',
  'Experiencing significant relationship difficulties with spouse including frequent arguments, communication breakdowns, and emotional distance. Considering separation but wants to try therapy first. Reports feeling misunderstood and frustrated with relationship dynamics.',
  'No previous therapy experience. Initially reluctant but willing to try couples counseling. Skeptical about therapy effectiveness.',
  'low',
  'Initially resistant to therapy but becoming more engaged over time. Learning communication skills and conflict resolution strategies. Beginning to understand relationship patterns and his role in conflicts.',
  '2024-03-12 14:20:00',
  '2024-03-12 14:20:00',
  '2024-04-18 10:15:00'
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'Ana Martinez',
  '+1-555-2005',
  'sister',
  '789 Hollywood Drive, Los Angeles, CA 90046',
  'Restaurant Manager',
  'single',
  'Chronic back pain from work injury 2 years ago. Sleep difficulties related to pain and work stress.',
  'Ibuprofen 400mg as needed for pain, Melatonin 3mg at bedtime',
  'Work-related stress and chronic pain affecting mood, relationships, and overall quality of life. Feeling overwhelmed by financial pressures and physical limitations. Difficulty maintaining work performance due to pain.',
  'No previous therapy experience. Open to trying new approaches to manage stress and pain.',
  'low',
  'Hardworking individual dealing with multiple stressors including chronic pain and financial pressure. Benefiting from stress management techniques and pain coping strategies. Learning to balance work demands with self-care.',
  '2024-03-15 16:45:00',
  '2024-03-15 16:45:00',
  '2024-04-22 13:40:00'
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '22222222-2222-2222-2222-222222222222',
  'Mark Taylor',
  '+1-555-2006',
  'brother',
  '456 Venice Beach Road, Venice, CA 90291',
  'Teacher',
  'divorced',
  'No significant medical history. Occasional insomnia during stressful periods.',
  'None',
  'Recent divorce and custody issues causing significant emotional distress. Feeling depressed and having difficulty adjusting to single parenting of two young children. Struggling with loneliness and financial concerns.',
  'Brief counseling during divorce proceedings focused on legal and practical issues. First time seeking therapy for emotional support.',
  'moderate',
  'Grieving the loss of marriage while adapting to new role as single parent. Making good progress with adjustment and developing co-parenting skills. Learning to manage depression and build new support systems.',
  '2024-03-18 13:10:00',
  '2024-03-18 13:10:00',
  '2024-04-28 11:25:00'
),
(
  'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk',
  '22222222-2222-2222-2222-222222222222',
  'Linda Moore',
  '+1-555-2011',
  'daughter',
  '321 Malibu Coast Highway, Malibu, CA 90265',
  'Retired Teacher',
  'widowed',
  'Arthritis managed with medication. Some mobility limitations. History of mild depression following spouse death 3 years ago.',
  'Methotrexate weekly for arthritis, Folic acid supplement, Calcium with Vitamin D',
  'Adjustment difficulties to retirement and aging process. Feelings of uselessness and social isolation since retiring 6 months ago. Mild depression and anxiety about health and future. Missing sense of purpose and daily structure.',
  'No previous therapy experience but very open to trying new approaches. Interested in finding meaning and purpose in retirement.',
  'low',
  'Adjusting well to therapy process. Exploring new activities and social connections. Mood improving with increased engagement in meaningful activities. Developing new routines and social support.',
  '2024-04-01 12:00:00',
  '2024-04-01 12:00:00',
  '2024-05-08 10:45:00'
),

-- Dr. Emily Rodriguez's clients
(
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',
  'Patricia Brown',
  '+1-555-2007',
  'mother',
  '123 Ocean Drive, Miami Beach, FL 33139',
  'High School Student',
  'single',
  'ADHD diagnosed in childhood, currently unmedicated. No other significant medical history.',
  'None currently. Previously on ADHD medication but discontinued due to side effects.',
  'Academic difficulties and social anxiety affecting school performance and peer relationships. Trouble focusing in classes, completing assignments, and making friends. Low self-esteem and perfectionist tendencies causing additional stress.',
  'No previous therapy experience. Family supportive of mental health treatment.',
  'low',
  'Bright teenager with ADHD-related challenges responding well to CBT and social skills training. Building confidence and developing better study strategies. Family very supportive of treatment.',
  '2024-03-20 10:30:00',
  '2024-03-20 10:30:00',
  '2024-04-30 15:50:00'
),
(
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  '33333333-3333-3333-3333-333333333333',
  'Richard Davis',
  '+1-555-2008',
  'father',
  '789 Coral Gables Way, Coral Gables, FL 33134',
  'High School Student',
  'single',
  'No significant medical history. Some concerns about weight and body image.',
  'None',
  'Developing body image concerns and restrictive eating patterns over the past 8 months. Excessive exercise and calorie counting behaviors. Social withdrawal from friends and family activities. Preoccupation with weight and appearance.',
  'No previous therapy experience. Family became concerned about eating behaviors and sought professional help.',
  'high',
  'Developing eating disorder requiring careful monitoring and specialized treatment. Working on body image distortions and establishing healthy eating patterns. Family therapy component included for support.',
  '2024-03-22 15:00:00',
  '2024-03-22 15:00:00',
  '2024-05-01 09:30:00'
),
(
  'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
  '33333333-3333-3333-3333-333333333333',
  'Carol Miller',
  '+1-555-2009',
  'mother',
  '456 Biscayne Boulevard, Miami, FL 33132',
  'Middle School Student',
  'single',
  'Asthma, well-controlled with inhaler. No other significant medical history.',
  'Albuterol inhaler as needed for asthma',
  'Grief and loss following death of beloved grandmother 3 months ago. Difficulty concentrating in school, withdrawal from previously enjoyed activities, and sleep disturbances. Close relationship with grandmother who was primary caregiver.',
  'No previous therapy experience. Family supportive of grief counseling.',
  'low',
  'Processing grief in healthy way with good family support. Developing age-appropriate coping strategies and reconnecting with support systems. Making good progress in grief work.',
  '2024-03-25 11:45:00',
  '2024-03-25 11:45:00',
  '2024-05-02 14:15:00'
),
(
  'llllllll-llll-llll-llll-llllllllllll',
  '33333333-3333-3333-3333-333333333333',
  'Steven Clark',
  '+1-555-2012',
  'father',
  '321 Key Biscayne Drive, Key Biscayne, FL 33149',
  'High School Student',
  'single',
  'No significant medical history. Occasional stress headaches during exam periods.',
  'None',
  'Academic pressure and perfectionism causing significant anxiety about college applications and future career. Sleep difficulties, excessive worry about grades, and fear of disappointing parents. High-achieving student with unrealistic expectations.',
  'No previous therapy experience. Parents supportive of mental health treatment.',
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
  opened_at, last_activity_at, created_at, updated_at
) VALUES 
(
  'case0001-0001-0001-0001-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'CASE-2024-001',
  'active',
  'intervention',
  ARRAY['F41.1', 'Z56.9'],
  'Client presents with work-related anxiety disorder following job promotion. Cognitive factors include catastrophic thinking about work performance and perfectionist beliefs. Behavioral factors include avoidance of challenging tasks and procrastination. Environmental factors include increased work responsibilities and pressure. Maintaining factors include negative thought patterns and avoidance behaviors.',
  '{
    "presenting_problem": "Work-related anxiety following promotion",
    "onset": "6 months ago",
    "triggers": ["public speaking", "team meetings", "performance reviews"],
    "symptoms": ["worry", "sleep difficulties", "concentration problems", "muscle tension"],
    "functional_impairment": "moderate",
    "support_system": "strong - spouse and friends",
    "motivation": "high"
  }',
  '{
    "general_aim": "Reduce work-related anxiety to manageable levels and improve workplace confidence",
    "goals": [
      {
        "id": "goal_001",
        "title": "Reduce anxiety to 4/10 or below in work situations",
        "target_date": "2024-06-01",
        "progress": 60,
        "status": "active",
        "interventions": ["cognitive restructuring", "exposure exercises", "relaxation training"]
      },
      {
        "id": "goal_002", 
        "title": "Improve sleep quality to 7+ hours per night",
        "target_date": "2024-05-15",
        "progress": 40,
        "status": "active",
        "interventions": ["sleep hygiene", "worry time", "relaxation"]
      }
    ],
    "interventions": [
      {"type": "CBT", "frequency": "weekly", "duration": "50 minutes"},
      {"type": "homework", "description": "thought records and exposure exercises"},
      {"type": "psychoeducation", "topics": ["anxiety", "cognitive model"]}
    ]
  }',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00',
  '2024-03-01 10:00:00',
  '2024-04-15 14:30:00'
),
(
  'case0002-0002-0002-0002-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'CASE-2024-002',
  'active',
  'treatment',
  ARRAY['F53.0'],
  'Client experiencing postpartum depression with onset 4 months after childbirth. Contributing factors include hormonal changes, sleep deprivation, social isolation, and adjustment to motherhood. Protective factors include strong family support and motivation for treatment.',
  '{
    "presenting_problem": "Postpartum depression",
    "onset": "4 months postpartum",
    "symptoms": ["mood changes", "tearfulness", "bonding difficulties", "guilt", "fatigue"],
    "risk_factors": ["first-time mother", "sleep deprivation", "social isolation"],
    "protective_factors": ["family support", "stable relationship", "motivated for treatment"],
    "functional_impairment": "moderate"
  }',
  '{
    "general_aim": "Improve maternal mental health and bonding with baby",
    "goals": [
      {
        "id": "goal_003",
        "title": "Improve maternal bonding and confidence",
        "target_date": "2024-05-01",
        "progress": 75,
        "status": "active",
        "interventions": ["bonding activities", "self-compassion", "psychoeducation"]
      },
      {
        "id": "goal_004",
        "title": "Reduce depression symptoms (PHQ-9 < 5)",
        "target_date": "2024-05-15", 
        "progress": 50,
        "status": "active",
        "interventions": ["supportive therapy", "behavioral activation", "self-care planning"]
      }
    ],
    "interventions": [
      {"type": "supportive_therapy", "frequency": "weekly"},
      {"type": "psychoeducation", "topics": ["postpartum depression", "infant bonding"]},
      {"type": "behavioral_activation", "focus": "self-care and pleasant activities"}
    ]
  }',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00',
  '2024-03-05 11:30:00',
  '2024-04-20 16:45:00'
),
(
  'case0003-0003-0003-0003-000000000003',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'CASE-2024-003',
  'active',
  'intervention',
  ARRAY['F41.0', 'F40.00'],
  'Client with panic disorder and agoraphobia. Cognitive factors include catastrophic misinterpretation of bodily sensations and fear of fear. Behavioral factors include avoidance of panic-triggering situations. Maintaining factors include safety behaviors and continued avoidance.',
  '{
    "presenting_problem": "Panic disorder with agoraphobia",
    "onset": "Early 30s, worsened during COVID-19",
    "panic_triggers": ["crowded places", "public transport", "being far from home"],
    "avoidance_behaviors": ["shopping", "social events", "work meetings"],
    "safety_behaviors": ["carrying medication", "staying near exits"],
    "previous_treatment": "CBT 5 years ago with good results"
  }',
  '{
    "general_aim": "Reduce panic attacks and eliminate agoraphobic avoidance",
    "goals": [
      {
        "id": "goal_005",
        "title": "Eliminate panic attacks in safe situations",
        "target_date": "2024-07-01",
        "progress": 30,
        "status": "active",
        "interventions": ["interoceptive exposure", "cognitive restructuring"]
      },
      {
        "id": "goal_006",
        "title": "Return to normal activities (work, shopping, social)",
        "target_date": "2024-08-01",
        "progress": 25,
        "status": "active", 
        "interventions": ["graded exposure", "behavioral experiments"]
      }
    ]
  }',
  '2024-03-10 09:15:00',
  '2024-04-25 12:20:00',
  '2024-03-10 09:15:00',
  '2024-04-25 12:20:00'
);

-- Continue with remaining cases...
INSERT INTO cases (
  id, client_id, therapist_id, case_number, status, current_phase,
  diagnosis_codes, treatment_plan, opened_at, created_at, updated_at
) VALUES 
('case0004-0004-0004-0004-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'CASE-2024-004', 'active', 'treatment', ARRAY['Z63.0'], '{"general_aim": "Improve relationship communication and reduce conflict", "goals": [{"id": "goal_007", "title": "Develop effective communication skills", "progress": 45, "status": "active"}]}', '2024-03-12 14:20:00', '2024-03-12 14:20:00', '2024-04-18 10:15:00'),
('case0005-0005-0005-0005-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'CASE-2024-005', 'active', 'intervention', ARRAY['Z56.9'], '{"general_aim": "Manage work stress and chronic pain impact on mental health", "goals": [{"id": "goal_008", "title": "Develop effective stress management strategies", "progress": 35, "status": "active"}]}', '2024-03-15 16:45:00', '2024-03-15 16:45:00', '2024-04-22 13:40:00'),
('case0006-0006-0006-0006-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'CASE-2024-006', 'active', 'treatment', ARRAY['F32.1', 'Z63.5'], '{"general_aim": "Support adjustment to divorce and single parenting", "goals": [{"id": "goal_009", "title": "Develop healthy co-parenting relationship", "progress": 55, "status": "active"}]}', '2024-03-18 13:10:00', '2024-03-18 13:10:00', '2024-04-28 11:25:00'),
('case0007-0007-0007-0007-000000000007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '33333333-3333-3333-3333-333333333333', 'CASE-2024-007', 'active', 'intervention', ARRAY['F41.9', 'F90.9'], '{"general_aim": "Reduce anxiety and improve academic and social functioning", "goals": [{"id": "goal_010", "title": "Reduce school anxiety to manageable levels", "progress": 40, "status": "active"}]}', '2024-03-20 10:30:00', '2024-03-20 10:30:00', '2024-04-30 15:50:00'),
('case0008-0008-0008-0008-000000000008', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '33333333-3333-3333-3333-333333333333', 'CASE-2024-008', 'active', 'assessment', ARRAY['F50.9'], '{"general_aim": "Address eating disorder symptoms and body image concerns", "goals": [{"id": "goal_011", "title": "Establish healthy eating patterns", "progress": 20, "status": "active"}]}', '2024-03-22 15:00:00', '2024-03-22 15:00:00', '2024-05-01 09:30:00'),
('case0009-0009-0009-0009-000000000009', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '33333333-3333-3333-3333-333333333333', 'CASE-2024-009', 'active', 'treatment', ARRAY['F43.21'], '{"general_aim": "Support healthy grief processing and adjustment", "goals": [{"id": "goal_012", "title": "Process grief and return to normal activities", "progress": 65, "status": "active"}]}', '2024-03-25 11:45:00', '2024-03-25 11:45:00', '2024-05-02 14:15:00'),
('case0010-0010-0010-0010-000000000010', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11111111-1111-1111-1111-111111111111', 'CASE-2024-010', 'active', 'treatment', ARRAY['F32.1', 'F10.20'], '{"general_aim": "Maintain sobriety and address underlying mental health issues", "goals": [{"id": "goal_013", "title": "Maintain sobriety and develop healthy coping", "progress": 70, "status": "active"}]}', '2024-03-28 09:20:00', '2024-03-28 09:20:00', '2024-05-05 16:20:00'),
('case0011-0011-0011-0011-000000000011', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '22222222-2222-2222-2222-222222222222', 'CASE-2024-011', 'active', 'intervention', ARRAY['F32.0'], '{"general_aim": "Support healthy aging and retirement adjustment", "goals": [{"id": "goal_014", "title": "Develop meaningful retirement activities", "progress": 50, "status": "active"}]}', '2024-04-01 12:00:00', '2024-04-01 12:00:00', '2024-05-08 10:45:00'),
('case0012-0012-0012-0012-000000000012', 'llllllll-llll-llll-llll-llllllllllll', '33333333-3333-3333-3333-333333333333', 'CASE-2024-012', 'active', 'intervention', ARRAY['F41.9'], '{"general_aim": "Manage academic stress and develop healthy perfectionism", "goals": [{"id": "goal_015", "title": "Reduce academic anxiety and perfectionism", "progress": 30, "status": "active"}]}', '2024-04-03 14:30:00', '2024-04-03 14:30:00', '2024-05-10 13:55:00');

-- ============================================================================
-- ASSESSMENT INSTANCES AND RESPONSES
-- ============================================================================

-- Create assessment instances with varied statuses
INSERT INTO assessment_instances (
  id, template_id, therapist_id, client_id, case_id, title, instructions,
  status, assigned_at, due_date, started_at, completed_at, reminder_frequency,
  created_at, updated_at
) VALUES 
-- Completed assessments
('inst0001-0001-0001-0001-000000000001', 'template-phq9-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'Initial Depression Screening - PHQ-9', 'Please complete this assessment to help us understand your current mood and symptoms.', 'completed', '2024-03-01 10:30:00', '2024-03-08 23:59:59', '2024-03-02 14:20:00', '2024-03-02 15:45:00', 'none', '2024-03-01 10:30:00', '2024-03-02 15:45:00'),
('inst0002-0002-0002-0002-000000000002', 'template-gad7-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'Anxiety Assessment - GAD-7', 'This assessment will help us understand your anxiety levels.', 'completed', '2024-03-01 10:35:00', '2024-03-08 23:59:59', '2024-03-02 15:50:00', '2024-03-02 16:10:00', 'none', '2024-03-01 10:35:00', '2024-03-02 16:10:00'),
('inst0003-0003-0003-0003-000000000003', 'template-phq9-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'Postpartum Depression Screening', 'This screening will help assess your mood following childbirth.', 'completed', '2024-03-05 12:00:00', '2024-03-12 23:59:59', '2024-03-06 09:30:00', '2024-03-06 10:15:00', 'daily', '2024-03-05 12:00:00', '2024-03-06 10:15:00'),

-- In-progress assessments
('inst0004-0004-0004-0004-000000000004', 'template-gad7-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'case0003-0003-0003-0003-000000000003', 'Panic Disorder Assessment', 'Please complete this to help us understand your anxiety symptoms.', 'in_progress', '2024-03-10 10:00:00', '2024-03-17 23:59:59', '2024-03-11 14:30:00', null, 'weekly', '2024-03-10 10:00:00', '2024-03-11 14:30:00'),

-- Assigned assessments
('inst0005-0005-0005-0005-000000000005', 'template-swls-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', 'Life Satisfaction Assessment', 'This assessment will help us understand your overall life satisfaction.', 'assigned', '2024-03-12 15:00:00', '2024-03-19 23:59:59', null, null, 'before_due', '2024-03-12 15:00:00', '2024-03-12 15:00:00'),
('inst0006-0006-0006-0006-000000000006', 'template-pss10-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'case0005-0005-0005-0005-000000000005', 'Work Stress Assessment', 'Please complete this assessment about your stress levels.', 'assigned', '2024-03-15 17:00:00', '2024-03-22 23:59:59', null, null, 'weekly', '2024-03-15 17:00:00', '2024-03-15 17:00:00'),

-- Teen assessments
('inst0007-0007-0007-0007-000000000007', 'template-gad7-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'Teen Anxiety Assessment', 'This will help us understand how you have been feeling lately.', 'completed', '2024-03-20 11:00:00', '2024-03-27 23:59:59', '2024-03-21 16:45:00', '2024-03-21 17:20:00', 'daily', '2024-03-20 11:00:00', '2024-03-21 17:20:00'),
('inst0008-0008-0008-0008-000000000008', 'template-swls-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'case0008-0008-0008-0008-000000000008', 'Life Satisfaction - Recovery Assessment', 'Please rate your satisfaction with different areas of your life.', 'assigned', '2024-03-22 15:30:00', '2024-03-29 23:59:59', null, null, 'weekly', '2024-03-22 15:30:00', '2024-03-22 15:30:00');

-- Create realistic assessment responses for completed assessments
INSERT INTO assessment_responses (
  instance_id, question_id, item_id, response_value, response_timestamp, is_final, created_at, updated_at
) VALUES 
-- PHQ-9 responses for James Wilson (moderate depression: score 11)
('inst0001-0001-0001-0001-000000000001', 'phq9_1', 'phq9_1', 2, '2024-03-02 15:30:00', true, '2024-03-02 15:30:00', '2024-03-02 15:30:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_2', 'phq9_2', 2, '2024-03-02 15:31:00', true, '2024-03-02 15:31:00', '2024-03-02 15:31:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_3', 'phq9_3', 1, '2024-03-02 15:32:00', true, '2024-03-02 15:32:00', '2024-03-02 15:32:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_4', 'phq9_4', 2, '2024-03-02 15:33:00', true, '2024-03-02 15:33:00', '2024-03-02 15:33:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_5', 'phq9_5', 1, '2024-03-02 15:34:00', true, '2024-03-02 15:34:00', '2024-03-02 15:34:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_6', 'phq9_6', 2, '2024-03-02 15:35:00', true, '2024-03-02 15:35:00', '2024-03-02 15:35:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_7', 'phq9_7', 1, '2024-03-02 15:36:00', true, '2024-03-02 15:36:00', '2024-03-02 15:36:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_8', 'phq9_8', 0, '2024-03-02 15:37:00', true, '2024-03-02 15:37:00', '2024-03-02 15:37:00'),
('inst0001-0001-0001-0001-000000000001', 'phq9_9', 'phq9_9', 0, '2024-03-02 15:38:00', true, '2024-03-02 15:38:00', '2024-03-02 15:38:00'),

-- GAD-7 responses for James Wilson (mild anxiety: score 7)
('inst0002-0002-0002-0002-000000000002', 'gad7_1', 'gad7_1', 1, '2024-03-02 15:55:00', true, '2024-03-02 15:55:00', '2024-03-02 15:55:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_2', 'gad7_2', 2, '2024-03-02 15:56:00', true, '2024-03-02 15:56:00', '2024-03-02 15:56:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_3', 'gad7_3', 1, '2024-03-02 15:57:00', true, '2024-03-02 15:57:00', '2024-03-02 15:57:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_4', 'gad7_4', 1, '2024-03-02 15:58:00', true, '2024-03-02 15:58:00', '2024-03-02 15:58:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_5', 'gad7_5', 0, '2024-03-02 15:59:00', true, '2024-03-02 15:59:00', '2024-03-02 15:59:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_6', 'gad7_6', 1, '2024-03-02 16:00:00', true, '2024-03-02 16:00:00', '2024-03-02 16:00:00'),
('inst0002-0002-0002-0002-000000000002', 'gad7_7', 'gad7_7', 1, '2024-03-02 16:01:00', true, '2024-03-02 16:01:00', '2024-03-02 16:01:00'),

-- PHQ-9 responses for Maria Garcia (mild depression: score 10)
('inst0003-0003-0003-0003-000000000003', 'phq9_1', 'phq9_1', 1, '2024-03-06 09:35:00', true, '2024-03-06 09:35:00', '2024-03-06 09:35:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_2', 'phq9_2', 2, '2024-03-06 09:36:00', true, '2024-03-06 09:36:00', '2024-03-06 09:36:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_3', 'phq9_3', 2, '2024-03-06 09:37:00', true, '2024-03-06 09:37:00', '2024-03-06 09:37:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_4', 'phq9_4', 2, '2024-03-06 09:38:00', true, '2024-03-06 09:38:00', '2024-03-06 09:38:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_5', 'phq9_5', 1, '2024-03-06 09:39:00', true, '2024-03-06 09:39:00', '2024-03-06 09:39:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_6', 'phq9_6', 1, '2024-03-06 09:40:00', true, '2024-03-06 09:40:00', '2024-03-06 09:40:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_7', 'phq9_7', 1, '2024-03-06 09:41:00', true, '2024-03-06 09:41:00', '2024-03-06 09:41:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_8', 'phq9_8', 0, '2024-03-06 09:42:00', true, '2024-03-06 09:42:00', '2024-03-06 09:42:00'),
('inst0003-0003-0003-0003-000000000003', 'phq9_9', 'phq9_9', 0, '2024-03-06 09:43:00', true, '2024-03-06 09:43:00', '2024-03-06 09:43:00'),

-- GAD-7 responses for Christopher Brown (moderate anxiety: score 10)
('inst0007-0007-0007-0007-000000000007', 'gad7_1', 'gad7_1', 2, '2024-03-21 16:50:00', true, '2024-03-21 16:50:00', '2024-03-21 16:50:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_2', 'gad7_2', 1, '2024-03-21 16:51:00', true, '2024-03-21 16:51:00', '2024-03-21 16:51:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_3', 'gad7_3', 2, '2024-03-21 16:52:00', true, '2024-03-21 16:52:00', '2024-03-21 16:52:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_4', 'gad7_4', 1, '2024-03-21 16:53:00', true, '2024-03-21 16:53:00', '2024-03-21 16:53:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_5', 'gad7_5', 1, '2024-03-21 16:54:00', true, '2024-03-21 16:54:00', '2024-03-21 16:54:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_6', 'gad7_6', 2, '2024-03-21 16:55:00', true, '2024-03-21 16:55:00', '2024-03-21 16:55:00'),
('inst0007-0007-0007-0007-000000000007', 'gad7_7', 'gad7_7', 1, '2024-03-21 16:56:00', true, '2024-03-21 16:56:00', '2024-03-21 16:56:00');

-- ============================================================================
-- ASSESSMENT SCORES
-- ============================================================================

INSERT INTO assessment_scores (
  instance_id, raw_score, interpretation_category, interpretation_description,
  clinical_significance, severity_level, recommendations, therapist_notes,
  auto_generated, calculated_at, created_at, updated_at
) VALUES 
('inst0001-0001-0001-0001-000000000001', 11, 'Moderate Depression', 'The client is experiencing moderate depression symptoms that are interfering with daily functioning. Symptoms include decreased interest in activities, depressed mood, sleep difficulties, fatigue, and some concentration problems.', 'moderate', 'moderate', 'Therapy recommended for depression management. Consider cognitive behavioral therapy (CBT) and behavioral activation techniques. Monitor for symptom progression and assess need for medication evaluation.', 'Client shows good insight into symptoms and is motivated for treatment. Work-related stressors appear to be primary contributing factor.', true, '2024-03-02 15:45:00', '2024-03-02 15:45:00', '2024-03-02 15:45:00'),
('inst0002-0002-0002-0002-000000000002', 7, 'Mild Anxiety', 'The client is experiencing mild anxiety symptoms including nervousness, worry, and some difficulty controlling anxious thoughts. Symptoms are manageable but may benefit from intervention.', 'mild', 'mild', 'Consider stress management techniques, relaxation training, and cognitive restructuring. Monitor anxiety levels and provide coping strategies for work-related triggers.', 'Anxiety appears directly related to work stress and performance concerns. Client is very receptive to learning coping skills.', true, '2024-03-02 16:10:00', '2024-03-02 16:10:00', '2024-03-02 16:10:00'),
('inst0003-0003-0003-0003-000000000003', 10, 'Moderate Depression', 'The client is experiencing moderate depression symptoms consistent with postpartum depression. Symptoms include mood changes, fatigue, sleep disturbance, and some feelings of inadequacy related to parenting.', 'moderate', 'moderate', 'Postpartum depression treatment recommended. Consider therapy focused on maternal mental health, support groups, and possible medication evaluation if symptoms persist. Monitor bonding and parenting stress.', 'Postpartum depression with good prognosis given strong support system and early intervention. Client very motivated for treatment.', true, '2024-03-06 10:15:00', '2024-03-06 10:15:00', '2024-03-06 10:15:00'),
('inst0007-0007-0007-0007-000000000007', 10, 'Moderate Anxiety', 'The client is experiencing moderate anxiety symptoms including nervousness, worry, restlessness, and irritability. Symptoms are impacting school performance and social functioning.', 'moderate', 'moderate', 'Therapy recommended for anxiety management. Consider cognitive behavioral therapy (CBT) adapted for adolescents, relaxation techniques, and social skills training. Coordinate with school counselor if needed.', 'Teen anxiety with both academic and social components. Family is very supportive of treatment. Client engaged despite initial hesitation.', true, '2024-03-21 17:20:00', '2024-03-21 17:20:00', '2024-03-21 17:20:00');

-- ============================================================================
-- APPOINTMENTS AND SESSIONS
-- ============================================================================

INSERT INTO appointments (
  id, therapist_id, client_id, case_id, appointment_date, start_time, end_time,
  duration_minutes, appointment_type, status, title, notes, created_at
) VALUES 
-- Dr. Sarah Johnson's completed sessions
('appt0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-08 10:00:00', '2024-03-08 10:00:00', '2024-03-08 10:50:00', 50, 'intake', 'completed', 'Initial Assessment Session', 'Completed comprehensive intake and initial assessment. Client presented with work-related anxiety following recent promotion.', '2024-03-01 10:00:00'),
('appt0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-15 10:00:00', '2024-03-15 10:00:00', '2024-03-15 10:50:00', 50, 'individual', 'completed', 'CBT Session 1 - Psychoeducation', 'Introduced cognitive behavioral therapy concepts. Identified automatic thought patterns and cognitive distortions.', '2024-03-08 10:00:00'),
('appt0003-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-03-22 10:00:00', '2024-03-22 10:00:00', '2024-03-22 10:50:00', 50, 'individual', 'completed', 'CBT Session 2 - Cognitive Restructuring', 'Practiced thought challenging techniques and cognitive restructuring. Assigned thought record homework exercises.', '2024-03-15 10:00:00'),
('appt0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-03-12 14:00:00', '2024-03-12 14:00:00', '2024-03-12 14:50:00', 50, 'individual', 'completed', 'Postpartum Support Session', 'Discussed postpartum adjustment and mood changes. Provided psychoeducation about postpartum depression and normalization of experience.', '2024-03-05 11:30:00'),
('appt0005-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-03-19 14:00:00', '2024-03-19 14:00:00', '2024-03-19 14:50:00', 50, 'individual', 'completed', 'Parenting Support and Bonding', 'Worked on mother-infant bonding strategies and self-care techniques. Discussed partner support and family dynamics.', '2024-03-12 14:00:00'),

-- Dr. Michael Chen's sessions
('appt0006-0006-0006-0006-000000000006', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', '2024-03-19 16:00:00', '2024-03-19 16:00:00', '2024-03-19 16:50:00', 50, 'individual', 'completed', 'Relationship Assessment', 'Individual session to assess relationship dynamics, communication patterns, and conflict resolution skills.', '2024-03-12 14:20:00'),
('appt0007-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'case0005-0005-0005-0005-000000000005', '2024-03-22 11:00:00', '2024-03-22 11:00:00', '2024-03-22 11:50:00', 50, 'individual', 'completed', 'Work Stress Management', 'Discussed work-related stressors, chronic pain impact, and coping strategies. Introduced mindfulness techniques.', '2024-03-15 16:45:00'),

-- Dr. Emily Rodriguez's sessions
('appt0008-0008-0008-0008-000000000008', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', '2024-03-27 15:00:00', '2024-03-27 15:00:00', '2024-03-27 15:50:00', 50, 'individual', 'completed', 'Teen Anxiety Session', 'Worked on anxiety management techniques appropriate for adolescents and school coping strategies.', '2024-03-20 10:30:00'),
('appt0009-0009-0009-0009-000000000009', '33333333-3333-3333-3333-333333333333', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'case0008-0008-0008-0008-000000000008', '2024-03-29 13:00:00', '2024-03-29 13:00:00', '2024-03-29 13:50:00', 50, 'assessment', 'completed', 'Eating Disorder Assessment', 'Comprehensive assessment for eating disorder symptoms, body image concerns, and family dynamics.', '2024-03-22 15:00:00'),

-- Upcoming appointments for testing
('appt0010-0010-0010-0010-000000000010', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '2024-12-20 10:00:00', '2024-12-20 10:00:00', '2024-12-20 10:50:00', 50, 'individual', 'scheduled', 'CBT Session 3 - Behavioral Experiments', 'Continue cognitive restructuring work and introduce behavioral experiments for workplace anxiety.', '2024-03-22 10:00:00'),
('appt0011-0011-0011-0011-000000000011', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', '2024-12-20 14:00:00', '2024-12-20 14:00:00', '2024-12-20 14:50:00', 50, 'individual', 'scheduled', 'Postpartum Follow-up Session', 'Review progress with bonding activities and mood management strategies.', '2024-03-19 14:00:00'),
('appt0012-0012-0012-0012-000000000012', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', '2024-12-21 16:00:00', '2024-12-21 16:00:00', '2024-12-21 16:50:00', 50, 'individual', 'scheduled', 'Communication Skills Practice', 'Practice conflict resolution techniques and active listening skills.', '2024-03-19 16:00:00');

-- ============================================================================
-- SESSION NOTES
-- ============================================================================

INSERT INTO session_notes (
  id, appointment_id, therapist_id, client_id, case_id, session_index,
  content, finalized, created_at, updated_at
) VALUES 
('note0001-0001-0001-0001-000000000001', 'appt0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 1, 
'{
  "session_type": "Initial Assessment",
  "presenting_issues": "Client reports significant work-related anxiety following recent promotion to senior management position. Symptoms include persistent worry about performance, difficulty sleeping (averaging 4-5 hours per night), concentration problems affecting work quality, and physical symptoms including muscle tension and headaches. Anxiety is particularly severe before team meetings and presentations.",
  "mental_status": "Alert and oriented x3. Mood anxious, affect congruent. Speech normal rate and volume. Thought process linear and goal-directed. No evidence of psychosis. Insight good, judgment intact.",
  "interventions_used": "Comprehensive intake assessment, psychoeducation about anxiety and the cognitive model, introduction to deep breathing exercises, discussion of treatment options and goals.",
  "client_response": "Client was engaged and receptive to learning about anxiety. Demonstrated good understanding of the connection between thoughts, feelings, and behaviors. Expressed relief at having a framework to understand symptoms.",
  "homework_assigned": "Daily anxiety monitoring using 0-10 scale, practice deep breathing exercises twice daily (morning and before bed), begin noticing automatic thoughts in anxiety-provoking situations.",
  "progress_notes": "Client shows excellent insight and motivation for treatment. Anxiety symptoms are significantly impacting work performance but client has strong support system and good coping resources. No safety concerns.",
  "next_session_plan": "Continue CBT approach, introduce thought records and cognitive restructuring techniques, review homework completion and troubleshoot any difficulties.",
  "risk_assessment": "Low risk. No suicidal ideation, good support system, motivated for treatment.",
  "session_rating": 8
}', true, '2024-03-08 11:00:00', '2024-03-08 11:00:00'),

('note0002-0002-0002-0002-000000000002', 'appt0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 2,
'{
  "session_type": "CBT Session",
  "homework_review": "Client completed anxiety monitoring consistently, averaging 6-7/10 anxiety in work situations. Successfully practiced breathing exercises daily. Identified several automatic thoughts including \"I will fail\" and \"Everyone will see I am incompetent.\"",
  "presenting_issues": "Client reports some improvement in anxiety awareness but still experiencing significant work stress. Had one panic attack during important presentation but used breathing techniques to manage it.",
  "interventions_used": "Cognitive restructuring techniques, thought challenging using evidence for/against method, problem-solving strategies for specific work situations, continued breathing practice.",
  "client_response": "Client engaged very well with cognitive techniques. Able to identify negative thought patterns and generate more balanced alternatives. Showed good understanding of cognitive distortions.",
  "homework_assigned": "Continue thought records with focus on work situations, practice thought challenging worksheet daily, implement one problem-solving strategy for upcoming project deadline.",
  "progress_notes": "Excellent progress with CBT techniques. Client developing better awareness of thought-feeling connections and beginning to challenge negative predictions. Anxiety levels showing gradual improvement.",
  "next_session_plan": "Review homework and troubleshoot any difficulties, introduce behavioral experiments for workplace situations, discuss assertiveness training and communication strategies.",
  "session_rating": 9
}', true, '2024-03-15 11:00:00', '2024-03-15 11:00:00'),

('note0003-0003-0003-0003-000000000003', 'appt0004-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 1,
'{
  "session_type": "Postpartum Support",
  "presenting_issues": "Client experiencing postpartum depression with mood changes, fatigue, difficulty bonding with 4-month-old baby, and overwhelming guilt about parenting abilities. Reports crying episodes, feeling like a \"bad mother,\" and comparing herself negatively to other mothers.",
  "mental_status": "Alert and oriented. Mood depressed, affect tearful at times. Speech soft but normal rate. Thought content focused on parenting concerns and self-criticism. No psychosis. Insight developing, judgment intact.",
  "interventions_used": "Psychoeducation about postpartum depression prevalence and treatability, normalization of experience, introduction to self-care strategies, discussion of mother-infant bonding activities.",
  "client_response": "Client expressed significant relief at learning postpartum depression is common and treatable. Became less tearful during session and showed increased hope. Very motivated to work on symptoms.",
  "homework_assigned": "Daily mood tracking using simple 1-10 scale, schedule at least one pleasant activity daily, practice self-compassion exercises, try suggested bonding activities with baby.",
  "progress_notes": "Client has excellent support system including partner and extended family. Good insight developing about postpartum depression. Strong motivation for treatment and recovery.",
  "next_session_plan": "Review mood tracking and pleasant activities, work on specific bonding strategies, discuss partner support and communication, address guilt and self-criticism.",
  "session_rating": 8
}', true, '2024-03-12 15:00:00', '2024-03-12 15:00:00');

-- ============================================================================
-- CBT WORKSHEETS AND EXERCISES
-- ============================================================================

INSERT INTO cbt_worksheets (
  id, therapist_id, client_id, case_id, type, title, content, responses, status, created_at, updated_at
) VALUES 
('worksheet01-0001-0001-0001-000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'thought_record', 'Work Anxiety Thought Record #1',
'{
  "situation": "Presenting quarterly results to senior management team",
  "date": "2024-03-10",
  "time": "2:00 PM",
  "mood_before": "Anxious (8/10), Worried (7/10)",
  "automatic_thoughts": ["They will think I am incompetent", "I will forget what to say", "Everyone will see I do not deserve this promotion"],
  "cognitive_distortions": ["Mind reading", "Catastrophizing", "All-or-nothing thinking"]
}',
'{
  "evidence_for": "I stumbled over words once during practice, I am new to this level of responsibility",
  "evidence_against": "I prepared thoroughly, my team provided positive feedback on the presentation, I have been successful in previous presentations, my manager promoted me for good reasons",
  "balanced_thought": "I may be nervous presenting to senior management, but I am well-prepared and have valuable information to share. Even if I make small mistakes, the content is solid.",
  "mood_after": "Anxious (4/10), Confident (6/10)",
  "behavioral_experiment": "Present without over-preparing and notice actual vs predicted outcomes"
}', 'completed', '2024-03-08 11:30:00', '2024-03-15 09:20:00'),

('worksheet02-0002-0002-0002-000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'thought_record', 'Postpartum Thoughts Record',
'{
  "situation": "Baby crying for extended period despite trying everything",
  "date": "2024-03-14",
  "time": "3:00 AM",
  "mood_before": "Frustrated (9/10), Guilty (8/10), Sad (7/10)",
  "automatic_thoughts": ["I am a terrible mother", "I do not know what I am doing", "Other mothers would handle this better", "My baby does not like me"]
}',
'{
  "evidence_for": "Baby seems unhappy despite my efforts, I feel overwhelmed and unsure",
  "evidence_against": "All babies cry and have fussy periods, I am learning and this is normal, I care deeply about my baby, I am seeking help which shows I am a good mother, other mothers also struggle with crying babies",
  "balanced_thought": "I am a new mother learning how to care for my baby. Crying is normal baby behavior and does not reflect my parenting ability. I am doing my best and seeking support.",
  "mood_after": "Frustrated (5/10), Guilty (3/10), Compassionate toward self (6/10)",
  "behavioral_experiment": "Ask other mothers about their experiences with crying babies"
}', 'completed', '2024-03-12 15:30:00', '2024-03-18 10:45:00');

-- Therapeutic exercises
INSERT INTO therapeutic_exercises (
  id, therapist_id, client_id, case_id, exercise_type, title, description,
  game_config, progress, status, last_played_at, total_sessions, created_at
) VALUES 
('exercise01-0001-0001-0001-000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'breathing', 'Daily Breathing Exercise for Work Anxiety', 'Practice deep breathing exercises to manage work-related anxiety and stress',
'{
  "duration": 300,
  "breath_pattern": "4-4-6",
  "guidance": true,
  "background_sounds": "nature",
  "difficulty": "beginner"
}',
'{
  "sessions_completed": 12,
  "total_time_seconds": 3600,
  "best_session_duration": 420,
  "streak_days": 8,
  "average_rating": 8.5,
  "favorite_pattern": "4-4-6",
  "stress_reduction_reported": 7
}', 'in_progress', '2024-04-15 08:30:00', 12, '2024-03-08 12:00:00'),

('exercise02-0002-0002-0002-000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'mindfulness', 'Mindful Parenting Exercises', 'Mindfulness exercises specifically designed for new mothers to reduce stress and improve present-moment awareness',
'{
  "duration": 600,
  "type": "guided",
  "focus": "parenting",
  "sessions": ["body_scan", "loving_kindness", "mindful_feeding", "stress_relief"]
}',
'{
  "sessions_completed": 15,
  "total_time_seconds": 9000,
  "favorite_session": "loving_kindness",
  "mindful_moments_daily": 8,
  "stress_reduction": 8,
  "bonding_improvement": 9
}', 'in_progress', '2024-04-20 19:15:00', 15, '2024-03-12 15:30:00'),

('exercise03-0003-0003-0003-000000003', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'cognitive_restructuring', 'Teen Thought Challenge Game', 'Interactive scenarios for challenging negative thoughts, designed specifically for teenagers',
'{
  "difficulty": "beginner",
  "scenarios": ["school", "social", "family", "future"],
  "points_system": true,
  "age_appropriate": true,
  "gamification": true
}',
'{
  "scenarios_completed": 18,
  "total_score": 1250,
  "accuracy_percentage": 87,
  "favorite_scenario": "social",
  "improvement_areas": ["future_thinking"],
  "confidence_rating": 7
}', 'in_progress', '2024-04-30 16:45:00', 18, '2024-03-27 17:00:00');

-- ============================================================================
-- PROGRESS TRACKING
-- ============================================================================

INSERT INTO progress_tracking (
  client_id, case_id, metric_type, value, source_type, source_id, recorded_at, created_at
) VALUES 
-- James Wilson progress (work anxiety improving over time)
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
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'bonding_rating', 5, 'manual', null, '2024-03-12 20:00:00', '2024-03-12 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'bonding_rating', 7, 'manual', null, '2024-03-19 20:00:00', '2024-03-19 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'bonding_rating', 8, 'manual', null, '2024-03-26 20:00:00', '2024-03-26 20:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'phq9_total', 10, 'psychometric', 'inst0003-0003-0003-0003-000000000003', '2024-03-06 10:15:00', '2024-03-06 10:15:00'),

-- Christopher Brown progress (teen anxiety)
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 8, 'manual', null, '2024-03-27 19:00:00', '2024-03-27 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 7, 'manual', null, '2024-04-03 19:00:00', '2024-04-03 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'anxiety_level', 6, 'manual', null, '2024-04-10 19:00:00', '2024-04-10 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'school_performance', 6, 'manual', null, '2024-03-27 19:00:00', '2024-03-27 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'school_performance', 7, 'manual', null, '2024-04-03 19:00:00', '2024-04-03 19:00:00'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'gad7_total', 10, 'psychometric', 'inst0007-0007-0007-0007-000000000007', '2024-03-21 17:20:00', '2024-03-21 17:20:00');

-- ============================================================================
-- RESOURCE LIBRARY
-- ============================================================================

INSERT INTO resource_library (
  id, title, description, category, subcategory, content_type, external_url,
  tags, difficulty_level, evidence_level, is_public, therapist_owner_id, created_by, created_at
) VALUES 
('resource01-0001-0001-0001-000000001', 'Anxiety Management Workbook', 'Comprehensive CBT workbook for managing anxiety symptoms with practical exercises and techniques', 'worksheet', 'anxiety', 'pdf', 'https://example.com/anxiety-workbook.pdf', ARRAY['anxiety', 'CBT', 'self-help', 'workbook'], 'beginner', 'research_based', true, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2024-03-01 12:00:00'),
('resource02-0002-0002-0002-000000002', 'Postpartum Depression Guide', 'Educational resource about postpartum depression for new mothers, including symptoms, treatment options, and support strategies', 'educational', 'depression', 'pdf', 'https://example.com/postpartum-guide.pdf', ARRAY['postpartum', 'depression', 'maternal', 'education'], 'beginner', 'clinical_consensus', true, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2024-03-05 13:00:00'),
('resource03-0003-0003-0003-000000003', 'Teen Anxiety Coping Strategies', 'Age-appropriate anxiety management techniques and coping strategies specifically designed for teenagers', 'intervention', 'anxiety', 'interactive', 'https://example.com/teen-anxiety-app', ARRAY['teen', 'anxiety', 'coping', 'interactive'], 'intermediate', 'research_based', true, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '2024-03-20 14:00:00'),
('resource04-0004-0004-0004-000000004', 'Mindfulness for Parents', 'Guided mindfulness exercises specifically designed for busy parents to reduce stress and improve emotional regulation', 'intervention', 'mindfulness', 'audio', 'https://example.com/parent-mindfulness.mp3', ARRAY['mindfulness', 'parenting', 'stress', 'audio'], 'beginner', 'research_based', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2024-03-15 15:00:00'),
('resource05-0005-0005-0005-000000005', 'Cognitive Restructuring Worksheet', 'Step-by-step worksheet for identifying and challenging negative thought patterns', 'worksheet', 'cognitive', 'pdf', 'https://example.com/cognitive-restructuring.pdf', ARRAY['CBT', 'cognitive', 'thoughts', 'worksheet'], 'intermediate', 'research_based', true, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2024-03-10 16:00:00');

-- ============================================================================
-- COMMUNICATION LOGS
-- ============================================================================

INSERT INTO communication_logs (
  id, therapist_id, client_id, case_id, communication_type, subject, content,
  direction, status, sent_at, created_at
) VALUES 
('comm0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'email', 'Appointment Reminder - Tomorrow at 10:00 AM', 'Hi James, this is a friendly reminder about your appointment tomorrow at 10:00 AM. Please bring your completed thought record worksheet that we discussed. Looking forward to seeing you and hearing about your progress with the breathing exercises!', 'outgoing', 'sent', '2024-03-14 16:00:00', '2024-03-14 16:00:00'),
('comm0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'text', 'Daily Check-in', 'Hi Maria, just checking in on how you are feeling today. Remember to practice the self-care activities we discussed and be gentle with yourself. You are doing an amazing job as a new mother!', 'outgoing', 'delivered', '2024-03-18 10:00:00', '2024-03-18 10:00:00'),
('comm0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'text', 'Great Job Today!', 'Hey Christopher! I heard from your mom that you used the breathing exercises at school today before your presentation. That is fantastic! Keep practicing these skills - you are building really important tools for managing anxiety.', 'outgoing', 'read', '2024-04-02 15:30:00', '2024-04-02 15:30:00'),
('comm0004-0004-0004-0004-000000000004', '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'case0004-0004-0004-0004-000000000004', 'email', 'Homework Assignment - Communication Exercises', 'Hi Lisa, please complete the communication exercises we discussed in our session before we meet next week. Focus especially on the active listening techniques and try to practice them in one conversation with your spouse. See you next Tuesday!', 'outgoing', 'sent', '2024-03-20 17:00:00', '2024-03-20 17:00:00');

-- ============================================================================
-- CLIENT ACTIVITIES (IN-BETWEEN SESSIONS)
-- ============================================================================

INSERT INTO client_activities (
  id, client_id, case_id, session_phase, kind, type, title, details,
  payload, occurred_at, created_by, created_at
) VALUES 
('activity01-0001-0001-0001-000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', 'between_sessions', 'mood_log', 'self_report', 'Evening Mood Check', 'Used breathing exercises before important meeting with CEO. Felt much more confident and calm than expected. Anxiety was manageable (4/10) and I was able to present my ideas clearly.',
'{
  "anxiety_level": 4,
  "mood_rating": 7,
  "coping_strategies_used": ["breathing_exercises", "positive_self_talk"],
  "situation": "CEO presentation",
  "outcome": "successful",
  "confidence_rating": 7
}', '2024-04-14 19:00:00', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-04-14 19:00:00'),

('activity02-0002-0002-0002-000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case0002-0002-0002-0002-000000000002', 'between_sessions', 'journal', 'journal', 'Daily Reflection - Good Day', 'Had a really wonderful day with the baby today. We read books together for 30 minutes and I felt very connected and present. Also took time for myself with a 20-minute walk while partner watched baby. Feeling much more like myself.',
'{
  "mood": 7,
  "bonding_activities": ["reading", "singing", "tummy_time"],
  "self_care": "20-minute walk",
  "support_used": "partner help",
  "gratitude": ["baby smiles", "partner support", "sunny weather"]
}', '2024-04-19 20:30:00', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-04-19 20:30:00'),

('activity03-0003-0003-0003-000000003', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', 'between_sessions', 'homework', 'homework', 'Social Challenge Completed', 'Successfully started a conversation with a classmate during lunch break. It was scary at first but went much better than I expected. We talked about the upcoming math test and I felt less alone.',
'{
  "assignment": "social_interaction",
  "completed": true,
  "anxiety_before": 8,
  "anxiety_during": 6,
  "anxiety_after": 4,
  "outcome": "positive",
  "learning": "Other students are also nervous about tests"
}', '2024-04-29 16:45:00', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '2024-04-29 16:45:00');

-- ============================================================================
-- CASE SUMMARIES
-- ============================================================================

INSERT INTO case_summaries (
  case_id, title, content, last_highlight, updated_by, updated_at, created_at
) VALUES 
('case0001-0001-0001-0001-000000000001', 'James Wilson - Work Anxiety Management', 
'{
  "summary": "35-year-old marketing manager with work-related anxiety following promotion. Excellent response to CBT interventions.",
  "key_points": [
    "Moderate depression (PHQ-9: 11) and mild anxiety (GAD-7: 7) at baseline",
    "Strong engagement with therapy and homework completion",
    "Significant improvement in anxiety management skills",
    "Good insight and motivation for continued treatment"
  ],
  "treatment_progress": "60% improvement in anxiety management, sleep quality improving",
  "interventions_effective": ["cognitive restructuring", "breathing exercises", "thought records"],
  "next_steps": ["workplace assertiveness training", "relapse prevention planning", "gradual therapy spacing"],
  "prognosis": "Excellent - client has strong coping skills and support system"
}', 'Client making excellent progress with CBT techniques. Anxiety levels decreasing from 8/10 to 4/10 over 6 weeks. Work performance improving and client reports increased confidence in leadership role.', '11111111-1111-1111-1111-111111111111', '2024-04-15 14:30:00', '2024-03-08 11:30:00'),

('case0002-0002-0002-0002-000000000002', 'Maria Garcia - Postpartum Depression Recovery',
'{
  "summary": "28-year-old new mother with postpartum depression showing excellent treatment response.",
  "key_points": [
    "Moderate postpartum depression (PHQ-9: 10) at 4 months postpartum",
    "Significant improvement in maternal bonding and confidence",
    "Strong family support system facilitating recovery",
    "Excellent engagement with treatment recommendations"
  ],
  "treatment_progress": "75% improvement in maternal confidence, mood stabilizing",
  "interventions_effective": ["psychoeducation", "bonding activities", "self-care planning", "mindfulness"],
  "next_steps": ["maintain self-care routine", "continue bonding activities", "monitor mood stability"],
  "prognosis": "Excellent - strong support system and early intervention"
}', 'Significant improvement in maternal bonding and mood stability. Client reports feeling much more confident as a mother and mood has improved from 4/10 to 7/10. Bonding with baby much stronger.', '11111111-1111-1111-1111-111111111111', '2024-04-20 16:45:00', '2024-03-12 15:30:00'),

('case0007-0007-0007-0007-000000000007', 'Christopher Brown - Teen Anxiety Treatment',
'{
  "summary": "16-year-old high school student with school and social anxiety responding well to teen-adapted CBT.",
  "key_points": [
    "Moderate anxiety (GAD-7: 10) affecting academic and social functioning",
    "Good therapeutic rapport established despite initial hesitation",
    "Family very supportive of treatment process",
    "Beginning to engage more in school and social activities"
  ],
  "treatment_progress": "40% improvement in anxiety management, increased school participation",
  "interventions_effective": ["teen-adapted CBT", "breathing exercises", "social skills practice"],
  "next_steps": ["continue CBT techniques", "school accommodation planning", "social skills development"],
  "prognosis": "Good - motivated teen with strong family support"
}', 'Teen client showing good progress with anxiety management techniques. School performance improving and beginning to engage more socially. Anxiety reduced from 8/10 to 6/10.', '33333333-3333-3333-3333-333333333333', '2024-04-30 15:50:00', '2024-03-27 16:30:00');

-- ============================================================================
-- SESSION AGENDA ITEMS
-- ============================================================================

INSERT INTO session_agenda (
  id, case_id, therapist_id, source, source_id, title, payload, created_at
) VALUES 
('agenda01-0001-0001-0001-000000000001', 'case0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'treatment_plan', null, 'Review anxiety management progress and workplace confidence', '{"type": "goal_review", "details": "Check progress on anxiety reduction goal, discuss workplace assertiveness"}', '2024-04-15 09:00:00'),
('agenda02-0002-0002-0002-000000000002', 'case0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'client_activity', 'activity01-0001-0001-0001-000000001', 'Discuss successful CEO presentation and coping strategy use', '{"type": "activity_review", "activity": "CEO presentation success", "details": "Client successfully used breathing exercises and positive self-talk"}', '2024-04-15 09:05:00'),
('agenda03-0003-0003-0003-000000000003', 'case0002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'assessment', 'inst0003-0003-0003-0003-000000000003', 'Review PHQ-9 results and postpartum depression progress', '{"type": "assessment_review", "score": 10, "details": "Discuss moderate depression score and excellent treatment response"}', '2024-04-20 13:00:00'),
('agenda04-0004-0004-0004-000000000004', 'case0007-0007-0007-0007-000000000007', '33333333-3333-3333-3333-333333333333', 'homework', null, 'Review social interaction homework and school anxiety progress', '{"type": "homework_review", "assignment": "social_challenge", "details": "Discuss successful peer interaction and continued school anxiety work"}', '2024-04-30 14:00:00');

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

INSERT INTO audit_logs (
  user_id, action, resource_type, resource_id, client_id, case_id, details, created_at
) VALUES 
('11111111-1111-1111-1111-111111111111', 'assessment_completed', 'assessment', 'inst0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '{"assessment": "PHQ-9", "score": 11, "interpretation": "Moderate Depression", "completion_time": "15 minutes"}', '2024-03-02 15:45:00'),
('11111111-1111-1111-1111-111111111111', 'assessment_completed', 'assessment', 'inst0002-0002-0002-0002-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '{"assessment": "GAD-7", "score": 7, "interpretation": "Mild Anxiety", "completion_time": "8 minutes"}', '2024-03-02 16:10:00'),
('11111111-1111-1111-1111-111111111111', 'case_created', 'case', 'case0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '{"case_number": "CASE-2024-001", "presenting_problem": "work anxiety"}', '2024-03-01 10:00:00'),
('11111111-1111-1111-1111-111111111111', 'session_completed', 'appointment', 'appt0001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'case0001-0001-0001-0001-000000000001', '{"session_type": "Initial Assessment", "duration": 50, "interventions": ["psychoeducation", "breathing_exercises"]}', '2024-03-08 11:00:00'),
('33333333-3333-3333-3333-333333333333', 'assessment_completed', 'assessment', 'inst0007-0007-0007-0007-000000000007', 'gggggggg-gggg-gggg-gggg-gggggggggggg', 'case0007-0007-0007-0007-000000000007', '{"assessment": "GAD-7", "score": 10, "interpretation": "Moderate Anxiety", "age_group": "adolescent"}', '2024-03-21 17:20:00');

-- ============================================================================
-- PROFESSIONAL MANAGEMENT DATA
-- ============================================================================

-- Sample therapist licenses
INSERT INTO therapist_licenses (
  id, therapist_id, license_name, license_number, issuing_authority, country,
  file_path, expires_on, status, verified_at, created_at
) VALUES 
('license01-0001-0001-0001-000000001', '11111111-1111-1111-1111-111111111111', 'Licensed Clinical Psychologist', 'LCP-NY-12345', 'New York State Education Department', 'United States', 'licenses/sarah_johnson_lcp.pdf', '2025-12-31', 'approved', '2024-01-20 10:00:00', '2024-01-15 10:00:00'),
('license02-0002-0002-0002-000000002', '22222222-2222-2222-2222-222222222222', 'Licensed Marriage and Family Therapist', 'LMFT-CA-67890', 'California Board of Behavioral Sciences', 'United States', 'licenses/michael_chen_lmft.pdf', '2025-08-15', 'approved', '2024-02-05 14:00:00', '2024-02-01 09:30:00'),
('license03-0003-0003-0003-000000003', '33333333-3333-3333-3333-333333333333', 'Licensed Professional Counselor', 'LPC-FL-54321', 'Florida Department of Health', 'United States', 'licenses/emily_rodriguez_lpc.pdf', '2025-06-30', 'approved', '2024-01-25 16:00:00', '2024-01-20 14:15:00');

-- Sample subscriptions
INSERT INTO subscriptions (
  id, user_id, plan_name, status, current_period_start, current_period_end, created_at
) VALUES 
('sub0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Professional Plan', 'active', '2024-01-15 00:00:00', '2024-02-15 00:00:00', '2024-01-15 10:00:00'),
('sub0002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'Professional Plan', 'active', '2024-02-01 00:00:00', '2024-03-01 00:00:00', '2024-02-01 09:30:00'),
('sub0003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'Professional Plan', 'active', '2024-01-20 00:00:00', '2024-02-20 00:00:00', '2024-01-20 14:15:00');

-- Sample clinic spaces
INSERT INTO clinic_spaces (
  id, name, description, location, amenities, pricing_hourly, pricing_daily,
  tailored_available, contact_phone, whatsapp, active, created_at
) VALUES 
('clinic01-0001-0001-0001-000000000001', 'Downtown Wellness Suite', 'Modern therapy office in the heart of downtown with natural lighting and comfortable seating', '123 Main Street, Suite 400, Downtown Medical District', ARRAY['WiFi', 'Parking', 'Wheelchair Accessible', 'Sound Proofing', 'Waiting Area'], 75, 400, true, '+1-555-CLINIC', '+1-555-2468', true, '2024-01-01 00:00:00'),
('clinic02-0002-0002-0002-000000000002', 'Family Therapy Center', 'Spacious office designed for family and group sessions with flexible seating arrangements', '456 Family Avenue, Suburban Plaza', ARRAY['WiFi', 'Parking', 'Play Area', 'Group Seating', 'Kitchen Access'], 85, 450, true, '+1-555-FAMILY', '+1-555-3579', true, '2024-01-01 00:00:00');

-- Sample VIP offers
INSERT INTO vip_offers (
  id, title, body, cta_label, cta_url, target_audience, expires_on, is_active, created_at
) VALUES 
('vip0001-0001-0001-0001-000000000001', 'Advanced CBT Training Workshop', 'Join our exclusive 2-day intensive workshop on advanced CBT techniques for anxiety disorders. Limited to 20 participants.', 'Register Now', 'https://example.com/cbt-workshop', ARRAY['therapist'], '2024-12-31', true, '2024-01-01 00:00:00'),
('vip0002-0002-0002-0002-000000000002', 'Supervision Group Opportunity', 'Monthly supervision group for early career therapists. Led by experienced supervisors with 15+ years experience.', 'Join Group', 'https://example.com/supervision-group', ARRAY['therapist'], '2024-12-31', true, '2024-01-01 00:00:00');

-- ============================================================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================================================

-- Refresh the materialized views with new data
REFRESH MATERIALIZED VIEW assessment_instance_latest_score;
REFRESH MATERIALIZED VIEW therapist_dashboard_summary;

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

-- Display summary of created test data
DO $$
DECLARE
  therapist_count INTEGER;
  client_count INTEGER;
  case_count INTEGER;
  assessment_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO therapist_count FROM profiles WHERE role = 'therapist';
  SELECT COUNT(*) INTO client_count FROM profiles WHERE role = 'client';
  SELECT COUNT(*) INTO case_count FROM cases;
  SELECT COUNT(*) INTO assessment_count FROM assessment_instances;
  SELECT COUNT(*) INTO session_count FROM appointments;
  
  RAISE NOTICE 'Test data creation completed successfully!';
  RAISE NOTICE 'Created % therapist profiles', therapist_count;
  RAISE NOTICE 'Created % client profiles', client_count;
  RAISE NOTICE 'Created % active cases', case_count;
  RAISE NOTICE 'Created % assessment instances', assessment_count;
  RAISE NOTICE 'Created % appointments/sessions', session_count;
  RAISE NOTICE 'Database is ready for frontend testing!';
END $$;