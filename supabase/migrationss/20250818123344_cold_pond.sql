/*
  # Fix Client Creation Policies

  1. Security Updates
    - Update profiles RLS policy to allow therapists to create client profiles
    - Ensure proper permissions for client creation workflow
    
  2. Policy Changes
    - Allow therapists to insert client profiles they create
    - Maintain security while enabling proper functionality
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "profiles_access" ON profiles;

-- Create comprehensive profiles policy that allows:
-- 1. Users to manage their own data
-- 2. Therapists to create client profiles
-- 3. Service role access for system operations
CREATE POLICY "profiles_comprehensive_access" ON profiles
FOR ALL TO authenticated
USING (
  -- Users can access their own data
  auth.uid() = id OR
  -- Therapists can access clients they created
  (role = 'client' AND created_by_therapist = auth.uid())
)
WITH CHECK (
  -- Users can update their own data
  auth.uid() = id OR
  -- Therapists can create client profiles
  (role = 'client' AND created_by_therapist = auth.uid() AND 
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'therapist'))
);

-- Ensure therapist_client_relations policy allows creation
DROP POLICY IF EXISTS "therapist_client_relations_access" ON therapist_client_relations;

CREATE POLICY "therapist_client_relations_comprehensive" ON therapist_client_relations
FOR ALL TO authenticated
USING (
  auth.uid() = therapist_id OR auth.uid() = client_id
)
WITH CHECK (
  auth.uid() = therapist_id AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'therapist')
);