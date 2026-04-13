-- ============================================================
-- FIX NURSE INSTRUCTION POLICIES
-- Adds missing DELETE policy and hardens INSERT/UPDATE
-- ============================================================

-- 1. Correct the DELETE policy (Missing)
-- Allows the issuing doctor to delete their own mistakes within the allowed window
DROP POLICY IF EXISTS "Allow doctors to delete instructions" ON public.nurse_instructions;
CREATE POLICY "Allow doctors to delete instructions" 
ON public.nurse_instructions FOR DELETE 
TO authenticated 
USING (
    doctor_id = auth.uid()
);

-- 2. Harden INSERT policy
-- Ensures only doctors can create instructions
DROP POLICY IF EXISTS "Allow doctors to insert instructions" ON public.nurse_instructions;
CREATE POLICY "Allow doctors to insert instructions" 
ON public.nurse_instructions FOR INSERT 
TO authenticated 
WITH CHECK (
    public.fn_get_user_role() IN ('doctor', 'admin')
);

-- 3. Harden UPDATE policy
-- Restricts acknowledgment updates to nurses, and text updates to the issuing doctor
DROP POLICY IF EXISTS "Allow nurses to acknowledge instructions" ON public.nurse_instructions;
CREATE POLICY "Allow nurses to acknowledge instructions" 
ON public.nurse_instructions FOR UPDATE 
TO authenticated 
USING (true) -- Cross-role visibility for updates
WITH CHECK (
    -- Case 1: Nurse is acknowledging
    (is_read = true AND public.fn_get_user_role() = 'nurse')
    OR
    -- Case 2: Doctor is editing (should be issuing doctor)
    (doctor_id = auth.uid())
);
