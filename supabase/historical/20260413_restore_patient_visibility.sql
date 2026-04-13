-- Recovery Migration: Restore ward-wide patient visibility for clinical roles
-- This fixes the issue where doctors/nurses could only see their own patients after a recent update.

UPDATE public.user_profiles 
SET can_see_ward_patients = true 
WHERE role IN ('doctor', 'nurse', 'admin') 
AND can_see_ward_patients = false;

-- Log the recovery action
COMMENT ON TABLE public.user_profiles IS 'Identity and visibility profiles. (Last Recovery: 2026-04-13 - Restored can_see_ward_patients for clinical staff)';
