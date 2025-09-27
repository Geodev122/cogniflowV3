-- Ensure commonly expected profile columns exist: email, first_name, last_name
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_name') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_name') THEN
    ALTER TABLE public.profiles ADD COLUMN last_name text;
  END IF;
END$$;

COMMIT;
