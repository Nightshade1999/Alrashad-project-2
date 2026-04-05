-- ============================================================
-- Migration 0009: Per-User Collaboration & Schema Cleanup
-- 1. Add collaboration flag to user profiles
-- 2. Refactor RLS to check individual account permissions
-- 3. Cleanup of global settings (deprecated)
-- ============================================================

-- 1. Add individual permission flag to profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS can_see_ward_patients BOOLEAN DEFAULT false;

-- 2. Cleanup Global Settings (No longer used)
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- 3. Refactor RLS Policies for Patients
-- We now check if the viewing doctor has 'can_see_ward_patients' enabled in THEIR profile
-- or if they are the owner of the record.

DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;

CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner access (Always allowed)
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.can_see_ward_patients = true -- Viewer has collaboration enabled
    AND viewer.ward_name = patients.ward_name -- Viewer is in the same ward
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.role = 'admin' -- Admins should see everything in their ward? 
    -- User clarified earlier: same ward designated to account.
    AND viewer.ward_name = patients.ward_name
  )
);

-- 4. INSERT/UPDATE Policies (Preserved from 0008)
DROP POLICY IF EXISTS "Patient INSERT restriction" ON public.patients;
CREATE POLICY "Patient INSERT restriction"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND 
  ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patient UPDATE restriction" ON public.patients;
CREATE POLICY "Patient UPDATE restriction"
ON public.patients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
