-- ============================================================
-- Migration 0028: Global ER Access & Policy Repair (Fixed)
-- Corrects the column name back to 'ward_name' as per the schema
-- and ensures that while a patient is in the ER, ALL their 
-- historical records (Ward + ER) are visible to any doctor.
-- ============================================================

-- Fix Investigations Policy
DROP POLICY IF EXISTS "Global ER Investigations Access" ON public.investigations;
CREATE POLICY "Global ER Investigations Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  -- Allow access if the patient is CURRENTLY in ER
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND p.is_in_er = true
  )
  OR
  -- Original Ownership/Ward logic
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = investigations.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = investigations.patient_id)
  )
);

-- Fix Visits Policy
DROP POLICY IF EXISTS "Global ER Visits Access" ON public.visits;
CREATE POLICY "Global ER Visits Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  -- Allow access if the patient is CURRENTLY in ER
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND p.is_in_er = true
  )
  OR
  -- Original Ownership/Ward logic
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = visits.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = visits.patient_id)
  )
);
