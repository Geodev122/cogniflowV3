/*
  # Fix Schema Inconsistencies and Add Missing Tables

  This migration addresses all naming inconsistencies and missing tables identified in the audit:

  1. Add missing columns to existing tables
  2. Create missing tables for frontend functionality
  3. Ensure consistent naming conventions
  4. Add proper indexes and RLS policies

  ## Changes Made

  1. **Cases Table Updates**
     - Add `current_phase` column for treatment phase tracking
     - Add `diagnosis_codes` column for ICD/DSM codes
     - Add `treatment_plan` column for structured treatment plans
     - Add `formulation` column for case formulation text
     - Add `intake_data` column for intake form data

  2. **Profiles Table Updates**
     - Add `phone` column (alias for whatsapp_number for consistency)
     - Add `city` and `country` columns for location filtering

  3. **New Tables**
     - `client_requests` - For therapy termination/referral requests
     - `therapist_case_relations` - Multiple therapists per case
     - `supervision_flags` - Case supervision flagging
     - `supervision_threads` - Supervision discussion threads
     - `therapist_licenses` - License document tracking
     - `subscriptions` - Membership/billing tracking
     - `invoices` - Billing invoice tracking
     - `vip_offers` - VIP opportunities
     - `clinic_spaces` - Clinic rental spaces
     - `clinic_rental_requests` - Rental booking requests
     - `consents` - Client consent forms

  4. **Security**
     - Enable RLS on all new tables
     - Add appropriate policies for therapist/client access
*/

-- Add missing columns to cases table
DO $$
BEGIN
  -- Add current_phase column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'current_phase'
  ) THEN
    ALTER TABLE cases ADD COLUMN current_phase TEXT DEFAULT 'intake';
  END IF;

  -- Add diagnosis_codes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'diagnosis_codes'
  ) THEN
    ALTER TABLE cases ADD COLUMN diagnosis_codes TEXT[] DEFAULT '{}';
  END IF;

  -- Add formulation column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'formulation'
  ) THEN
    ALTER TABLE cases ADD COLUMN formulation TEXT;
  END IF;

  -- Add intake_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'intake_data'
  ) THEN
    ALTER TABLE cases ADD COLUMN intake_data JSONB DEFAULT '{}';
  END IF;

  -- Add data column for legacy compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'data'
  ) THEN
    ALTER TABLE cases ADD COLUMN data JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add phone column (alias for whatsapp_number)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
    -- Copy whatsapp_number to phone for consistency
    UPDATE profiles SET phone = whatsapp_number WHERE whatsapp_number IS NOT NULL;
  END IF;

  -- Add city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city TEXT;
  END IF;

  -- Add country column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country TEXT;
  END IF;
END $$;

-- Add missing columns to appointments table for consistency
DO $$
BEGIN
  -- Ensure appointment_date column exists (some code expects this)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'appointment_date'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_date TIMESTAMPTZ;
    -- Copy start_time to appointment_date for compatibility
    UPDATE appointments SET appointment_date = start_time WHERE start_time IS NOT NULL;
  END IF;

  -- Add location column for appointment location
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'location'
  ) THEN
    ALTER TABLE appointments ADD COLUMN location TEXT;
  END IF;
END $$;

-- Create client_requests table for therapy termination/referral requests
CREATE TABLE IF NOT EXISTS client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('end_therapy', 'referral', 'complaint', 'question')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_requests_client_manage"
  ON client_requests
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "client_requests_therapist_read"
  ON client_requests
  FOR SELECT
  TO authenticated
  USING (therapist_id = auth.uid());

-- Create therapist_case_relations table for multiple therapists per case
CREATE TABLE IF NOT EXISTS therapist_case_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborating' CHECK (role IN ('primary', 'collaborating', 'supervising', 'consulting')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, therapist_id)
);

ALTER TABLE therapist_case_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_case_relations_manage"
  ON therapist_case_relations
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Create supervision_flags table
CREATE TABLE IF NOT EXISTS supervision_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_note_id UUID REFERENCES session_notes(id) ON DELETE SET NULL,
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

ALTER TABLE supervision_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervision_flags_therapist_manage"
  ON supervision_flags
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Create supervision_threads table
CREATE TABLE IF NOT EXISTS supervision_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE supervision_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervision_threads_therapist_manage"
  ON supervision_threads
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Create therapist_licenses table
CREATE TABLE IF NOT EXISTS therapist_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_name TEXT NOT NULL,
  license_number TEXT,
  issuing_authority TEXT,
  country TEXT NOT NULL,
  state_province TEXT,
  file_path TEXT NOT NULL,
  expires_on DATE,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'expired')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE therapist_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_licenses_own_manage"
  ON therapist_licenses
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Create subscriptions table for membership tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'inactive')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own_access"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create invoices table for billing
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  number TEXT,
  amount_due INTEGER, -- cents
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('paid', 'open', 'void', 'uncollectible')),
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_own_access"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create vip_offers table
CREATE TABLE IF NOT EXISTS vip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_url TEXT,
  target_audience TEXT[] DEFAULT '{"therapist"}',
  expires_on DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vip_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_offers_read_all"
  ON vip_offers
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_on IS NULL OR expires_on >= CURRENT_DATE));

-- Create clinic_spaces table for clinic rentals
CREATE TABLE IF NOT EXISTS clinic_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  amenities TEXT[],
  pricing_hourly DECIMAL(10,2),
  pricing_daily DECIMAL(10,2),
  tailored_available BOOLEAN DEFAULT false,
  whatsapp TEXT,
  external_managed BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinic_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_spaces_read_active"
  ON clinic_spaces
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "clinic_spaces_admin_manage"
  ON clinic_spaces
  FOR ALL
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Create clinic_rental_requests table
CREATE TABLE IF NOT EXISTS clinic_rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES clinic_spaces(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('hourly', 'daily', 'tailored')),
  preferred_date DATE,
  duration_hours INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected', 'expired')),
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinic_rental_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_rental_requests_therapist_manage"
  ON clinic_rental_requests
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Create consents table for client consent forms
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  consent_type TEXT DEFAULT 'treatment' CHECK (consent_type IN ('treatment', 'privacy', 'communication', 'research')),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents_client_manage"
  ON consents
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "consents_therapist_read"
  ON consents
  FOR SELECT
  TO authenticated
  USING (therapist_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_current_phase ON cases(current_phase);
CREATE INDEX IF NOT EXISTS idx_cases_diagnosis_codes ON cases USING GIN(diagnosis_codes);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_requests_type ON client_requests(type);
CREATE INDEX IF NOT EXISTS idx_supervision_flags_status ON supervision_flags(status);
CREATE INDEX IF NOT EXISTS idx_supervision_threads_status ON supervision_threads(status);
CREATE INDEX IF NOT EXISTS idx_therapist_licenses_status ON therapist_licenses(status);
CREATE INDEX IF NOT EXISTS idx_therapist_licenses_expires ON therapist_licenses(expires_on);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinic_rental_requests_status ON clinic_rental_requests(status);

-- Update existing data to populate new fields
UPDATE profiles SET phone = whatsapp_number WHERE phone IS NULL AND whatsapp_number IS NOT NULL;

-- Set default current_phase for existing cases
UPDATE cases SET current_phase = 'active' WHERE current_phase IS NULL AND status = 'active';
UPDATE cases SET current_phase = 'closed' WHERE current_phase IS NULL AND status = 'closed';
UPDATE cases SET current_phase = 'intake' WHERE current_phase IS NULL;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_requests_updated_at') THEN
    CREATE TRIGGER update_client_requests_updated_at
      BEFORE UPDATE ON client_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_supervision_threads_updated_at') THEN
    CREATE TRIGGER update_supervision_threads_updated_at
      BEFORE UPDATE ON supervision_threads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_therapist_licenses_updated_at') THEN
    CREATE TRIGGER update_therapist_licenses_updated_at
      BEFORE UPDATE ON therapist_licenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_spaces_updated_at') THEN
    CREATE TRIGGER update_clinic_spaces_updated_at
      BEFORE UPDATE ON clinic_spaces
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_rental_requests_updated_at') THEN
    CREATE TRIGGER update_clinic_rental_requests_updated_at
      BEFORE UPDATE ON clinic_rental_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;