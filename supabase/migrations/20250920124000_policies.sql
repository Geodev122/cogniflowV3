-- 2025-09-20 12:40:00 UTC
-- policies-only migration (draft)
-- Purpose: Drop existing policies and recreate a reviewed, idempotent set of RLS policies
-- NOTE: This migration is conservative. Do NOT run on production without applying in a staging environment first and reviewing SECURITY DEFINER functions.
-- It also creates required storage buckets idempotently via `storage.create_bucket` where appropriate.

-- SAFETY: Wrap risky operations and leave large/privileged functions commented for manual review.

BEGIN;

-- ==========================
-- STORAGE BUCKETS (idempotent)
-- ==========================
-- These buckets were referenced in the application code and older migrations.
-- If a bucket already exists the creation step will be skipped.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'resource_files') THEN
    PERFORM storage.create_bucket('resource_files', jsonb_build_object('public', false));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'licensing') THEN
    PERFORM storage.create_bucket('licensing', jsonb_build_object('public', false));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'assessment_files') THEN
    PERFORM storage.create_bucket('assessment_files', jsonb_build_object('public', false));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'documents') THEN
    PERFORM storage.create_bucket('documents', jsonb_build_object('public', false));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'public-resources') THEN
    PERFORM storage.create_bucket('public-resources', jsonb_build_object('public', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'supervision_attachments') THEN
    PERFORM storage.create_bucket('supervision_attachments', jsonb_build_object('public', false));
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'storage bucket creation: %', SQLERRM;
END $$;


-- ==========================
-- DROP and RECREATE POLICIES
-- Idempotent: DROP POLICY IF EXISTS ...; CREATE POLICY ...
-- Review each policy condition in staging before applying to production.
-- ==========================

-- profiles: users can read/update own profile; therapists/supervisors limited views
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Therapists can read assigned clients" ON public.profiles;
CREATE POLICY "Therapists can read assigned clients" ON public.profiles
  FOR SELECT TO authenticated
  USING ( EXISTS ( SELECT 1 FROM public.therapist_client_relations tcr WHERE tcr.therapist_id = (SELECT auth.uid()) AND tcr.client_id = public.profiles.id ) );

DROP POLICY IF EXISTS "Supervisors can read therapist profiles" ON public.profiles;
CREATE POLICY "Supervisors can read therapist profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ( (public.get_user_role()) = 'supervisor' AND role IN ('therapist', 'client') );


-- client_profiles: therapists manage, clients can read own
DROP POLICY IF EXISTS "Therapists can manage client profiles" ON public.client_profiles;
CREATE POLICY "Therapists can manage client profiles" ON public.client_profiles
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read own profile" ON public.client_profiles;
CREATE POLICY "Clients can read own profile" ON public.client_profiles
  FOR SELECT TO authenticated
  USING (client_id = (SELECT auth.uid()));


-- cases: therapists manage own cases; clients can read own; supervisors can read flagged
DROP POLICY IF EXISTS "Therapists can manage own cases" ON public.cases;
CREATE POLICY "Therapists can manage own cases" ON public.cases
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read own cases" ON public.cases;
CREATE POLICY "Clients can read own cases" ON public.cases
  FOR SELECT TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Supervisors can read flagged cases" ON public.cases;
CREATE POLICY "Supervisors can read flagged cases" ON public.cases
  FOR SELECT TO authenticated
  USING ( (public.get_user_role()) = 'supervisor' AND EXISTS ( SELECT 1 FROM public.supervision_flags sf WHERE sf.case_id = public.cases.id ) );


-- assessment_instances / assessment_responses / assessment_scores
DROP POLICY IF EXISTS "Therapists can manage assessment instances" ON public.assessment_instances;
CREATE POLICY "Therapists can manage assessment instances" ON public.assessment_instances
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can access assigned assessments" ON public.assessment_instances;
CREATE POLICY "Clients can access assigned assessments" ON public.assessment_instances
  FOR SELECT TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Assessment responses access" ON public.assessment_responses;
CREATE POLICY "Assessment responses access" ON public.assessment_responses
  FOR ALL TO authenticated
  USING ( EXISTS ( SELECT 1 FROM public.assessment_instances ai WHERE ai.id = public.assessment_responses.instance_id AND (ai.therapist_id = (SELECT auth.uid()) OR ai.client_id = (SELECT auth.uid())) ) );

DROP POLICY IF EXISTS "Assessment scores access" ON public.assessment_scores;
CREATE POLICY "Assessment scores access" ON public.assessment_scores
  FOR ALL TO authenticated
  USING ( EXISTS ( SELECT 1 FROM public.assessment_instances ai WHERE ai.id = public.assessment_scores.instance_id AND (ai.therapist_id = (SELECT auth.uid()) OR ai.client_id = (SELECT auth.uid())) ) );


-- appointments
DROP POLICY IF EXISTS "Appointment access" ON public.appointments;
CREATE POLICY "Appointment access" ON public.appointments
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()));


-- session notes & agenda: therapist-only write/read
DROP POLICY IF EXISTS "Session notes therapist access" ON public.session_notes;
CREATE POLICY "Session notes therapist access" ON public.session_notes
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Session agenda access" ON public.session_agenda;
CREATE POLICY "Session agenda access" ON public.session_agenda
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));


-- resource_library: public flag, owner and creator privileges
DROP POLICY IF EXISTS "Resource library access" ON public.resource_library;
CREATE POLICY "Resource library access" ON public.resource_library
  FOR SELECT TO authenticated
  USING ( is_public = true OR therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()) );

DROP POLICY IF EXISTS "Therapists can create resources" ON public.resource_library;
CREATE POLICY "Therapists can create resources" ON public.resource_library
  FOR INSERT TO authenticated
  WITH CHECK ( (public.get_user_role()) = 'therapist' );

DROP POLICY IF EXISTS "Therapists can update own resources" ON public.resource_library;
CREATE POLICY "Therapists can update own resources" ON public.resource_library
  FOR UPDATE TO authenticated
  USING (therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()))
  WITH CHECK (therapist_owner_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()));


-- storage.objects policies (example: public resource files; therapists upload & licensing docs)
-- Note: storage policies operate on the `storage.objects` table in schema `storage`.
DROP POLICY IF EXISTS "Public resource files" ON storage.objects;
CREATE POLICY "Public resource files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public-resources');

DROP POLICY IF EXISTS "Therapists can upload resources" ON storage.objects;
CREATE POLICY "Therapists can upload resources" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'resource_files' AND (public.get_user_role()) = 'therapist');

DROP POLICY IF EXISTS "Therapists can manage licensing docs" ON storage.objects;
CREATE POLICY "Therapists can manage licensing docs" ON storage.objects
  FOR ALL
  USING (bucket_id = 'licensing' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'licensing' AND auth.uid()::text = (storage.foldername(name))[1]);


-- communication logs / client requests / supervision flags: therapist/client rules
DROP POLICY IF EXISTS "Communication logs access" ON public.communication_logs;
CREATE POLICY "Communication logs access" ON public.communication_logs
  FOR ALL TO authenticated
  USING (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()) OR client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Client requests access" ON public.client_requests;
CREATE POLICY "Client requests access" ON public.client_requests
  FOR ALL TO authenticated
  USING (client_id = (SELECT auth.uid()) OR therapist_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()) OR therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Supervision flags access" ON public.supervision_flags;
CREATE POLICY "Supervision flags access" ON public.supervision_flags
  FOR ALL TO authenticated
  USING ( therapist_id = (SELECT auth.uid()) OR flagged_by = (SELECT auth.uid()) OR (public.get_user_role()) = 'supervisor' )
  WITH CHECK ( therapist_id = (SELECT auth.uid()) OR flagged_by = (SELECT auth.uid()) OR (public.get_user_role()) = 'supervisor' );


-- Audit/logging and other owner-scoped tables
DROP POLICY IF EXISTS "Audit logs access" ON public.audit_logs;
CREATE POLICY "Audit logs access" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ( user_id = (SELECT auth.uid()) OR (public.get_user_role()) IN ('supervisor', 'admin') );


-- ================
-- SECURITY DEFINER FUNCTIONS
-- ================
-- Many legacy migrations defined SECURITY DEFINER helper functions such as
-- `get_user_profile_safe(uuid)` used inside policy expressions. SECURITY DEFINER
-- functions must be reviewed carefully before being restored. Add them here only
-- after manual audit in staging.

-- Example placeholder (COMMENTED OUT):
-- -- CREATE OR REPLACE FUNCTION public.get_user_profile_safe(user_id uuid) RETURNS public.profiles
-- -- LANGUAGE sql SECURITY DEFINER VOLATILE AS $$
-- --   SELECT * FROM public.profiles WHERE id = user_id;
-- -- $$;


-- ==========================
-- EDGE FUNCTIONS: presence & deployment notes
-- ==========================
-- The repo contains the following Supabase Edge Functions (detected under `supabase/functions/`):
-- - accept-referral
-- - admin-payment-request
-- - ai_summarize
-- - request-referral
-- - submit-supervision
-- - support
-- - whish-callback
-- - whish-payment
--
-- These are not created via SQL. Deploy them with the Supabase CLI:
--   supabase functions deploy <function-name> --project-ref <PROJECT_REF>
-- See `supabase/functions/README.md` for examples and troubleshooting.


COMMIT;

-- End of migration draft
