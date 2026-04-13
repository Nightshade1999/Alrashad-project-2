-- Harden Patient Visibility: Case-Insensitive Ward Comparison
-- This migration updates the RLS policy to be tolerant of casing and whitespace differences.

DROP POLICY IF EXISTS "Patient_Hardened_Access" ON public.patients;

CREATE POLICY "Patient_Hardened_Access" ON public.patients 
FOR ALL TO authenticated USING (
    auth.uid() = user_id 
    OR public.fn_is_admin()
    OR EXISTS (
        SELECT 1 FROM public.fn_get_user_ward_info() i
        WHERE LOWER(REPLACE(i.ward_name, ' ', '')) = 'masterward'
        OR (
            LOWER(REPLACE(i.ward_name, ' ', '')) = LOWER(REPLACE(patients.ward_name, ' ', '')) 
            AND i.can_see_ward_patients = true
        )
        OR EXISTS (
             SELECT 1 FROM unnest(i.accessible_wards) aw 
             WHERE LOWER(REPLACE(aw, ' ', '')) = LOWER(REPLACE(patients.ward_name, ' ', ''))
        )
    )
);

-- Final Recovery: Ensure all clinical staff have the flag enabled
UPDATE public.user_profiles 
SET can_see_ward_patients = true 
WHERE role IN ('doctor', 'nurse', 'admin');
