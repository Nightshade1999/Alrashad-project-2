-- ============================================================
-- Migration 0033: Shared Ward Access
-- Allows all doctors assigned to the same ward to manage
-- their ward's patients together.
-- ============================================================

-- 1. Redefine 'patients' table policies
DROP POLICY IF EXISTS "Unified Patient Select" ON public.patients;
DROP POLICY IF EXISTS "Unified Patient Update" ON public.patients;

-- Shared SELECT: Admin, Creator, ER, OR same Ward
CREATE POLICY "Shared Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND (up.role = 'admin' OR up.ward_name = patients.ward_name)
  )
);

-- Shared UPDATE: Admin, Creator, ER, OR same Ward
CREATE POLICY "Shared Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND (up.role = 'admin' OR up.ward_name = patients.ward_name)
  )
)
WITH CHECK (true);

-- 2. Redefine 'visits' table policies
DROP POLICY IF EXISTS "Unified Visit Access" ON public.visits;

CREATE POLICY "Shared Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.user_profiles up ON up.user_id = auth.uid()
    WHERE p.id = visits.patient_id
    AND (
      p.user_id = auth.uid() 
      OR 
      p.is_in_er = true 
      OR 
      up.role = 'admin' 
      OR 
      up.ward_name = p.ward_name
    )
  )
)
WITH CHECK (true);

-- 3. Redefine 'investigations' table policies
DROP POLICY IF EXISTS "Unified Investigation Access" ON public.investigations;

CREATE POLICY "Shared Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.user_profiles up ON up.user_id = auth.uid()
    WHERE p.id = investigations.patient_id
    AND (
      p.user_id = auth.uid() 
      OR 
      p.is_in_er = true 
      OR 
      up.role = 'admin' 
      OR 
      up.ward_name = p.ward_name
    )
  )
)
WITH CHECK (true);
