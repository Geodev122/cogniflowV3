-- Migration: add roles, profiles, user_roles, RLS, helper function, and trigger
-- Idempotent where possible; safe to run multiple times

BEGIN;

-- Ensure pgcrypto exists for any uuid/gen usage
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles/profiles/etc are consolidated in `20251001_consolidate_roles_profiles.sql`.
-- This migration will rely on the canonical definitions there. Keep policy and RLS changes here.

-- Profiles table is defined in `20251001_consolidate_roles_profiles.sql`.
-- Earlier versions created alternate `profiles` shapes; consolidated migration keeps the canonical schema.

-- `user_roles` mapping table is centralized in `20251001_consolidate_roles_profiles.sql`.

-- `get_user_role()` is defined in the consolidated migration `20251001_consolidate_roles_profiles.sql`.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    EXECUTE $sql$ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY$sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_roles') THEN
  EXECUTE $sql$ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY$sql$;
  END IF;
END$$;

-- Policies for profiles: users can SELECT their own profile, Admins can do everything, Supervisors can SELECT
DO $$
BEGIN
  -- SELECT policy: owners and Admins/Supervisors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_owner_admin_supervisor') THEN
    CREATE POLICY profiles_select_owner_admin_supervisor ON public.profiles FOR SELECT USING (
      (id = auth.uid()) OR (public.get_user_role() = 'admin') OR (public.get_user_role() = 'supervisor')
    );
  END IF;

  -- INSERT: allow service_role or Admin to insert, or allow auth to create their own profile when none exists (with check)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (
      (id = auth.uid()) OR (public.get_user_role() = 'admin')
    );
  END IF;

  -- UPDATE: owners and Admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_owner_admin') THEN
  CREATE POLICY profiles_update_owner_admin ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.get_user_role() = 'admin') WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');
  END IF;

  -- DELETE: owners and Admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_owner_admin') THEN
  CREATE POLICY profiles_delete_owner_admin ON public.profiles FOR DELETE USING (id = auth.uid() OR public.get_user_role() = 'admin');
  END IF;
END$$;

-- Trigger (profile creation) is managed by the consolidated migration `20251001_consolidate_roles_profiles.sql`.

-- Backfill helper: insert a profile for any existing auth.users missing a profile; uses safe default 'Client'
-- Note: This is not executed automatically; run manually in staging/production when ready
-- INSERT INTO public.profiles (user_id, user_role)
-- SELECT u.id, 'Client' FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE p.user_id IS NULL;

COMMIT;

-- Additional RLS examples for common user-owned tables in this project
BEGIN;

-- therapist_licenses: owners (therapist_id) + Admin/Supervisor can select/update/delete
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='therapist_licenses') THEN
  EXECUTE $sql$ALTER TABLE public.therapist_licenses ENABLE ROW LEVEL SECURITY$sql$;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='therapist_licenses' AND policyname='licenses_select_owner_admin_supervisor') THEN
  EXECUTE $sql$CREATE POLICY licenses_select_owner_admin_supervisor ON public.therapist_licenses FOR SELECT USING ((therapist_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin') OR (public.get_user_role() = 'supervisor'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='therapist_licenses' AND policyname='licenses_insert_owner') THEN
  EXECUTE $sql$CREATE POLICY licenses_insert_owner ON public.therapist_licenses FOR INSERT WITH CHECK ((therapist_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='therapist_licenses' AND policyname='licenses_update_owner_admin') THEN
  EXECUTE $sql$CREATE POLICY licenses_update_owner_admin ON public.therapist_licenses FOR UPDATE USING (therapist_id::text = auth.uid()::text OR public.get_user_role() = 'admin') WITH CHECK (therapist_id::text = auth.uid()::text OR public.get_user_role() = 'admin')$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='therapist_licenses' AND policyname='licenses_delete_owner_admin') THEN
  EXECUTE $sql$CREATE POLICY licenses_delete_owner_admin ON public.therapist_licenses FOR DELETE USING (therapist_id::text = auth.uid()::text OR public.get_user_role() = 'admin')$sql$;
    END IF;
  END IF;
END$$;

-- ce_completions: owners (therapist_id) + Admin can manage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='ce_completions') THEN
  EXECUTE $sql$ALTER TABLE public.ce_completions ENABLE ROW LEVEL SECURITY$sql$;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ce_completions' AND policyname='ce_select_owner_admin') THEN
  EXECUTE $sql$CREATE POLICY ce_select_owner_admin ON public.ce_completions FOR SELECT USING ((therapist_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ce_completions' AND policyname='ce_insert_owner') THEN
  EXECUTE $sql$CREATE POLICY ce_insert_owner ON public.ce_completions FOR INSERT WITH CHECK ((therapist_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ce_completions' AND policyname='ce_update_owner_admin') THEN
  EXECUTE $sql$CREATE POLICY ce_update_owner_admin ON public.ce_completions FOR UPDATE USING (therapist_id::text = auth.uid()::text OR public.get_user_role() = 'admin') WITH CHECK (therapist_id::text = auth.uid()::text OR public.get_user_role() = 'admin')$sql$;
    END IF;
  END IF;
END$$;

-- messages: sender/recipient access + Admin access for moderation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='messages') THEN
  EXECUTE $sql$ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY$sql$;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select_participant_admin') THEN
  EXECUTE $sql$CREATE POLICY messages_select_participant_admin ON public.messages FOR SELECT USING ((sender_id::text = auth.uid()::text) OR (recipient_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_insert_participant') THEN
  EXECUTE $sql$CREATE POLICY messages_insert_participant ON public.messages FOR INSERT WITH CHECK ((sender_id::text = auth.uid()::text) OR (recipient_id::text = auth.uid()::text) OR (public.get_user_role() = 'admin'))$sql$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_delete_owner_admin') THEN
  EXECUTE $sql$CREATE POLICY messages_delete_owner_admin ON public.messages FOR DELETE USING (sender_id::text = auth.uid()::text OR public.get_user_role() = 'admin')$sql$;
    END IF;
  END IF;
END$$;

COMMIT;
