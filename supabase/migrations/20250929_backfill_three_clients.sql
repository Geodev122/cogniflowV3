-- 20250929_backfill_three_clients.sql
-- Inspect and backfill missing columns for three client profiles.
--
-- Usage: review the SELECT below first to confirm which 3 profiles will be affected,
-- then run the entire script in a safe environment (test/staging) and review notices.

-- 0) Inspection query: list candidate profiles and null/empty columns
-- Run this first to see data before applying changes.
-- SELECT id, first_name, last_name, email, phone, whatsapp_number, patient_code, referral_source, created_at
-- FROM public.profiles
-- WHERE role = 'client'
-- ORDER BY created_at
-- LIMIT 3;

BEGIN;

DO $$
DECLARE
  r RECORD;
  _id uuid;
BEGIN
  -- Iterate the three oldest (or earliest created) profiles with role='client'
  FOR r IN SELECT id FROM public.profiles WHERE role = 'client' ORDER BY created_at LIMIT 3 LOOP
    _id := r.id::uuid;
    RAISE NOTICE 'Backfilling profile %', _id;

    -- 1) Ensure role is set to 'client' if missing
    UPDATE public.profiles SET role = 'client' WHERE id = _id AND (role IS NULL OR role = '');

    -- 2) Ensure created_at exists
    UPDATE public.profiles SET created_at = COALESCE(created_at, now()) WHERE id = _id;

    -- 3) Normalize phone: use whatsapp_number when phone missing
    UPDATE public.profiles SET phone = COALESCE(phone, whatsapp_number) WHERE id = _id;

    -- 4) Set a safe default referral_source if missing
    UPDATE public.profiles SET referral_source = COALESCE(referral_source, 'migration:backfill:20250929') WHERE id = _id;

    -- 5) Ensure patient_code exists. Prefer server RPC if available, otherwise generate a deterministic fallback.
    BEGIN
      -- Call the server-side RPC; if not present this will raise undefined_function
      PERFORM public.ensure_patient_code(_id);
      RAISE NOTICE 'ensure_patient_code ran for %', _id;
    EXCEPTION WHEN undefined_function THEN
      -- Fallback: deterministic PT code based on md5 of UUID (9 hex chars -> base36-like). This is only used if the RPC is not deployed.
      UPDATE public.profiles SET patient_code = COALESCE(patient_code, ('PT' || upper(substring(md5(_id::text) from 1 for 9)))) WHERE id = _id;
      RAISE NOTICE 'Fallback patient_code set for %', _id;
    WHEN OTHERS THEN
      RAISE NOTICE 'ensure_patient_code error for %: %', _id, SQLERRM;
    END;

    -- 6) Upsert into clients mirror table if it exists. Only set missing fields to avoid clobbering.
    BEGIN
      INSERT INTO public.clients (id, first_name, last_name, email, whatsapp_number, patient_code, referral_source, created_at)
      SELECT id, first_name, last_name, email, whatsapp_number, patient_code, referral_source, created_at
      FROM public.profiles WHERE id = _id
      ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, public.clients.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.clients.last_name),
        email = COALESCE(EXCLUDED.email, public.clients.email),
        whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, public.clients.whatsapp_number),
        patient_code = COALESCE(public.clients.patient_code, EXCLUDED.patient_code),
        referral_source = COALESCE(public.clients.referral_source, EXCLUDED.referral_source),
        created_at = COALESCE(public.clients.created_at, EXCLUDED.created_at);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'clients mirror table not present, skipping upsert for %', _id;
    WHEN OTHERS THEN
      RAISE NOTICE 'clients upsert error for %: %', _id, SQLERRM;
    END;

  END LOOP;
END$$;

COMMIT;
