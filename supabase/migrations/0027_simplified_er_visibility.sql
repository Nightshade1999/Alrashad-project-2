-- ============================================================
-- Migration 0027: Simplified Cross-Ward ER Visibility
-- Replaces complex subqueries with direct 'is_er' checks
-- for visits and investigations to ensure high availability.
-- ============================================================

-- 1. Investigations: Global Read/Write for any record marked as ER
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
DROP POLICY IF EXISTS "Enable ER inserts for all" ON public.investigations;

CREATE POLICY "Global ER Investigations Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = investigations.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = investigations.patient_id)
  )
);

-- 2. Visits: Global Read/Write for any record marked as ER
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
DROP POLICY IF EXISTS "Enable ER inserts for visits" ON public.visits;

CREATE POLICY "Global ER Visits Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = visits.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = visits.patient_id)
  )
);

-- Ensure anyone can see patient metadata if in ER (already in 0025, but double checking)
-- We don't change the patients policy as it already relies on is_in_er = true.
