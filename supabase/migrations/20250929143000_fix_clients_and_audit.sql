-- Migration: Fix clients table, add audit table, and ensure RPCs/views are present
-- Safe / idempotent: will create objects if missing and only add FK constraints when no orphan rows exist.
-- Run with a privileged DB connection (service role) or via Supabase migration tooling.

BEGIN;

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create clients table (lightweight mirror for therapist-facing data) if missing
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY,
  first_name text,
  last_name text,
  email text,
  whatsapp_number text,
  city text,
  country text,
  referral_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- 2) Ensure expected mirror columns exist (non-destructive)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 3) Ensure profiles.updated_at exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 4) Create audit table for therapist-driven changes
CREATE TABLE IF NOT EXISTS public.therapist_client_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_therapist ON public.therapist_client_audits (therapist_id);
CREATE INDEX IF NOT EXISTS idx_audit_client ON public.therapist_client_audits (client_id);

-- 5) Conditionally add FK: clients.id -> profiles.id only if no orphan clients
DO $$
DECLARE
  orphan_count bigint;
BEGIN
  IF (SELECT to_regclass('public.clients')) IS NULL THEN
    RAISE NOTICE 'Table public.clients does not exist, skipping FK creation.';
    RETURN;
  END IF;

  -- Check if constraint already exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_profile_fk') THEN
    RAISE NOTICE 'Constraint clients_profile_fk already exists, skipping.';
    RETURN;
  END IF;

  -- Count orphan rows
  SELECT COUNT(*) INTO orphan_count FROM public.clients c WHERE c.id IS NOT NULL AND c.id NOT IN (SELECT id FROM public.profiles);

  IF orphan_count = 0 THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK clients_profile_fk on public.clients(id) -> public.profiles(id).';
  ELSE
    RAISE NOTICE 'Skipped adding FK clients_profile_fk: % orphan rows found in public.clients (clean up or backfill first).', orphan_count;
  END IF;
END$$;

-- 6) Conditionally add FK: cases.client_id -> profiles.id
DO $$
DECLARE
  exists_cases boolean := (SELECT to_regclass('public.cases') IS NOT NULL);
  orphan_count bigint;
BEGIN
  IF NOT exists_cases THEN
    RAISE NOTICE 'Table public.cases does not exist, skipping cases FK creation.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cases_client_fk') THEN
    RAISE NOTICE 'Constraint cases_client_fk already exists, skipping.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO orphan_count FROM public.cases cc WHERE cc.client_id IS NOT NULL AND cc.client_id NOT IN (SELECT id FROM public.profiles);

  IF orphan_count = 0 THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_client_fk FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK cases_client_fk on public.cases(client_id) -> public.profiles(id).';
  ELSE
    RAISE NOTICE 'Skipped adding FK cases_client_fk: % orphan rows found in public.cases (clean up first).', orphan_count;
  END IF;
END$$;

-- 7) Ensure therapist_client_relations FKs exist (therapist_id, client_id -> profiles.id)
DO $$
DECLARE
  exists_tcr boolean := (SELECT to_regclass('public.therapist_client_relations') IS NOT NULL);
BEGIN
  IF NOT exists_tcr THEN
    RAISE NOTICE 'Table public.therapist_client_relations does not exist, skipping FK creation.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tcr_therapist_fk') THEN
    ALTER TABLE public.therapist_client_relations
      ADD CONSTRAINT tcr_therapist_fk FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK tcr_therapist_fk.';
  ELSE
    RAISE NOTICE 'Constraint tcr_therapist_fk already exists.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tcr_client_fk') THEN
    ALTER TABLE public.therapist_client_relations
      ADD CONSTRAINT tcr_client_fk FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK tcr_client_fk.';
  ELSE
    RAISE NOTICE 'Constraint tcr_client_fk already exists.';
  END IF;

  -- Ensure helpful indexes exist
  CREATE INDEX IF NOT EXISTS idx_tcr_therapist_id ON public.therapist_client_relations (therapist_id);
  CREATE INDEX IF NOT EXISTS idx_tcr_client_id ON public.therapist_client_relations (client_id);
END$$;

-- 8) Replace patch_client_for_therapist RPC to include audit logging (idempotent)
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
      referral_source = COALESCE(NULLIF(_referral, ''), referral_source),
      updated_at = now()
    WHERE id = p_client;

    -- Append audit record
    INSERT INTO public.therapist_client_audits (therapist_id, client_id, action, payload)
    VALUES (p_therapist, p_client, 'patch', p_payload);

  EXCEPTION WHEN others THEN
    RAISE;
  END;
END;
$$;

-- 9) Ensure public client view and RPC exist (idempotent)
CREATE OR REPLACE VIEW public.client_public_profiles AS
SELECT id, first_name, last_name, city, country, created_at
FROM public.profiles
WHERE role = 'client';

CREATE OR REPLACE FUNCTION public.get_client_private_for_therapist(
  p_therapist uuid,
  p_client uuid
)
RETURNS TABLE(id uuid, first_name text, last_name text, email text, phone text, whatsapp_number text, city text, country text) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.therapist_client_relations tcr WHERE tcr.therapist_id = p_therapist AND tcr.client_id = p_client) INTO _exists;
  IF NOT _exists THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY SELECT id, first_name, last_name, email, phone, whatsapp_number, city, country FROM public.profiles WHERE id = p_client;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clients_public()
RETURNS TABLE(id uuid, first_name text, last_name text, city text, country text, created_at timestamptz) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, first_name, last_name, city, country, created_at FROM public.client_public_profiles ORDER BY created_at DESC;
$$;

-- Grant execute/select to authenticated role (adjust to your policy model)
GRANT SELECT ON public.client_public_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_public() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_private_for_therapist(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patch_client_for_therapist(uuid, uuid, jsonb) TO authenticated;

COMMIT;
