-- Minimal, targeted safe seed for demo users only
-- This migration inserts demo application data only for the approved six UUIDs.
-- It is intentionally conservative: it does NOT create entries in auth.users
-- and only inserts application rows that reference existing profiles for
-- the six demo UUIDs. It is safe to run repeatedly (uses ON CONFLICT DO NOTHING)
-- and adapts to optional columns like client_activities.kind / client_activities.type.

DO $$
DECLARE
  ca_has_kind boolean;
  ca_has_type boolean;
  ca_col_list text;
  ca_val_list text;
  ca_stmt text;
  ca_id_list text[];
BEGIN
  -- If profiles table doesn't exist, nothing to do
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    RAISE NOTICE 'profiles table not found, skipping restricted seed.';
    RETURN;
  END IF;

  -- Approved demo UUIDs (do NOT create auth.users; only reference profiles)
  -- Therapists: fb1f33f3-b392-4c99-b4cf-77075df22886
  -- Admin/Supervisor (present for reference): 0eaf6b05-66f7-4508-9c4c-90cf2483359e, f41fdff0-1bac-4859-a9e7-c32f960e1cc8
  -- Clients: 3de362a5-692a-4fe6-9c3a-54f9ef9f3d71, 44444444-4444-4444-4444-444444444444, 22222222-2222-2222-2222-222222222222

  -- Seed minimal therapist-client relations for the demo therapist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_client_relations') THEN
    BEGIN
      INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, created_at)
      SELECT t.id, c.id, 'active', now()
      FROM public.profiles t, public.profiles c
      WHERE COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
        AND COALESCE(c.user_id::text,c.id::text) IN ('3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'therapist_client_relations seed skipped: %', SQLERRM;
    END;
  END IF;

  -- Simple resource, appointment, assessment, message and analytics seeds limited to approved IDs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resource_library') THEN
    BEGIN
      INSERT INTO public.resource_library (id, title, description, category, content_type, therapist_owner_id, created_by, created_at, is_public)
      SELECT gen_random_uuid(), 'Demo: CBT Thought Record', 'Short worksheet for demo', 'worksheet', 'pdf', p.id, p.id, now(), true
      FROM public.profiles p
      WHERE COALESCE(p.user_id::text,p.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'resource_library seed skipped: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    BEGIN
      INSERT INTO public.appointments (id, therapist_id, client_id, appointment_date, duration_minutes, status, created_at)
      SELECT gen_random_uuid(), t.id, c.id, now() + interval '2 days', 50, 'confirmed', now()
      FROM public.profiles t, public.profiles c
      WHERE COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
        AND COALESCE(c.user_id::text,c.id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'appointments seed skipped: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assessment_instances') THEN
    BEGIN
      INSERT INTO public.assessment_instances (id, template_id, therapist_id, client_id, status, created_at)
      SELECT gen_random_uuid(), 'phq9', t.id, c.id, 'completed', now()
      FROM public.profiles t, public.profiles c
      WHERE COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
        AND COALESCE(c.user_id::text,c.id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'assessment_instances seed skipped: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    BEGIN
      INSERT INTO public.messages (id, thread_id, sender_id, recipient_id, body, created_at)
      SELECT gen_random_uuid(), gen_random_uuid(), t.id, c.id, 'Demo message: please complete the thought record before our session.', now()
      FROM public.profiles t, public.profiles c
      WHERE COALESCE(t.user_id::text,t.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
        AND COALESCE(c.user_id::text,c.id::text) = '3de362a5-692a-4fe6-9c3a-54f9ef9f3d71'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'messages seed skipped: %', SQLERRM;
    END;
  END IF;

  -- client_activities: schema-adaptive, limited to demo clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_activities') THEN
    ca_has_kind := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='client_activities' AND column_name='kind');
    ca_has_type := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='client_activities' AND column_name='type');
    ca_col_list := 'id, client_id, session_phase, title, details, payload, occurred_at, created_by, created_at';
    ca_val_list := 'gen_random_uuid(), c.id, ''between_sessions'', ''Demo homework: breathing practice'', ''Complete 5-minute breathing daily'', jsonb_build_object(''duration_minutes'',5), now(), t.id, now()';
    IF ca_has_kind THEN
      ca_col_list := replace(ca_col_list, 'session_phase, title', 'session_phase, kind, title');
      ca_val_list := replace(ca_val_list, '''between_sessions'', ''Demo homework: breathing practice''', '''between_sessions'', ''homework'', ''Demo homework: breathing practice''');
    END IF;
    IF ca_has_type THEN
      ca_col_list := replace(ca_col_list, 'title, details', 'title, type, details');
      ca_val_list := replace(ca_val_list, '''Demo homework: breathing practice'', ''Complete 5-minute breathing daily''', '''Demo homework: breathing practice'', ''exercise'', ''Complete 5-minute breathing daily''');
    END IF;
    ca_id_list := ARRAY['3de362a5-692a-4fe6-9c3a-54f9ef9f3d71','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222'];
    ca_stmt := format('INSERT INTO public.client_activities (%s) SELECT %s FROM public.profiles c JOIN public.profiles t ON COALESCE(t.user_id::text,t.id::text) = %L WHERE COALESCE(c.user_id::text,c.id::text) = ANY($1) ON CONFLICT (id) DO NOTHING', ca_col_list, ca_val_list, 'fb1f33f3-b392-4c99-b4cf-77075df22886');
    BEGIN
      EXECUTE ca_stmt USING ca_id_list;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'client_activities seed skipped: %', SQLERRM;
    END;
  END IF;

  -- practice analytics minimal
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='practice_analytics') THEN
    BEGIN
  INSERT INTO public.practice_analytics (id, therapist_id, metric_name, metric_value, metric_date, metadata, created_at)
  SELECT gen_random_uuid(), p.id, 'clients_active', 3, current_date, jsonb_build_object('demo', true), now()
      FROM public.profiles p
      WHERE COALESCE(p.user_id::text,p.id::text) = 'fb1f33f3-b392-4c99-b4cf-77075df22886'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'practice_analytics seed skipped: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'Restricted demo seed (wild_rice) completed for approved demo UUIDs.';
END$$;

-- NOTE: Legacy bulk seed data removed. See archival migrations for full legacy dataset.
