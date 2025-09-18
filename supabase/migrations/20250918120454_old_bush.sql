-- Fix infinite recursion in profiles RLS policies
-- This migration removes problematic recursive policies and replaces them with safe ones

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "Therapists can read assigned clients" ON profiles;
DROP POLICY IF EXISTS "Therapists can create client profiles" ON profiles;
DROP POLICY IF EXISTS "Supervisors can read therapist profiles" ON profiles;

-- Create safe, non-recursive RLS policies for profiles table
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow therapists to read their assigned clients (safe join)
CREATE POLICY "therapists_read_assigned_clients" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM therapist_client_relations tcr
      WHERE tcr.therapist_id = auth.uid()
      AND tcr.client_id = profiles.id
    )
  );

-- Allow therapists to create client profiles they will be assigned to
CREATE POLICY "therapists_create_clients" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    role = 'client' 
    AND created_by_therapist = auth.uid()
  );

-- Allow supervisors to read therapist and client profiles (no recursion)
CREATE POLICY "supervisors_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'role') = 'supervisor'
    AND role IN ('therapist', 'client')
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;