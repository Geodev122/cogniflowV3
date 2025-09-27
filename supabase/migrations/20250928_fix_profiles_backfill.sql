BEGIN;

-- 1) Add user_id column if missing 
DO $$ BEGIN IF NOT EXISTS ( SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id' ) THEN ALTER TABLE public.profiles ADD COLUMN user_id uuid; END IF; END $$;

-- 2) Add user_role column if missing 
DO $$ BEGIN IF NOT EXISTS ( SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_role' ) THEN ALTER TABLE public.profiles ADD COLUMN user_role text; END IF; END $$;

-- 3) Copy alternate role columns into user_role where empty 
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN UPDATE public.profiles SET user_role = role WHERE (user_role IS NULL OR user_role = '') AND role IS NOT NULL; END IF; IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role_name') THEN UPDATE public.profiles SET user_role = role_name WHERE (user_role IS NULL OR user_role = '') AND role_name IS NOT NULL; END IF; END $$;

-- 4) Backfill user_id by matching email 
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN RAISE NOTICE 'Will attempt to match profiles by email against auth.users'; UPDATE public.profiles p SET user_id = u.id FROM auth.users u WHERE p.user_id IS NULL AND p.email IS NOT NULL AND lower(p.email) = lower(u.email); END IF; END $$;

-- 6) Create foreign key constraint if missing 
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey') THEN BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Could not add FK constraint profiles_user_id_fkey yet: %', SQLERRM; END; END IF; END $$;

-- 7) Create unique index on user_id if possible 
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_profiles_user_id') THEN IF (SELECT count() FROM (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL GROUP BY user_id HAVING count() > 1) t) = 0 THEN EXECUTE 'CREATE UNIQUE INDEX ux_profiles_user_id ON public.profiles(user_id)'; ELSE RAISE NOTICE 'Skipping unique index creation: duplicate user_id values exist'; END IF; END IF; END $$;

-- 8) Optionally set NOT NULL on user_id if there are no nulls 
DO $$ BEGIN IF (SELECT count(*) FROM public.profiles WHERE user_id IS NULL) = 0 THEN BEGIN ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL; EXCEPTION WHEN others THEN RAISE NOTICE 'Could not set user_id NOT NULL: %', SQLERRM; END; ELSE RAISE NOTICE 'user_id contains NULLs; NOT NULL not set'; END IF; END $$;

COMMIT;

-- 9) Ensure get_user_role() exists and returns user_role from profiles -- Run this as a separate statement (outside DO blocks) 
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN 
-- signal to caller that function will be created after transaction 
RAISE NOTICE 'get_user_role missing; creating after commit'; END IF; END $$;

-- Create or replace the function outside of DO/transaction if desired 
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p.user_role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1; $$;