-- 20250929_add_patient_code_rpc_and_immutability.sql
-- Create server-side deterministic patient code generation, immutability enforcement, and RPC to request/ensure a patient_code

BEGIN;

-- 1) Add patient_code column to profiles if missing
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS patient_code text;

-- 2) Ensure unique index on patient_code when not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'profiles_patient_code_idx'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_patient_code_idx ON public.profiles (patient_code) WHERE patient_code IS NOT NULL;
  END IF;
END$$;

-- 3) Function: deterministic patient code generator (server-side)
CREATE OR REPLACE FUNCTION public.generate_patient_code(p_uuid uuid)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  h bigint := 2166136261;
  i int;
  s text;
  src text := COALESCE(p_uuid::text, gen_random_uuid()::text);
BEGIN
  -- FNV-1a 32-bit style
  FOR i IN 1..char_length(src) LOOP
    h := (h # ascii(substring(src, i, 1)))::bigint;
    h := (h * 16777619) % 4294967296;
  END LOOP;
  s := upper(to_base36((h & 4294967295)::bigint));
  -- pad to 9 chars, prefix PT
  s := 'PT' || lpad(s, 9, '0');
  RETURN s;
END;
$$;

-- helper: to_base36
CREATE OR REPLACE FUNCTION public.to_base36(n bigint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  WITH RECURSIVE t(x, n) AS (
    SELECT '', $1::bigint
    UNION ALL
    SELECT (CASE WHEN x = '' THEN '' ELSE x END) || substr('0123456789abcdefghijklmnopqrstuvwxyz', (n % 36)::int + 1, 1), n/36
    FROM t WHERE n > 0
  ) SELECT coalesce((SELECT x FROM t ORDER BY n LIMIT 1), '0');
$$;

-- 4) RPC: ensure_patient_code(p_profile uuid) returns text
CREATE OR REPLACE FUNCTION public.ensure_patient_code(p_profile uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing text;
  code text;
BEGIN
  SELECT patient_code INTO existing FROM public.profiles WHERE id = p_profile;
  IF existing IS NOT NULL AND existing <> '' THEN
    RETURN existing;
  END IF;
  code := generate_patient_code(p_profile);
  -- try to update; on conflict, return the existing value
  LOOP
    BEGIN
      UPDATE public.profiles SET patient_code = code WHERE id = p_profile AND (patient_code IS NULL OR patient_code = '');
      IF FOUND THEN
        RETURN code;
      ELSE
        -- if update didn't run, fetch current value (maybe set by concurrent worker)
        SELECT patient_code INTO existing FROM public.profiles WHERE id = p_profile;
        IF existing IS NOT NULL AND existing <> '' THEN
          RETURN existing;
        END IF;
        -- try again with a fresh code (collision unlikely but defend)
        code := generate_patient_code(gen_random_uuid());
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- someone inserted the same patient code; generate another and retry
      code := generate_patient_code(gen_random_uuid());
    END;
  END LOOP;
END;
$$;

-- 5) Trigger to prevent patient_code updates (immutability) once set
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_patient_code_immutable_trg') THEN
    CREATE FUNCTION public.prevent_patient_code_update() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.patient_code IS NOT NULL AND OLD.patient_code <> '' AND (NEW.patient_code IS DISTINCT FROM OLD.patient_code) THEN
          RAISE EXCEPTION 'patient_code is immutable and cannot be changed';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $fn$;

    CREATE TRIGGER profiles_patient_code_immutable_trg
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_patient_code_update();
  END IF;
END$$;

COMMIT;
