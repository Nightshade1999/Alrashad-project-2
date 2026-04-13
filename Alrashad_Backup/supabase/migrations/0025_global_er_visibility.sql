-- ============================================================
-- Migration 0025: Global ER Visibility (Simplified)
-- Allows all doctors to see and document for any patient in ER
-- ============================================================

-- 1. Patients: Allow SELECT if is_in_er is true, regardless of ward
DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;
CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  is_in_er = true
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = (SELECT auth.uid()) 
    AND (viewer.can_see_ward_patients = true OR viewer.role = 'admin')
    AND viewer.ward_name = patients.ward_name 
  )
);

-- 2. Visits: Allow access if patient is in ER
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
CREATE POLICY "Users can only access visits for their patients"
ON public.visits FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = visits.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      p.is_in_er = true
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);

-- 3. Investigations: Allow access if patient is in ER
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
CREATE POLICY "Users can only access investigations for their patients"
ON public.investigations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = investigations.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      p.is_in_er = true
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);
