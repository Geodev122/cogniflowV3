-- Targeted demo seed for specific users only
-- This migration inserts demo application data only for the provided UUIDs.
-- It is safe to run multiple times (uses IF EXISTS checks and ON CONFLICT DO NOTHING).
-- IMPORTANT: does NOT create entries in auth.users. It only inserts into application tables.

DO $$
DECLARE
  has_profiles boolean := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles');
  has_user_id boolean;
  has_user_role boolean;
  has_role boolean;
  has_full_name boolean;
  has_first_name boolean;
  has_last_name boolean;
  has_email boolean;
  has_professional_details boolean;
  user_id_has_auth_fk boolean;
  id_is_uuid boolean;
  id_is_bigint boolean;
  col_list text;
  val_list text;
  stmt text;
  include_user_id boolean;
  user_id_nullable boolean;
  u record;
BEGIN
  IF NOT has_profiles THEN
    RAISE NOTICE 'profiles table not found, skipping targeted demo seed.';
    RETURN;
  END IF;

  has_user_id := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id');
  IF has_user_id THEN
    SELECT (is_nullable = 'YES') INTO user_id_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
    LIMIT 1;
  ELSE
    user_id_nullable := true;
  END IF;
  has_user_role := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_role');
  has_role := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role');
  has_full_name := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='full_name');
  has_first_name := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name');
  has_last_name := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_name');
  has_email := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email');
  has_professional_details := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='professional_details');
  id_is_uuid := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='id' AND data_type = 'uuid');
  id_is_bigint := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='id' AND data_type IN ('bigint','integer'));
  -- Detect if profiles.user_id has a FK constraint to auth.users(id). If so, avoid inserting into user_id because we don't create auth.users in this seed.
  user_id_has_auth_fk := EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name AND rc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE kcu.table_schema='public' AND kcu.table_name='profiles' AND kcu.column_name='user_id'
      AND ccu.table_schema='auth' AND ccu.table_name='users'
  );

  FOR u IN SELECT * FROM (VALUES
      ('fb1f33f3-b392-4c99-b4cf-77075df22886','Therapist','geo.elnajjar@gmail.com','Geo','Elnajjar'),
      ('0eaf6b05-66f7-4508-9c4c-90cf2483359e','Admin','fedgee911@gmail.com','Admin','User'),
      ('f41fdff0-1bac-4859-a9e7-c32f960e1cc8','Supervisor','rosaryco.cg@gmail.com','Supervisor','User'),
      ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','Client','test@client.com','Client','One'),
      ('44444444-4444-4444-4444-444444444444','Client','client@example.com','Client','Two'),
      ('22222222-2222-2222-2222-222222222222','Client','dazzlt.uk@gmail.com','Client','Three')
    ) AS t(user_id, role, email, first_name, last_name)
  LOOP
    col_list := '';
    val_list := '';

    -- If the profiles.id column is a uuid primary key, populate it first to avoid
    -- inserting a row without the required id (causes NOT NULL violations).
    include_user_id := false;
    IF id_is_uuid THEN
      col_list := col_list || 'id';
      val_list := val_list || quote_literal(u.user_id);
      -- If the schema also exposes user_id, attempt to populate it too. If the
      -- column has an FK to auth.users we'll only include it when the user
      -- exists in auth.users (to avoid FK violations). If the column is nullable
      -- we may skip it safely.
      IF has_user_id THEN
        IF user_id_has_auth_fk THEN
          IF EXISTS (SELECT 1 FROM auth.users WHERE id = u.user_id::uuid) THEN
            include_user_id := true;
          ELSE
            include_user_id := false;
          END IF;
        ELSE
          include_user_id := true;
        END IF;
        IF include_user_id THEN
          col_list := col_list || ', user_id';
          val_list := val_list || ', ' || quote_literal(u.user_id);
        END IF;
      END IF;
    ELSIF has_user_id THEN
      -- id is not a uuid column; populate user_id when available.
      col_list := col_list || 'user_id';
      val_list := val_list || quote_literal(u.user_id);
    END IF;

    IF has_user_role THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'user_role';
      val_list := val_list || quote_literal(u.role);
    ELSIF has_role THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'role';
      val_list := val_list || quote_literal(lower(u.role));
    END IF;

    IF has_email THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'email';
      val_list := val_list || quote_literal(u.email);
    END IF;

    IF has_full_name THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'full_name';
      val_list := val_list || quote_literal(u.first_name || ' ' || u.last_name);
    ELSE
      IF has_first_name THEN
        IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
        col_list := col_list || 'first_name';
        val_list := val_list || quote_literal(u.first_name);
      END IF;
      IF has_last_name THEN
        IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
        col_list := col_list || 'last_name';
        val_list := val_list || quote_literal(u.last_name);
      END IF;
    END IF;

    IF has_professional_details THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'professional_details';
      val_list := val_list || quote_literal(jsonb_build_object('seeded', true)::text);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
      IF col_list <> '' THEN col_list := col_list || ', '; val_list := val_list || ', '; END IF;
      col_list := col_list || 'created_at';
      val_list := val_list || 'now()';
    END IF;

    IF col_list = '' THEN
      RAISE NOTICE 'No suitable profile columns detected; skipping inserts into profiles.';
    ELSE
      stmt := format('INSERT INTO public.profiles (%s) VALUES (%s) ON CONFLICT DO NOTHING', col_list, val_list);
      BEGIN
        EXECUTE stmt;
      EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'Skipped profile insert due to FK violation for user id %: %', u.user_id, SQLERRM;
      WHEN others THEN
        RAISE NOTICE 'Could not insert profile row for %: %', u.user_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- Insert therapist license if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_licenses') THEN
    -- therapist_licenses expects therapist_id to reference public.profiles(id). We try to find a matching id.
    PERFORM 1;
    BEGIN
      INSERT INTO public.therapist_licenses (id, therapist_id, license_name, license_number, issuing_authority, country, status, created_at)
      SELECT 'demo-lic-1'::uuid, p.id, 'Demo License', 'DEMO-0001', 'Demo Board', 'FR', 'approved', now()
      FROM public.profiles p
      WHERE (p.user_id::text = 'fb1f33f3-b392-4c99-b4cf-77075df22886' OR p.id::text = 'fb1f33f3-b392-4c99-b4cf-77075df22886')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert therapist_licenses demo row: %', SQLERRM;
    END;
  END IF;

  -- Create simple therapist-client relations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_client_relations') THEN
    BEGIN
      INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, created_at)
      SELECT p_ther.id, p_client.id, 'active', now()
      FROM (
        SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1
      ) p_ther, (
        SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71' LIMIT 1
      ) p_client
      ON CONFLICT DO NOTHING;

      INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, created_at)
      SELECT p_ther.id, p_client.id, 'active', now()
      FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) p_ther,
           (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = '44444444-4444-4444-4444-444444444444' LIMIT 1) p_client
      ON CONFLICT DO NOTHING;

      INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, created_at)
      SELECT p_ther.id, p_client.id, 'active', now()
      FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) p_ther,
           (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = '22222222-2222-2222-2222-222222222222' LIMIT 1) p_client
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert therapist-client relations: %', SQLERRM;
    END;
  END IF;

  -- Seed a few appointments if appointments exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    BEGIN
      INSERT INTO public.appointments (id, therapist_id, client_id, appointment_date, start_time, end_time, duration_minutes, status, created_at)
      SELECT gen_random_uuid(), p_ther.id, p_client.id, now() + interval '2 days', now() + interval '2 days', now() + interval '2 days' + interval '50 minutes', 50, 'confirmed', now()
      FROM (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1) p_ther,
           (SELECT id FROM public.profiles WHERE COALESCE(user_id::text, id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71' LIMIT 1) p_client
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert appointments demo row: %', SQLERRM;
    END;
  END IF;

  -- Seed session notes if session_notes exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='session_notes') THEN
    BEGIN
      INSERT INTO public.session_notes (id, appointment_id, therapist_id, client_id, note_type, content, created_at)
      SELECT gen_random_uuid(), a.id, a.therapist_id, a.client_id, 'clinical', jsonb_build_object('text','Demo note: client engaged with homework'), now()
      FROM public.appointments a
      WHERE a.therapist_id = (SELECT id FROM public.profiles WHERE COALESCE(user_id::text,id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1)
      LIMIT 5
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert session_notes demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed a small resource owned by the therapist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resource_library') THEN
    BEGIN
      INSERT INTO public.resource_library (id, title, description, category, content_type, therapist_owner_id, created_by, created_at, is_public)
      SELECT gen_random_uuid(), 'Intro to CBT: Thought Records', 'Short worksheet to practice thought records', 'worksheet', 'pdf', p.id, p.id, now(), true
      FROM public.profiles p
      WHERE COALESCE(p.user_id::text,p.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert resource_library demo row: %', SQLERRM;
    END;
  END IF;

  -- Seed basic messages if messages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    BEGIN
      INSERT INTO public.messages (id, thread_id, sender_id, recipient_id, body, created_at)
      SELECT gen_random_uuid(), gen_random_uuid(), p1.id, p2.id, 'Hi — looking forward to our session. Please complete the thought record before we meet.', now()
      FROM public.profiles p1, public.profiles p2
      WHERE COALESCE(p1.user_id::text,p1.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' AND COALESCE(p2.user_id::text,p2.id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert messages demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed minimal assessment instance if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assessment_instances') THEN
    BEGIN
      INSERT INTO public.assessment_instances (id, template_id, therapist_id, client_id, status, created_at)
      SELECT gen_random_uuid(), 'phq9', (SELECT id FROM public.profiles WHERE COALESCE(user_id::text,id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886' LIMIT 1), (SELECT id FROM public.profiles WHERE COALESCE(user_id::text,id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71' LIMIT 1), 'completed', now()
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert assessment_instances demo row: %', SQLERRM;
    END;
  END IF;

  -- Seed app_analytics row if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_analytics') THEN
    BEGIN
      INSERT INTO public.app_analytics (id, user_id, event_type, event_payload, created_at)
      VALUES (gen_random_uuid(), 'fb1f33f3-b392-4c99-b4cf-77075df22886', 'dashboard_view', jsonb_build_object('note','seeded entry'), now())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert app_analytics demo row: %', SQLERRM;
    END;
  END IF;

  -- Seed a minimal case per client if cases exists (so progress and worksheets can reference a case)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cases') THEN
    BEGIN
      INSERT INTO public.cases (id, client_id, therapist_id, case_number, status, opened_at, created_at)
      SELECT gen_random_uuid(), c.id, t.id, ('CASE-DEMO-' || substr(c.id::text,1,8)), 'active', now(), now()
      FROM public.profiles c
      JOIN public.profiles t ON COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      WHERE COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert demo cases: %', SQLERRM;
    END;
  END IF;

  -- Seed progress_tracking entries for clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='progress_tracking') THEN
    BEGIN
      INSERT INTO public.progress_tracking (id, client_id, case_id, metric_type, value, source_type, source_id, recorded_at)
      SELECT gen_random_uuid(), c.id, cas.id, 'anxiety_level', 6, 'manual', NULL, now()
      FROM public.profiles c
      LEFT JOIN public.cases cas ON cas.client_id = c.id
      WHERE COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert progress_tracking demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed CB T worksheets for clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cbt_worksheets') THEN
    BEGIN
      INSERT INTO public.cbt_worksheets (id, therapist_id, client_id, case_id, type, title, content, status, created_at)
      SELECT gen_random_uuid(), t.id, c.id, cas.id, 'thought_record', 'Thought Record (demo)', jsonb_build_object('steps', ARRAY['situation','automatic_thought','evidence_for','alternative_thought','outcome']), 'active', now()
      FROM public.profiles c
      JOIN public.profiles t ON COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      LEFT JOIN public.cases cas ON cas.client_id = c.id
      WHERE COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert cbt_worksheets demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed therapeutic_exercises for clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapeutic_exercises') THEN
    BEGIN
      INSERT INTO public.therapeutic_exercises (id, therapist_id, client_id, case_id, exercise_type, title, description, progress, status, created_at)
      SELECT gen_random_uuid(), t.id, c.id, cas.id, 'exposure', 'Graded Exposure (demo)', 'Short graded exposure task tailored for demo', jsonb_build_object('sessions',1,'completed',false), 'active', now()
      FROM public.profiles c
      JOIN public.profiles t ON COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      LEFT JOIN public.cases cas ON cas.client_id = c.id
      WHERE COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert therapeutic_exercises demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed client_activities (in-between session tasks) for clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_activities') THEN
    BEGIN
      INSERT INTO public.client_activities (id, client_id, case_id, session_phase, kind, type, title, details, payload, occurred_at, created_by, created_at)
      SELECT gen_random_uuid(), c.id, cas.id, 'between_sessions', 'homework', 'exercise', 'Demo homework: breathing practice', 'Complete 5-minute breathing daily', jsonb_build_object('duration_minutes',5), now(), t.id, now()
      FROM public.profiles c
      JOIN public.profiles t ON COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      LEFT JOIN public.cases cas ON cas.client_id = c.id
      WHERE COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert client_activities demo rows: %', SQLERRM;
    END;
  END IF;

  -- Seed practice_analytics for the therapist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='practice_analytics') THEN
    BEGIN
      INSERT INTO public.practice_analytics (id, therapist_id, metric_name, metric_value, metric_date, metadata, created_at)
      SELECT gen_random_uuid(), t.id, 'clients_active', 3, current_date, jsonb_build_object('demo',true), now()
      FROM public.profiles t
      WHERE COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not insert practice_analytics demo row: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'Targeted demo seed completed for specified user UUIDs.';
END$$;
