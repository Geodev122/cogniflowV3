-- Migration: create RPC that enforces assignment acceptance before creating a case
-- Generated: 2025-09-20

BEGIN;

-- SECURITY DEFINER function: create a case only when the calling user is the accepted assignee
CREATE OR REPLACE FUNCTION public.create_case_for_client(
  p_client_id uuid,
  p_case_number text DEFAULT NULL,
  p_initial_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_case uuid;
  v_caller uuid := (SELECT auth.uid());
  v_assigned boolean;
BEGIN
  -- Ensure caller is authenticated
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Check assignments: caller must have an accepted assignment for the client
  SELECT EXISTS(
    SELECT 1 FROM public.assignments a
    WHERE a.client_id = p_client_id
      AND a.therapist_id = v_caller
      AND a.status = 'accepted'
  ) INTO v_assigned;

  IF NOT v_assigned THEN
    RAISE EXCEPTION 'assignment_not_accepted' USING ERRCODE = 'P0002';
  END IF;

  -- Insert case using caller as therapist
  INSERT INTO public.cases (client_id, therapist_id, case_number, intake_data, status)
  VALUES (p_client_id, v_caller, COALESCE(p_case_number, gen_random_uuid()::text), p_initial_payload, 'active')
  RETURNING id INTO v_new_case;

  RETURN v_new_case;
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.create_case_for_client(uuid, text, jsonb) TO authenticated;

COMMIT;

-- Note: This function uses SECURITY DEFINER and references `public.assignments` and `public.cases`.
-- Review privileges of the role that owns the migration before running in production.
