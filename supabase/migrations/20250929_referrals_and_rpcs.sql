-- 20250929_referrals_and_rpcs.sql
-- Create referral_requests and referral_request_audits tables and supporting RPCs

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_requests') THEN
    CREATE TABLE public.referral_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      from_therapist uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      to_therapist uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      status text NOT NULL,
      note text,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX ON public.referral_requests (to_therapist);
    CREATE INDEX ON public.referral_requests (client_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_request_audits') THEN
    CREATE TABLE public.referral_request_audits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      referral_request_id uuid NOT NULL REFERENCES public.referral_requests(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor uuid,
      note text,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX ON public.referral_request_audits (referral_request_id);
  END IF;
END$$;

-- RPC: create_referral_request
CREATE OR REPLACE FUNCTION public.create_referral_request(
  p_from uuid,
  p_to uuid,
  p_client uuid,
  p_note text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS TABLE(id uuid, client_id uuid, from_therapist uuid, to_therapist uuid, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  caller uuid := NULL;
  out_row record;
BEGIN
  -- get caller from auth context when available
  BEGIN
    caller := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller := NULL;
  END;

  -- basic validation
  IF caller IS NOT NULL AND caller <> p_from THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- avoid duplicate pending referral for same client->to_therapist
  IF EXISTS (SELECT 1 FROM public.referral_requests WHERE client_id = p_client AND to_therapist = p_to AND status IN ('pending_therapist','pending_client')) THEN
    RETURN QUERY SELECT id, client_id, from_therapist, to_therapist, status, created_at FROM public.referral_requests WHERE client_id = p_client AND to_therapist = p_to AND status IN ('pending_therapist','pending_client') LIMIT 1;
    RETURN;
  END IF;

  INSERT INTO public.referral_requests (client_id, from_therapist, to_therapist, status, note, metadata)
  VALUES (p_client, p_from, p_to, 'pending_therapist', p_note, p_metadata)
  RETURNING id, client_id, from_therapist, to_therapist, status, created_at INTO out_row;

  INSERT INTO public.referral_request_audits (referral_request_id, action, actor, note)
  VALUES (out_row.id, 'created', p_from, p_note);

  RETURN QUERY SELECT out_row.id, out_row.client_id, out_row.from_therapist, out_row.to_therapist, out_row.status, out_row.created_at;
END;
$fn$;

-- RPC: therapist responds (accept/reject)
CREATE OR REPLACE FUNCTION public.respond_referral_by_therapist(p_request uuid, p_accept boolean)
RETURNS TABLE(id uuid, status text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  caller uuid := NULL;
  r record;
BEGIN
  BEGIN caller := auth.uid(); EXCEPTION WHEN OTHERS THEN caller := NULL; END;
  SELECT * INTO r FROM public.referral_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF caller IS NOT NULL AND caller <> r.to_therapist THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF p_accept THEN
    UPDATE public.referral_requests SET status = 'pending_client', updated_at = now() WHERE id = p_request RETURNING id, status, updated_at INTO r;
    INSERT INTO public.referral_request_audits (referral_request_id, action, actor) VALUES (p_request, 'accepted_by_therapist', caller);
  ELSE
    UPDATE public.referral_requests SET status = 'rejected', updated_at = now() WHERE id = p_request RETURNING id, status, updated_at INTO r;
    INSERT INTO public.referral_request_audits (referral_request_id, action, actor) VALUES (p_request, 'rejected_by_therapist', caller);
  END IF;

  RETURN QUERY SELECT r.id, r.status, r.updated_at;
END;
$fn$;

-- RPC: client responds (accept/reject) and on accept create therapist_client_relations row
CREATE OR REPLACE FUNCTION public.respond_referral_by_client(p_request uuid, p_accept boolean)
RETURNS TABLE(id uuid, status text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  caller uuid := NULL;
  r record;
BEGIN
  BEGIN caller := auth.uid(); EXCEPTION WHEN OTHERS THEN caller := NULL; END;
  SELECT * INTO r FROM public.referral_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF caller IS NOT NULL AND caller <> r.client_id THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF p_accept THEN
    -- mark completed
    UPDATE public.referral_requests SET status = 'completed', updated_at = now() WHERE id = p_request RETURNING id, status, updated_at INTO r;
    INSERT INTO public.referral_request_audits (referral_request_id, action, actor) VALUES (p_request, 'accepted_by_client', caller);

    -- create therapist_client_relations idempotently
    INSERT INTO public.therapist_client_relations (therapist_id, client_id, status, relationship_type, assigned_at)
    VALUES ( (SELECT to_therapist FROM public.referral_requests WHERE id = p_request), r.client_id, 'active', 'referred', now())
    ON CONFLICT (therapist_id, client_id) DO UPDATE SET status = EXCLUDED.status, relationship_type = EXCLUDED.relationship_type;
  ELSE
    UPDATE public.referral_requests SET status = 'rejected', updated_at = now() WHERE id = p_request RETURNING id, status, updated_at INTO r;
    INSERT INTO public.referral_request_audits (referral_request_id, action, actor) VALUES (p_request, 'rejected_by_client', caller);
  END IF;

  RETURN QUERY SELECT r.id, r.status, r.updated_at;
END;
$fn$;

-- grant execute to authenticated role (allow web clients to call these RPCs)
GRANT EXECUTE ON FUNCTION public.create_referral_request(uuid, uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_referral_by_therapist(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_referral_by_client(uuid, boolean) TO authenticated;
