-- Migration: Normalize profiles.role, backfill clients mirror, and harden view/RPC
-- Idempotent: safe to re-run. Run with service-role privileges.

BEGIN;

-- 0) Helper: ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Normalize existing role values: trim and lowercase
UPDATE public.profiles
SET role = lower(trim(role))
WHERE role IS NOT NULL AND role <> lower(trim(role));

-- 2) Set role = 'client' for rows with NULL role (these were observed in diagnostics)
UPDATE public.profiles
SET role = 'client'
WHERE role IS NULL;

-- 3) Set default and NOT NULL constraint for future inserts (idempotent)
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'client';

-- Only set NOT NULL if there are no NULLs
DO $$
DECLARE cnt bigint;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.profiles WHERE role IS NULL;
  IF cnt = 0 THEN
    BEGIN
      ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not set role NOT NULL: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipped setting role NOT NULL; % rows have NULL role', cnt;
  END IF;
END$$;

-- 4) Create/replace normalization function + trigger to keep roles normalized on insert/update
CREATE OR REPLACE FUNCTION public.normalize_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS NULL THEN
    NEW.role := 'client';
  ELSE
    NEW.role := lower(trim(NEW.role));
  END IF;
  RETURN NEW;
END;
$$;

-- drop existing trigger if present, then create
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE t.tgname = 'profiles_normalize_role_trg' AND c.relname = 'profiles') THEN
    EXECUTE 'DROP TRIGGER profiles_normalize_role_trg ON public.profiles';
  END IF;
  EXECUTE 'CREATE TRIGGER profiles_normalize_role_trg BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_role()';
END$$;

-- 5) Ensure clients mirror table exists (should be present from earlier migration)
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

-- 6) Backfill clients rows from profiles where role = 'client' and missing in clients
-- Use dynamic SQL to copy only columns that exist in profiles to avoid errors when optional columns are missing
DO $$
DECLARE
  common_cols text;
  insert_cols text;
  select_cols text;
BEGIN
  -- find columns present in clients (excluding id) that also exist in profiles
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position) INTO common_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'clients' AND c.column_name <> 'id'
    AND c.column_name NOT IN ('created_at','updated_at')
    AND EXISTS(
      SELECT 1 FROM information_schema.columns p
      WHERE p.table_schema = 'public' AND p.table_name = 'profiles' AND p.column_name = c.column_name
    );

  IF common_cols IS NULL THEN
    -- no common columns to copy; insert only id and timestamps
    INSERT INTO public.clients (id, created_at, updated_at)
    SELECT p.id, COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
    FROM public.profiles p
    WHERE lower(trim(coalesce(p.role,''))) = 'client'
      AND p.id NOT IN (SELECT id FROM public.clients);
  ELSE
    insert_cols := common_cols || ', created_at, updated_at';
    select_cols := common_cols || ', COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())';

    -- use a different dollar-quote tag to avoid nesting conflict with the surrounding DO $$ block
    EXECUTE format($ins$INSERT INTO public.clients (id, %s) SELECT p.id, %s FROM public.profiles p WHERE lower(trim(coalesce(p.role,''))) = %L AND p.id NOT IN (SELECT id FROM public.clients);$ins$, insert_cols, select_cols, 'client');
  END IF;
END$$;

-- 7) Ensure clients_profile_fk exists and there are no orphans (idempotent and safe)
DO $$
DECLARE
  orphan_count bigint;
BEGIN
  IF (SELECT to_regclass('public.clients')) IS NULL THEN
    RAISE NOTICE 'public.clients missing, skipping FK add';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_profile_fk') THEN
    RAISE NOTICE 'clients_profile_fk already exists';
    RETURN;
  END IF;
  SELECT COUNT(*) INTO orphan_count FROM public.clients c WHERE c.id IS NOT NULL AND c.id NOT IN (SELECT id FROM public.profiles);
  IF orphan_count = 0 THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added clients_profile_fk';
  ELSE
    RAISE NOTICE 'Skipped adding clients_profile_fk; % orphan rows found', orphan_count;
  END IF;
END$$;

-- 8) Replace view to be resilient to role casing/whitespace
CREATE OR REPLACE VIEW public.client_public_profiles AS
SELECT id, first_name, last_name, city, country, created_at
FROM public.profiles
WHERE lower(trim(coalesce(role,''))) = 'client';

-- 9) Replace public.get_clients_public() to use the view (idempotent)
CREATE OR REPLACE FUNCTION public.get_clients_public()
RETURNS TABLE(id uuid, first_name text, last_name text, city text, country text, created_at timestamptz) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, first_name, last_name, city, country, created_at FROM public.client_public_profiles ORDER BY created_at DESC;
$$;

-- 10) Ensure grants for authenticated role (adjust as needed by your access model)
GRANT SELECT ON public.client_public_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_public() TO authenticated;

-- 11) Add index on normalized role for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role_normalized ON public.profiles (lower(trim(coalesce(role,''))));

COMMIT;

-- End migration
