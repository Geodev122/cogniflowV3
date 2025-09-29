-- Migration: Add RPC to patch client for therapist and example RLS policies
-- Run this with a privileged role (service role) or apply via supabase migration tooling.

BEGIN;

-- 1) Create RPC that updates profiles and clients atomically after verifying relation
CREATE OR REPLACE FUNCTION public.patch_client_for_therapist(
  p_therapist uuid,
  p_client uuid,
  p_payload jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _exists boolean;
  _first_name text;
  _last_name text;
  _email text;
  _phone text;
  _whatsapp text;
  _city text;
  _country text;
  _referral text;
BEGIN
  -- Verify the therapist-client relation exists
  SELECT EXISTS(
    SELECT 1 FROM public.therapist_client_relations tcr
    WHERE tcr.therapist_id = p_therapist AND tcr.client_id = p_client
  ) INTO _exists;

  IF NOT _exists THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Extract expected fields safely from payload
  _first_name := (p_payload->>'first_name');
  _last_name := (p_payload->>'last_name');
  _email := (p_payload->>'email');
  _phone := (p_payload->>'phone');
  _whatsapp := (p_payload->>'whatsapp_number');
  _city := (p_payload->>'city');
  _country := (p_payload->>'country');
  _referral := (p_payload->>'referral_source');

  -- Transactional updates
  BEGIN
    UPDATE public.profiles
    SET
      first_name = COALESCE(NULLIF(_first_name, ''), first_name),
      last_name = COALESCE(NULLIF(_last_name, ''), last_name),
      email = COALESCE(NULLIF(lower(_email), ''), email),
      phone = COALESCE(NULLIF(_phone, ''), phone),
      whatsapp_number = COALESCE(NULLIF(_whatsapp, ''), whatsapp_number),
      city = COALESCE(NULLIF(_city, ''), city),
      country = COALESCE(NULLIF(_country, ''), country),
      referral_source = COALESCE(NULLIF(_referral, ''), referral_source),
      updated_at = now()
    WHERE id = p_client;

    -- Mirror to clients table when present
    UPDATE public.clients
    SET
      first_name = COALESCE(NULLIF(_first_name, ''), first_name),
      last_name = COALESCE(NULLIF(_last_name, ''), last_name),
      email = COALESCE(NULLIF(lower(_email), ''), email),
      whatsapp_number = COALESCE(NULLIF(_whatsapp, ''), whatsapp_number),
      city = COALESCE(NULLIF(_city, ''), city),
      country = COALESCE(NULLIF(_country, ''), country),
      referral_source = COALESCE(NULLIF(_referral, ''), referral_source)
    WHERE id = p_client;

  EXCEPTION WHEN others THEN
    RAISE;
  END;
END;
$$;

-- 2) Example RLS policy: prevent anonymous updates unless through RPC
-- This assumes you have RLS enabled. The RPC is SECURITY DEFINER so it bypasses RLS when called as a role with privileges.

-- Ensure policies exist for profiles to restrict direct updates (example):
-- Allow owners to update their profiles
-- CREATE POLICY "profiles_update_owner" ON public.profiles
--   FOR UPDATE
--   USING (auth.uid() = id);

-- Disallow direct therapist updates by default; prefer RPC above. If you want therapists to update via anon
-- client (not recommended), create a policy like the following (carefully test):
-- CREATE POLICY "therapist_update_clients" ON public.profiles
--   FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.therapist_client_relations tcr
--       WHERE tcr.client_id = profiles.id AND tcr.therapist_id = auth.uid()
--     )
--   );

COMMIT;
