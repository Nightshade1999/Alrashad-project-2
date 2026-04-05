-- ============================================================
-- Migration 0013: Harden Patient Policies
-- Removes all legacy overlaps and implements clean, action-specific rules.
-- ============================================================

-- 1. Drop ALL existing policies for the patients table to avoid overlaps
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'patients' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patients', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 3. Consolidated SELECT Visibility
--    Grants access if:
--    A) User is the owner of the record
--    B) User is an administrator
--    C) User is in the same ward AND has the 'can_see_ward_patients' permission enabled
CREATE POLICY "Patient SELECT permission"
ON public.patients FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner access
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND (
      role = 'admin' -- Admin access override
      OR 
      (ward_name = patients.ward_name AND can_see_ward_patients = true) -- Same-ward collaboration
    )
  )
);

-- 4. Consolidated INSERT Restriction
--    A user can only create a patient for themselves.
CREATE POLICY "Patient INSERT permission"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 5. Consolidated UPDATE Restriction
--    Only the owner or an administrator can update the patient record.
CREATE POLICY "Patient UPDATE permission"
ON public.patients FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Consolidated DELETE Restriction
--    Only the owner or an administrator can delete the patient record.
CREATE POLICY "Patient DELETE permission"
ON public.patients FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
