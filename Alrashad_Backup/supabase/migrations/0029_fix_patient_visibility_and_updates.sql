-- ============================================================
-- Migration 0029: Global ER Patient Visibility & Updates
-- Allows any authenticated doctor to view and manage 
-- patient status for current ER admissions.
-- ============================================================

-- 1. Patients: Global Select for any record marked as 'in er'
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;

CREATE POLICY "Users can manage their own patients"
ON public.patients FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Global ER Patient Visibility"
ON public.patients FOR SELECT
TO authenticated
USING (is_in_er = true);

-- 2. Patients: Global Update for ER status transitions
CREATE POLICY "Global ER Patient Status Update"
ON public.patients FOR UPDATE
TO authenticated
USING (is_in_er = true)
WITH CHECK (true); -- Allow moving back to ward (is_in_er = false)

-- Allow inserting if moved to ER? (Usually, owners insert, but let's be safe)
-- Patients are usually created in a ward, then moved.
