-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: EMERGENCY RLS REPAIR
-- This script restores full visibility by loosening restrictions.
-- ============================================================

-- 0. Helper Function for Permissions (Improves performance & reliability)
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_get_user_ward()
RETURNS TEXT AS $$
  SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. CLEANUP PREVIOUS ATTEMPTS
DROP POLICY IF EXISTS "Ward Specific Select" ON public.patients;
DROP POLICY IF EXISTS "Ward Specific Update" ON public.patients;
DROP POLICY IF EXISTS "Admin Delete Only" ON public.patients;
DROP POLICY IF EXISTS "Ward Specific Visits" ON public.visits;
DROP POLICY IF EXISTS "Ward Specific Investigations" ON public.investigations;
DROP POLICY IF EXISTS "Ward Specific Reminders" ON public.reminders;
DROP POLICY IF EXISTS "Verified Clinician Access" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Update" ON public.patients;
DROP POLICY IF EXISTS "Owner Admin Delete" ON public.patients;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.patients;

-- 2. PATIENTS: Robust Access Logic
-- RULE: Admins see everything. Clinicians see their ward or if they are in 'Master' workstation.
CREATE POLICY "Patients_Access_Policy" ON public.patients 
FOR ALL TO authenticated 
USING (
    public.fn_get_user_role() = 'admin'                    -- Admins can do everything
    OR ward_name = public.fn_get_user_ward()               -- Match ward exactly
    OR public.fn_get_user_ward() = 'Master'                -- 'Master' workstation sees all
    OR public.fn_get_user_ward() = 'Unassigned'            -- Fallback for unconfigured profiles
);

CREATE POLICY "Patients_Insert_Policy" ON public.patients 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- 3. VISITS: Inherit from Patients
CREATE POLICY "Visits_Access_Policy" ON public.visits
FOR ALL TO authenticated
USING (
    public.fn_get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id)
);

-- 4. INVESTIGATIONS: Inherit from Patients
CREATE POLICY "Investigations_Access_Policy" ON public.investigations
FOR ALL TO authenticated
USING (
    public.fn_get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id)
);

-- 5. REMINDERS: Inherit from Patients
CREATE POLICY "Reminders_Access_Policy" ON public.reminders
FOR ALL TO authenticated
USING (
    public.fn_get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id)
);

-- ============================================================
-- END OF REPAIR SCRIPT
-- ============================================================
