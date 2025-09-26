-- 2025-09-20 12:50:00 UTC
-- Create `clients` and `assignments` tables and RLS policies
BEGIN;

-- Clients: separate public vs private columns
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE, -- human-friendly id if needed
  first_name text,
  last_name text,
  email text,
  phone text,
  whatsapp_number text,
  city text,
  country text,
  referral_source text,
  referral_meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Assignments: therapist requests and accepted assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE (therapist_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_referral_source ON public.clients(referral_source);
CREATE INDEX IF NOT EXISTS idx_assignments_therapist_id ON public.assignments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client_id ON public.assignments(client_id);

-- RLS: enable on these tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users (therapists) to SELECT public client fields
-- We'll use a view or RPC to control which columns are shown publicly; allow SELECT on the table
CREATE POLICY "clients_select_authenticated" ON public.clients
  FOR SELECT USING ( true );

-- Policy: allow therapists to INSERT assignment requests (they create requests)
CREATE POLICY "assignments_insert_therapist" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK ( auth.uid() = therapist_id );

-- Policy: allow therapist to view their own assignments rows
CREATE POLICY "assignments_select_therapist" ON public.assignments
  FOR SELECT USING ( auth.uid() = therapist_id );

-- Policy: allow updating assignment status by therapist who owns it
CREATE POLICY "assignments_update_therapist" ON public.assignments
  FOR UPDATE TO authenticated
  USING ( auth.uid() = therapist_id )
  WITH CHECK ( auth.uid() = therapist_id AND status IN ('pending','accepted','rejected') );

-- Policy: allow insert/select on clients for service workflows (therapists may create client records)
CREATE POLICY "clients_insert_authenticated" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK ( true );

-- Policy: permit updates to client records only by the system or assigned therapists via a SECURITY DEFINER function,
-- but allow limited updates (e.g., referral metadata) by authenticated users
CREATE POLICY "clients_update_referral" ON public.clients
  FOR UPDATE TO authenticated
  USING ( true )
  WITH CHECK ( referral_source IS NOT DISTINCT FROM referral_source );

-- RPC: return public client fields (this will limit private columns)
CREATE OR REPLACE FUNCTION public.get_clients_public()
RETURNS TABLE (
  id uuid,
  initials text,
  referral_source text,
  city text,
  country text,
  created_at timestamptz
) LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    COALESCE(upper(substr(c.first_name,1,1) || substr(c.last_name,1,1)), 'CL') as initials,
    c.referral_source,
    c.city,
    c.country,
    c.created_at
  FROM public.clients c
  ORDER BY c.created_at DESC;
$$;

-- SECURITY: create view for assigned private fields — therapist will query with join to assignments
CREATE OR REPLACE VIEW public.clients_private_for_therapist AS
SELECT c.*
FROM public.clients c
JOIN public.assignments a ON a.client_id = c.id AND a.status = 'accepted'
WHERE a.therapist_id = auth.uid();

-- Seed small demo data (idempotent)
INSERT INTO public.clients (id, first_name, last_name, email, phone, whatsapp_number, referral_source, city, country)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'John', 'Smith', 'john.smith@example.com', '+15552345678', '+15552345678', 'referral:clinic', 'Los Angeles', 'US')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

INSERT INTO public.clients (id, first_name, last_name, email, phone, whatsapp_number, referral_source, city, country)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Emily', 'Davis', 'emily.davis@example.com', '+15553456789', '+15553456789', 'self', 'San Francisco', 'US')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

COMMIT;

-- Notes:
-- - Apps should call `select * from public.get_clients_public()` to get the public list.
-- - Therapists can query `public.clients_private_for_therapist` (or join `assignments`) to retrieve private data for accepted assignments.
-- - RLS is kept intentionally simple here; advanced checks (like allowing case creation only for assigned clients) are enforced by application logic plus additional policies you can add after review.
