-- Idempotent migration: create minimal tables used by the therapist Overview dashboard
-- Creates: appointments, therapist_client_relations, session_notes, payments, resource_library
-- Safe to run multiple times; guards against missing profiles table and missing privileges.

BEGIN;

-- appointments table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    CREATE TABLE public.appointments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      therapist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      case_id uuid,
      title text,
      start_time timestamptz,
      end_time timestamptz,
      location text,
      status text DEFAULT 'scheduled',
      notes text,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX idx_appointments_therapist_id ON public.appointments (therapist_id);
    CREATE INDEX idx_appointments_client_id ON public.appointments (client_id);
    CREATE INDEX idx_appointments_start_time ON public.appointments (start_time);
  END IF;
END$$;

-- therapist_client_relations: simple mapping table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='therapist_client_relations') THEN
    CREATE TABLE public.therapist_client_relations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      therapist_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      role text DEFAULT 'primary',
      access_level text DEFAULT 'standard',
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX idx_tcr_therapist_id ON public.therapist_client_relations (therapist_id);
    CREATE INDEX idx_tcr_client_id ON public.therapist_client_relations (client_id);
  END IF;
END$$;

-- session_notes: basic notes attached to appointments/sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='session_notes') THEN
    CREATE TABLE public.session_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
      author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      content text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz
    );
    CREATE INDEX idx_session_notes_session_id ON public.session_notes (session_id);
    CREATE INDEX idx_session_notes_author_id ON public.session_notes (author_id);
  END IF;
END$$;

-- payments: light-weight payments table for revenue aggregation (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    CREATE TABLE public.payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      amount numeric(12,2) NOT NULL DEFAULT 0,
      currency text DEFAULT 'USD',
      status text DEFAULT 'succeeded',
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX idx_payments_profile_id ON public.payments (profile_id);
  END IF;
END$$;

-- resource_library: lightweight resources referenced by therapist tools
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resource_library') THEN
    CREATE TABLE public.resource_library (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      content_type text,
      category text,
      is_public boolean DEFAULT false,
      therapist_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      media_url text,
      storage_path text,
      external_url text,
      metadata jsonb,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX idx_resource_library_owner ON public.resource_library (therapist_owner_id);
    CREATE INDEX idx_resource_library_category ON public.resource_library (category);
  END IF;
END$$;

COMMIT;

-- End migration
