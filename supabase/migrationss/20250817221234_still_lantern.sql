/*
  # Clinic Rental System

  1. New Tables
    - `clinic_listings`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key to profiles)
      - `name` (text, clinic name)
      - `description` (text, clinic description)
      - `location` (text, full address)
      - `ownership_type` (text, 'admin_owned' or 'externally_owned')
      - `contact_info` (jsonb, contact details)
      - `amenities` (text[], list of amenities)
      - `images` (text[], image URLs)
      - `is_active` (boolean, listing status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `rental_options`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinic_listings)
      - `duration_type` (text, 'hourly', 'daily', 'weekly', 'monthly', 'package')
      - `price` (numeric, rental price)
      - `currency` (text, default 'USD')
      - `description` (text, package description)
      - `min_duration` (integer, minimum rental duration)
      - `max_duration` (integer, maximum rental duration)
      - `is_available` (boolean, availability status)
      - `created_at` (timestamp)
    
    - `clinic_bookings`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinic_listings)
      - `therapist_id` (uuid, foreign key to profiles)
      - `rental_option_id` (uuid, foreign key to rental_options)
      - `start_date` (timestamp, booking start)
      - `end_date` (timestamp, booking end)
      - `duration_value` (integer, rental duration amount)
      - `total_price` (numeric, calculated total price)
      - `status` (text, 'pending', 'confirmed', 'rejected', 'cancelled')
      - `payment_receipt_url` (text, uploaded receipt)
      - `booking_notes` (text, additional notes)
      - `admin_notes` (text, admin comments)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for therapists to view listings and manage their bookings
    - Add policies for admins to manage all listings and bookings

  3. Indexes
    - Add indexes for efficient querying by location, ownership type, and availability
*/

-- Create clinic_listings table
CREATE TABLE IF NOT EXISTS clinic_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  location text NOT NULL,
  ownership_type text NOT NULL CHECK (ownership_type IN ('admin_owned', 'externally_owned')),
  contact_info jsonb DEFAULT '{}',
  amenities text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rental_options table
CREATE TABLE IF NOT EXISTS rental_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinic_listings(id) ON DELETE CASCADE,
  duration_type text NOT NULL CHECK (duration_type IN ('hourly', 'daily', 'weekly', 'monthly', 'package')),
  price numeric NOT NULL CHECK (price >= 0),
  currency text DEFAULT 'USD',
  description text,
  min_duration integer DEFAULT 1,
  max_duration integer,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create clinic_bookings table
CREATE TABLE IF NOT EXISTS clinic_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinic_listings(id) ON DELETE CASCADE,
  therapist_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rental_option_id uuid REFERENCES rental_options(id) ON DELETE CASCADE,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  duration_value integer NOT NULL CHECK (duration_value > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  payment_receipt_url text,
  booking_notes text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_listings
CREATE POLICY "clinic_listings_read_all"
  ON clinic_listings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "clinic_listings_admin_manage"
  ON clinic_listings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'therapist'
      AND profiles.id = clinic_listings.admin_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'therapist'
      AND profiles.id = clinic_listings.admin_id
    )
  );

-- RLS Policies for rental_options
CREATE POLICY "rental_options_read_all"
  ON rental_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_listings 
      WHERE clinic_listings.id = rental_options.clinic_id 
      AND clinic_listings.is_active = true
    )
  );

CREATE POLICY "rental_options_admin_manage"
  ON rental_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_listings cl
      JOIN profiles p ON p.id = auth.uid()
      WHERE cl.id = rental_options.clinic_id 
      AND p.role = 'therapist'
      AND cl.admin_id = p.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_listings cl
      JOIN profiles p ON p.id = auth.uid()
      WHERE cl.id = rental_options.clinic_id 
      AND p.role = 'therapist'
      AND cl.admin_id = p.id
    )
  );

-- RLS Policies for clinic_bookings
CREATE POLICY "clinic_bookings_therapist_own"
  ON clinic_bookings
  FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "clinic_bookings_admin_manage"
  ON clinic_bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_listings cl
      JOIN profiles p ON p.id = auth.uid()
      WHERE cl.id = clinic_bookings.clinic_id 
      AND p.role = 'therapist'
      AND cl.admin_id = p.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_listings cl
      JOIN profiles p ON p.id = auth.uid()
      WHERE cl.id = clinic_bookings.clinic_id 
      AND p.role = 'therapist'
      AND cl.admin_id = p.id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_listings_location ON clinic_listings(location);
CREATE INDEX IF NOT EXISTS idx_clinic_listings_ownership_type ON clinic_listings(ownership_type);
CREATE INDEX IF NOT EXISTS idx_clinic_listings_active ON clinic_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_rental_options_clinic_id ON rental_options(clinic_id);
CREATE INDEX IF NOT EXISTS idx_rental_options_duration_type ON rental_options(duration_type);
CREATE INDEX IF NOT EXISTS idx_clinic_bookings_therapist_id ON clinic_bookings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_clinic_bookings_clinic_id ON clinic_bookings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_bookings_start_date ON clinic_bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_clinic_bookings_status ON clinic_bookings(status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_clinic_listings_updated_at
  BEFORE UPDATE ON clinic_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_bookings_updated_at
  BEFORE UPDATE ON clinic_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO clinic_listings (admin_id, name, description, location, ownership_type, contact_info, amenities, images) VALUES
(
  (SELECT id FROM profiles WHERE role = 'therapist' LIMIT 1),
  'Downtown Wellness Center',
  'Modern therapy clinic in the heart of downtown with state-of-the-art facilities and calming environment.',
  '123 Main Street, Downtown, City, State 12345',
  'admin_owned',
  '{"phone": "+1-555-0123", "email": "info@downtownwellness.com"}',
  ARRAY['Private parking', 'Wheelchair accessible', 'Sound-proof rooms', 'Waiting area', 'WiFi', 'Coffee station'],
  ARRAY['https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg']
),
(
  (SELECT id FROM profiles WHERE role = 'therapist' LIMIT 1),
  'Serenity Therapy Suites',
  'Peaceful therapy spaces with natural lighting and comfortable furnishings for optimal therapeutic environment.',
  '456 Oak Avenue, Midtown, City, State 12345',
  'externally_owned',
  '{"whatsapp": "+1-555-0456", "owner_name": "Dr. Sarah Johnson"}',
  ARRAY['Natural lighting', 'Comfortable seating', 'Private entrance', 'Quiet environment', 'Air conditioning'],
  ARRAY['https://images.pexels.com/photos/4386465/pexels-photo-4386465.jpeg']
),
(
  (SELECT id FROM profiles WHERE role = 'therapist' LIMIT 1),
  'Mindful Spaces Clinic',
  'Zen-inspired therapy rooms designed for mindfulness and meditation practices.',
  '789 Pine Street, Uptown, City, State 12345',
  'admin_owned',
  '{"phone": "+1-555-0789", "email": "bookings@mindfulspaces.com"}',
  ARRAY['Meditation room', 'Garden view', 'Essential oils', 'Soft lighting', 'Comfortable cushions'],
  ARRAY['https://images.pexels.com/photos/4386464/pexels-photo-4386464.jpeg']
);

-- Insert rental options for the listings
INSERT INTO rental_options (clinic_id, duration_type, price, description, min_duration, max_duration) VALUES
-- Downtown Wellness Center options
((SELECT id FROM clinic_listings WHERE name = 'Downtown Wellness Center'), 'hourly', 75.00, 'Perfect for individual sessions', 1, 8),
((SELECT id FROM clinic_listings WHERE name = 'Downtown Wellness Center'), 'daily', 500.00, 'Full day rental for workshops or group sessions', 1, 7),
((SELECT id FROM clinic_listings WHERE name = 'Downtown Wellness Center'), 'weekly', 2800.00, 'Weekly rental with 20% discount', 1, 4),
((SELECT id FROM clinic_listings WHERE name = 'Downtown Wellness Center'), 'monthly', 10000.00, 'Monthly rental with 30% discount', 1, 12),

-- Serenity Therapy Suites options
((SELECT id FROM clinic_listings WHERE name = 'Serenity Therapy Suites'), 'hourly', 65.00, 'Hourly rate for therapy sessions', 1, 10),
((SELECT id FROM clinic_listings WHERE name = 'Serenity Therapy Suites'), 'daily', 450.00, 'Daily rate for intensive sessions', 1, 7),
((SELECT id FROM clinic_listings WHERE name = 'Serenity Therapy Suites'), 'package', 1200.00, '20-hour package deal', 20, 20),

-- Mindful Spaces Clinic options
((SELECT id FROM clinic_listings WHERE name = 'Mindful Spaces Clinic'), 'hourly', 80.00, 'Premium hourly rate', 1, 6),
((SELECT id FROM clinic_listings WHERE name = 'Mindful Spaces Clinic'), 'daily', 550.00, 'Full day with meditation room access', 1, 7),
((SELECT id FROM clinic_listings WHERE name = 'Mindful Spaces Clinic'), 'weekly', 3200.00, 'Weekly rental with garden access', 1, 4),
((SELECT id FROM clinic_listings WHERE name = 'Mindful Spaces Clinic'), 'package', 2000.00, 'Mindfulness retreat package (3 days)', 3, 3);