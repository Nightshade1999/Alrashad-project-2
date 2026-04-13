-- ============================================================
-- Migration 0032: Global Signature Visibility
-- Allows all doctors to see each other's professional names 
-- so signatures appear correctly across the whole system.
-- ============================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;

-- 1. SELECT: Global visibility for all authenticated doctors
CREATE POLICY "Global profile visibility"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT/UPDATE: Restrict to the account owner only
CREATE POLICY "Users can manage their own data"
ON public.user_profiles FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
