/*
  production old — complementary patch to production new
  - Adds missing helpful indexes
  - Adds RLS policies not present in the new file (worksheets, exercises, progress, vip_offers, profiles INSERT)
  - Adds an updated_at trigger for appointments (new file didn’t add it)
  - Adds a unique index on the materialized view to support future concurrent refresh
  - Adds the 'assessment_files' storage bucket only (no conflicting policies)
*/

-- ============================================================================
-- MISSING/HELPFUL INDEXES (not created by production new)
-- ============================================================================

-- For due-date driven assessment queues
CREATE INDEX IF NOT EXISTS idx_assessment_instances_due_date
  ON public.assessment_instances(due_date);

-- Speeds up fetching answers by instance
CREATE INDEX IF NOT EXISTS idx_assessment_responses_instance
  ON public.assessment_responses(instance_id);

-- Support CONCURRENT REFRESH later (created once; no trigger here)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_instance_latest_score_instance_id
  ON public.assessment_instance_latest_score(instance_id);

-- ============================================================================
-- TRIGGERS MISSED IN NEW
-- ============================================================================

-- New file defines public.update_updated_at_column(), but didn’t add for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLICIES THAT AREN’T IN THE NEW FILE (kept complementary)
-- ============================================================================

-- PROFILES: allow therapists to create client profiles
DROP POLICY IF EXISTS "Therapists can create client profiles" ON public.profiles;
CREATE POLICY "Therapists can create client profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client'
    AND created_by_therapist = (SELECT auth.uid())
  );

-- CBT WORKSHEETS
DROP POLICY IF EXISTS "Therapists can manage CBT worksheets" ON public.cbt_worksheets;
CREATE POLICY "Therapists can manage CBT worksheets"
  ON public.cbt_worksheets
  FOR ALL
  TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read their worksheets" ON public.cbt_worksheets;
CREATE POLICY "Clients can read their worksheets"
  ON public.cbt_worksheets
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can update their worksheet responses" ON public.cbt_worksheets;
CREATE POLICY "Clients can update their worksheet responses"
  ON public.cbt_worksheets
  FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- THERAPEUTIC EXERCISES
DROP POLICY IF EXISTS "Therapists can manage therapeutic exercises" ON public.therapeutic_exercises;
CREATE POLICY "Therapists can manage therapeutic exercises"
  ON public.therapeutic_exercises
  FOR ALL
  TO authenticated
  USING (therapist_id = (SELECT auth.uid()))
  WITH CHECK (therapist_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can read their exercises" ON public.therapeutic_exercises;
CREATE POLICY "Clients can read their exercises"
  ON public.therapeutic_exercises
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Clients can update exercise progress" ON public.therapeutic_exercises;
CREATE POLICY "Clients can update exercise progress"
  ON public.therapeutic_exercises
  FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- PROGRESS TRACKING
DROP POLICY IF EXISTS "Therapists can read client progress" ON public.progress_tracking;
CREATE POLICY "Therapists can read client progress"
  ON public.progress_tracking
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT tcr.client_id
      FROM public.therapist_client_relations tcr
      WHERE tcr.therapist_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can read their own progress" ON public.progress_tracking;
CREATE POLICY "Clients can read their own progress"
  ON public.progress_tracking
  FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can insert progress data" ON public.progress_tracking;
CREATE POLICY "System can insert progress data"
  ON public.progress_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- VIP OFFERS (none defined in new)
DROP POLICY IF EXISTS "Active VIP offers are readable by therapists" ON public.vip_offers;
CREATE POLICY "Active VIP offers are readable by therapists"
  ON public.vip_offers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'therapist'
  );

-- ============================================================================
-- STORAGE BUCKET COMPLEMENT (new created others; keep assessment_files)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment_files', 'assessment_files', false)
ON CONFLICT (id) DO NOTHING;

