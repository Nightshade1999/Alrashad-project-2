-- DIAGNOSTIC SCRIPT: Check patient distribution and user accounts
-- Run this in Supabase SQL Editor to see why the recovery isn't matching.

SELECT 
    p.user_id,
    u.email,
    p.ward_name,
    COUNT(*) as patient_count
FROM public.patients p
LEFT JOIN auth.users u ON p.user_id = u.id
GROUP BY 1, 2, 3
ORDER BY 4 DESC;

-- Check if the specific email exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email ILIKE 'Ahmed.Safaa@alrashad.com';
