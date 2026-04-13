-- EMERGENCY RECOVERY: Restore patient wards for Ahmed.Safaa@alrashad.com
-- This script tries to recover the original ward name by looking at other clinical records (like nurse instructions)
-- and falls back to 'General Ward' for the rest.

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'Ahmed.Safaa@alrashad.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User Ahmed.Safaa@alrashad.com not found.';
        RETURN;
    END IF;

    -- 1. SMART RECOVERY: Recover from Nurse Instructions
    UPDATE public.patients p
    SET ward_name = ni.ward_name,
        updated_at = NOW()
    FROM public.nurse_instructions ni
    WHERE p.id = ni.patient_id
    AND p.ward_name = 'Master Ward'
    AND p.user_id = v_user_id;

    -- 2. FALLBACK: Move remaining Master Ward patients to 'General Ward' (or keep as is if preferred)
    -- We use 'Unassigned' or 'General Ward' so they show up in the Global Search clearly.
    UPDATE public.patients
    SET ward_name = 'General Ward',
        updated_at = NOW()
    WHERE ward_name = 'Master Ward'
    AND user_id = v_user_id;

    RAISE NOTICE 'Recovery complete for Ahmed.Safaa@alrashad.com';
END $$;
