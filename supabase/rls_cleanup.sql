-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: RLS POLICY HARDENING & CLEANUP
-- This script implements strict ward-based isolation.
-- ============================================================

-- 1. CLEANUP: Remove Redundant/Permissive Policies
DROP POLICY IF EXISTS "Verified Clinician Access" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Update" ON public.patients;
DROP POLICY IF EXISTS "Owner Admin Delete" ON public.patients;
DROP POLICY IF EXISTS "Authenticated Insert" ON public.patients;
DROP POLICY IF EXISTS "Linked Patient Content Access" ON public.visits;
DROP POLICY IF EXISTS "Linked Patient Investigation Access" ON public.investigations;

-- 2. PATIENTS: Strict Ward Isolation
-- Note: We use a subquery to check the current user's profile ward.
CREATE POLICY "Ward Specific Select" ON public.patients FOR SELECT TO authenticated USING (
    ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
    OR 
    (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid()) = 'Master'
);

CREATE POLICY "Ward Specific Update" ON public.patients FOR UPDATE TO authenticated USING (
    ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
    OR 
    (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid()) = 'Master'
);

CREATE POLICY "Authenticated Insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin Delete Only" ON public.patients FOR DELETE TO authenticated USING (
    (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
);

-- 3. VISITS: Inherit Patient visibility
CREATE POLICY "Ward Specific Visits" ON public.visits FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = visits.patient_id
        AND (
            p.ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
            OR 
            (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid()) = 'Master'
        )
    )
);

-- 4. INVESTIGATIONS: Inherit Patient visibility
CREATE POLICY "Ward Specific Investigations" ON public.investigations FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = investigations.patient_id
        AND (
            p.ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
            OR 
            (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid()) = 'Master'
        )
    )
);

-- 5. REMINDERS: Tighten to Clinician/Master visibility
DROP POLICY IF EXISTS "Clinician Reminder Access" ON public.reminders;
CREATE POLICY "Ward Specific Reminders" ON public.reminders FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = reminders.patient_id
        AND (
            p.ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
            OR 
            (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid()) = 'Master'
        )
    )
);

-- ============================================================
-- END OF SCRIPT
-- ============================================================
