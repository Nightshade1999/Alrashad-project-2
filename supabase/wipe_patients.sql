-- ============================================================
-- AL RASHAD: COMPLETE PATIENT DATA WIPE (CASCADE)
-- CRITICAL: This will delete ALL patients, visits, and labs.
-- ============================================================

-- Disable RLS temporarily for the cleanup if needed (though admin skips it usually)
-- Truncate patients with CASCADE to wipe all related visits, investigations, and reminders
BEGIN;

TRUNCATE TABLE public.patients RESTART IDENTITY CASCADE;

-- Optional: Reset users to 'Unassigned' if they are stuck with old data
-- UPDATE public.user_profiles SET ward_name = 'Unassigned', accessible_wards = '[]'::jsonb;

COMMIT;
