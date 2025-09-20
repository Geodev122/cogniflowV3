/* Archived: original content moved to supabase/migrations/archived/20250918011123_clientels_add_client.sql */

-- File archived on 2025-09-20. See archived copy for full content.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='idx_therapist_client_relations_therapist_id') THEN
        CREATE INDEX idx_therapist_client_relations_therapist_id ON public.therapist_client_relations (therapist_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='idx_therapist_client_relations_client_id') THEN
        CREATE INDEX idx_therapist_client_relations_client_id ON public.therapist_client_relations (client_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='idx_client_profiles_therapist_id') THEN
        CREATE INDEX idx_client_profiles_therapist_id ON public.client_profiles (therapist_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='idx_client_profiles_client_id') THEN
        CREATE INDEX idx_client_profiles_client_id ON public.client_profiles (client_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='idx_profiles_created_by_therapist') THEN
        CREATE INDEX idx_profiles_created_by_therapist ON public.profiles (created_by_therapist);
    END IF;
END$$;

-- 3. RLS policies
-- Ensure RLS enabled on relevant tables (these are already enabled in your DB; these statements are safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_client_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: allow therapists to insert client profiles they create
-- Policy: therapists can insert rows where role='client' and created_by_therapist = auth.uid()
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Therapist insert clients'
    ) THEN
        EXECUTE $policy$
        CREATE POLICY "Therapist insert clients" ON public.profiles
          FOR INSERT TO authenticated
          WITH CHECK ((role = 'client') AND (created_by_therapist = (SELECT auth.uid())));
        $policy$;
    END IF;
END$$;

-- Therapist can update password_set for their created clients (optional, prevents others altering)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Therapist update own clients'
    ) THEN
        EXECUTE $policy2$
        CREATE POLICY "Therapist update own clients" ON public.profiles
          FOR UPDATE TO authenticated
          USING ((created_by_therapist = (SELECT auth.uid())))
          WITH CHECK ((created_by_therapist = (SELECT auth.uid())));
        $policy2$;
    END IF;
END$$;

-- Therapist can SELECT client profiles (permissive select for listing All Clients)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Therapist select clients'
    ) THEN
        EXECUTE $policy3$
        CREATE POLICY "Therapist select clients" ON public.profiles
          FOR SELECT TO authenticated
          USING ( (role = 'client') AND (
              (created_by_therapist = (SELECT auth.uid())) OR
              (id IN (SELECT client_id FROM public.therapist_client_relations WHERE therapist_id = (SELECT auth.uid())))
          ) );
        $policy3$;
    END IF;
END$$;

-- therapist_client_relations: allow therapists to insert relations for their own therapist_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='therapist_client_relations' AND p.policyname='Therapist insert relations'
    ) THEN
        EXECUTE $policy4$
        CREATE POLICY "Therapist insert relations" ON public.therapist_client_relations
          FOR INSERT TO authenticated
          WITH CHECK (therapist_id = (SELECT auth.uid()));
        $policy4$;
    END IF;
END$$;

-- therapist_client_relations: allow therapists to select their relations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='therapist_client_relations' AND p.policyname='Therapist select relations'
    ) THEN
        EXECUTE $policy5$
        CREATE POLICY "Therapist select relations" ON public.therapist_client_relations
          FOR SELECT TO authenticated
          USING (therapist_id = (SELECT auth.uid()));
        $policy5$;
    END IF;
END$$;

-- client_profiles: optionally allow therapists to insert client_profiles for clients they manage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='client_profiles' AND p.policyname='Therapist insert client_profiles'
    ) THEN
        EXECUTE $policy6$
        CREATE POLICY "Therapist insert client_profiles" ON public.client_profiles
          FOR INSERT TO authenticated
          WITH CHECK (therapist_id = (SELECT auth.uid()));
        $policy6$;
    END IF;
END$$;

-- client_profiles: allow select by therapist for their clients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='client_profiles' AND p.policyname='Therapist select client_profiles'
    ) THEN
        EXECUTE $policy7$
        CREATE POLICY "Therapist select client_profiles" ON public.client_profiles
          FOR SELECT TO authenticated
          USING (therapist_id = (SELECT auth.uid()));
        $policy7$;
    END IF;
END$$;

COMMIT;

BEGIN;
WITH to_fix AS (
  SELECT p.id
  FROM public.profiles p
  WHERE p.created_by_therapist IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles t WHERE t.id = p.created_by_therapist
    )
)
UPDATE public.profiles p
SET created_by_therapist = NULL
FROM to_fix
WHERE p.id = to_fix.id;
COMMIT;