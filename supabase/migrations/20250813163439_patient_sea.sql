-- ARCHIVED: This migration used to contain a broad demo payload including auth.users inserts.
-- The original content has been moved to:
--   supabase/migrations/archived/20250813163439_patient_sea.sql
-- To keep the active migrations safe, this file now contains only minimal idempotent
-- inserts necessary for the two demo clients and avoids creating additional auth.users.

-- This file previously contained a large archived demo payload with explicit user UUIDs
-- and inserts that may create data referencing auth.users which do not exist in the target DB.
-- To prevent accidental creation of orphaned rows or violations of auth-related constraints,
-- the detailed archived demo content has been disabled. The original statements are preserved
-- inside a non-executing block below for history and reference.

DO $$
BEGIN
  IF FALSE THEN

    -- Minimal safe client profile inserts (idempotent)

    INSERT INTO profiles (id, role, created_at)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'client',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, role, created_at)
    VALUES (
      '22222222-2222-2222-2222-222222222222',
      'client',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create therapist-client relationships for the minimal demo
    INSERT INTO therapist_client_relations (therapist_id, client_id, created_at) VALUES 
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days'),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '45 days')
    ON CONFLICT (therapist_id, client_id) DO NOTHING;

    -- Note: For richer demo payloads (assessments, cases, worksheets), use the targeted seed
    -- migration: supabase/migrations/20251001090000_targeted_demo_seed.sql which is limited
    -- to the approved set of user UUIDs.

    -- Create form assignments
    INSERT INTO form_assignments (
      therapist_id,
      client_id,
      form_type,
      form_id,
      title,
      instructions,
      due_date,
      reminder_frequency,
      status,
      assigned_at
    ) VALUES 
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'psychometric', 'gad7-assessment', 'GAD-7 Anxiety Assessment', 'Please complete this assessment to help track your anxiety levels', CURRENT_DATE + INTERVAL '3 days', 'daily', 'assigned', NOW()),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'psychometric', 'phq9-assessment', 'PHQ-9 Depression Screening', 'Please complete this depression screening as part of your ongoing treatment', CURRENT_DATE + INTERVAL '2 days', 'weekly', 'assigned', NOW()),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'worksheet', NULL, 'Daily Thought Record', 'Practice identifying and challenging negative thoughts using this worksheet', CURRENT_DATE + INTERVAL '7 days', 'none', 'assigned', NOW() - INTERVAL '2 days'),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'exercise', NULL, 'Mood Tracking Exercise', 'Track your daily mood and identify patterns', CURRENT_DATE + INTERVAL '14 days', 'daily', 'in_progress', NOW() - INTERVAL '5 days');

    -- Create psychometric forms
    INSERT INTO psychometric_forms (
      id,
      therapist_id,
      client_id,
      form_type,
      title,
      questions,
      responses,
      score,
      status,
      created_at,
      completed_at
    ) VALUES 
    -- Completed assessments for progress tracking
    (
      '77777777-7777-7777-7777-777777777777',
      'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
      '11111111-1111-1111-1111-111111111111',
      'gad7',
      'GAD-7 Anxiety Assessment - Week 1',
      '[]',
      '{"gad7_1": 3, "gad7_2": 2, "gad7_3": 3, "gad7_4": 2, "gad7_5": 1, "gad7_6": 2, "gad7_7": 2}',
      15,
      'completed',
      NOW() - INTERVAL '21 days',
      NOW() - INTERVAL '21 days'
    ),
    (
      '88888888-8888-8888-8888-888888888888',
      'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
      '11111111-1111-1111-1111-111111111111',
      'gad7',
      'GAD-7 Anxiety Assessment - Week 3',
      '[]',
      '{"gad7_1": 2, "gad7_2": 2, "gad7_3": 2, "gad7_4": 1, "gad7_5": 1, "gad7_6": 2, "gad7_7": 2}',
      12,
      'completed',
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '14 days'
    ),
    (
      '99999999-9999-9999-9999-999999999999',
      'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
      '22222222-2222-2222-2222-222222222222',
      'phq9',
      'PHQ-9 Depression Screening - Baseline',
      '[]',
      '{"phq9_1": 2, "phq9_2": 3, "phq9_3": 2, "phq9_4": 3, "phq9_5": 1, "phq9_6": 2, "phq9_7": 2, "phq9_8": 1, "phq9_9": 0}',
      16,
      'completed',
      NOW() - INTERVAL '35 days',
      NOW() - INTERVAL '35 days'
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'f7cb820b-f73e-4bfe-9571-261c7eef79e0',
      '22222222-2222-2222-2222-222222222222',
      'phq9',
      'PHQ-9 Depression Screening - Week 4',
      '[]',
      '{"phq9_1": 1, "phq9_2": 2, "phq9_3": 1, "phq9_4": 2, "phq9_5": 1, "phq9_6": 1, "phq9_7": 1, "phq9_8": 0, "phq9_9": 0}',
      9,
      'completed',
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '14 days'
    );

    -- Create progress tracking data
    INSERT INTO progress_tracking (
      client_id,
      metric_type,
      value,
      source_type,
      source_id,
      recorded_at
    ) VALUES 
    -- John Smith (anxiety progress)
    ('11111111-1111-1111-1111-111111111111', 'gad7_total', 15, 'psychometric', '77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '21 days'),
    ('11111111-1111-1111-1111-111111111111', 'gad7_total', 12, 'psychometric', '88888888-8888-8888-8888-888888888888', NOW() - INTERVAL '14 days'),
    ('11111111-1111-1111-1111-111111111111', 'mood_rating', 6, 'manual', NULL, NOW() - INTERVAL '7 days'),
    ('11111111-1111-1111-1111-111111111111', 'mood_rating', 7, 'manual', NULL, NOW() - INTERVAL '3 days'),
    ('11111111-1111-1111-1111-111111111111', 'mood_rating', 8, 'manual', NULL, NOW() - INTERVAL '1 day'),
    -- Emily Davis (depression progress)
    ('22222222-2222-2222-2222-222222222222', 'phq9_total', 16, 'psychometric', '99999999-9999-9999-9999-999999999999', NOW() - INTERVAL '35 days'),
    ('22222222-2222-2222-2222-222222222222', 'phq9_total', 9, 'psychometric', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '14 days'),
    ('22222222-2222-2222-2222-222222222222', 'mood_rating', 4, 'manual', NULL, NOW() - INTERVAL '10 days'),
    ('22222222-2222-2222-2222-222222222222', 'mood_rating', 5, 'manual', NULL, NOW() - INTERVAL '5 days'),
    ('22222222-2222-2222-2222-222222222222', 'mood_rating', 6, 'manual', NULL, NOW() - INTERVAL '2 days');

    -- Create CBT worksheets
    INSERT INTO cbt_worksheets (
      therapist_id,
      client_id,
      type,
      title,
      content,
      status,
      created_at
    ) VALUES 
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'thought_record', 'Daily Thought Record - Week 1', '{"situation": "Work presentation", "automatic_thought": "I will mess up and everyone will think I am incompetent", "emotion": "anxious", "intensity": 8, "evidence_for": "I have made mistakes before", "evidence_against": "I have given successful presentations in the past", "balanced_thought": "I am prepared and even if I make a small mistake, it does not define my competence", "new_emotion": "nervous but confident", "new_intensity": 4}', 'completed', NOW() - INTERVAL '10 days'),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'thought_record', 'Thought Challenging Exercise', '{"situation": "Job interview rejection", "automatic_thought": "I will never find a good job", "emotion": "hopeless", "intensity": 9}', 'in_progress', NOW() - INTERVAL '3 days');

    -- Create therapeutic exercises
    INSERT INTO therapeutic_exercises (
      therapist_id,
      client_id,
      exercise_type,
      title,
      description,
      game_config,
      progress,
      status,
      created_at,
      last_played_at
    ) VALUES 
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'breathing', 'Deep Breathing Exercise', 'Practice 4-7-8 breathing technique for anxiety management', '{"cycles_target": 10, "inhale_duration": 4, "hold_duration": 7, "exhale_duration": 8}', '{"cycles_completed": 25, "total_sessions": 8, "best_session": 15}', 'in_progress', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '22222222-2222-2222-2222-222222222222', 'mindfulness', 'Mindfulness Meditation', 'Guided mindfulness practice for mood regulation', '{"session_duration": 10, "guidance_level": "beginner"}', '{"total_minutes": 120, "sessions_completed": 12, "streak_days": 5}', 'in_progress', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', '11111111-1111-1111-1111-111111111111', 'cognitive_restructuring', 'Thought Detective Game', 'Interactive scenarios to practice identifying helpful vs unhelpful thoughts', '{"difficulty": "intermediate", "scenarios_completed": 8}', '{"score": 85, "accuracy": 92, "scenarios_mastered": 8}', 'completed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days');

    -- Create assessment reports
    INSERT INTO assessment_reports (
      client_id,
      therapist_id,
      report_type,
      title,
      content,
      generated_by,
      report_date,
      created_at
    ) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'psychometric', 'GAD-7 Progress Report', '{"assessment": "GAD-7", "baseline_score": 15, "current_score": 12, "improvement": 20, "interpretation": "Moderate anxiety with 20% improvement", "recommendations": "Continue CBT techniques, add mindfulness practice"}', 'ai', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ('22222222-2222-2222-2222-222222222222', 'f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'psychometric', 'PHQ-9 Progress Report', '{"assessment": "PHQ-9", "baseline_score": 16, "current_score": 9, "improvement": 44, "interpretation": "Significant improvement in depression symptoms", "recommendations": "Continue current treatment approach, consider reducing session frequency"}', 'ai', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

    -- Create practice analytics
    INSERT INTO practice_analytics (
      therapist_id,
      metric_name,
      metric_value,
      metric_date,
      metadata,
      created_at
    ) VALUES 
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'client_satisfaction', 4.8, CURRENT_DATE, '{"survey_responses": 15, "response_rate": 75}', NOW()),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'session_completion_rate', 95, CURRENT_DATE, '{"total_scheduled": 20, "completed": 19, "no_shows": 1}', NOW()),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'assessment_completion_rate', 87, CURRENT_DATE, '{"assigned": 15, "completed": 13, "pending": 2}', NOW()),
    ('f7cb820b-f73e-4bfe-9571-261c7eef79e0', 'avg_improvement_score', 32, CURRENT_DATE, '{"measurement": "percentage", "timeframe": "monthly"}', NOW());

    -- Populate gamified apps
    INSERT INTO gamified_apps (
      id,
      app_type,
      name,
      description,
      version,
      app_config,
      game_mechanics,
      difficulty_level,
      estimated_duration,
      is_active,
      evidence_based,
      tags,
      created_at
    ) VALUES 
    (
      'breathing-buddy-app',
      'exercise',
      'Breathing Buddy',
      'Interactive breathing exercises with visual guidance and progress tracking',
      '1.2.0',
      '{"breathing_patterns": ["4-7-8", "box_breathing", "triangle"], "visual_guides": true, "progress_tracking": true}',
      '{"points_per_cycle": 10, "achievements": ["first_session", "week_streak", "master_breather"], "levels": 5}',
      'beginner',
      5,
      true,
      true,
      '["breathing", "anxiety", "relaxation", "mindfulness"]',
      NOW()
    ),
    (
      'mindful-moments-app',
      'exercise',
      'Mindful Moments',
      'Guided mindfulness and meditation exercises for emotional regulation',
      '1.1.0',
      '{"session_lengths": [5, 10, 15, 20], "guidance_types": ["body_scan", "breath_focus", "loving_kindness"], "background_sounds": true}',
      '{"mindfulness_points": 20, "streak_bonuses": true, "meditation_badges": ["beginner", "consistent", "zen_master"]}',
      'beginner',
      10,
      true,
      true,
      '["mindfulness", "meditation", "emotional_regulation", "stress"]',
      NOW()
    ),
    (
      'thought-detective-app',
      'assessment',
      'Thought Detective',
      'Interactive cognitive restructuring scenarios to practice identifying and challenging unhelpful thoughts',
      '1.0.0',
      '{"scenario_types": ["work_stress", "social_anxiety", "self_criticism"], "difficulty_progression": true, "feedback_system": true}',
      '{"detective_points": 15, "accuracy_bonuses": true, "scenario_badges": ["rookie", "detective", "master_investigator"]}',
      'intermediate',
      15,
      true,
      true,
      '["cognitive_restructuring", "CBT", "thought_challenging", "anxiety"]',
      NOW()
    );

    -- Create app sessions for demo data
    INSERT INTO app_sessions (
      app_id,
      user_id,
      session_type,
      started_at,
      completed_at,
      duration_seconds,
      score,
      max_score,
      responses,
      game_data,
      completion_status
    ) VALUES 
    ('breathing-buddy-app', '11111111-1111-1111-1111-111111111111', 'practice', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', 300, 85, 100, '{"cycles_completed": 8, "average_pace": "good"}', '{"achievements_unlocked": ["first_session"], "level_reached": 2}', 'completed'),
    ('mindful-moments-app', '22222222-2222-2222-2222-222222222222', 'practice', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', 600, 90, 100, '{"session_type": "body_scan", "interruptions": 1}', '{"mindfulness_score": 90, "consistency_bonus": 10}', 'completed'),
    ('thought-detective-app', '11111111-1111-1111-1111-111111111111', 'assessment', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '12 minutes', 720, 92, 100, '{"scenarios_completed": 5, "accuracy": 92}', '{"detective_level": "intermediate", "badges_earned": ["rookie", "detective"]}', 'completed');

    -- Create app progress tracking
    INSERT INTO app_progress (
      app_id,
      user_id,
      total_sessions,
      total_time_minutes,
      best_score,
      average_score,
      current_level,
      experience_points,
      achievements,
      streak_days,
      last_played_at,
      mastery_level
    ) VALUES 
    ('breathing-buddy-app', '11111111-1111-1111-1111-111111111111', 8, 45, 95, 87, 3, 680, '["first_session", "week_streak"]', 5, NOW() - INTERVAL '1 day', 'beginner'),
    ('mindful-moments-app', '22222222-2222-2222-2222-222222222222', 12, 120, 95, 88, 2, 1200, '["beginner", "consistent"]', 7, NOW() - INTERVAL '1 day', 'intermediate'),
    ('thought-detective-app', '11111111-1111-1111-1111-111111111111', 3, 36, 92, 89, 2, 270, '["rookie", "detective"]', 0, NOW() - INTERVAL '5 days', 'beginner');

    -- Update database statistics for better query performance
    ANALYZE;

  END IF;
END;
$$;