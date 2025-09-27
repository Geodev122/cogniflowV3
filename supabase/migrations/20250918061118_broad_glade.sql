/* Archived: broad_glade demo seed

   The original, very large demo seed was archived and replaced with the
   focused migration `20251001090000_targeted_demo_seed.sql` which seeds only
   for the six specified user UUIDs (therapist, admin, supervisor, three clients).

   If you need the original full demo content, see:
   supabase/migrations/archived/20250918061118_broad_glade.sql
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
  -- File archived: moved to supabase/migrations/archived/20250918061118_broad_glade.sql
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