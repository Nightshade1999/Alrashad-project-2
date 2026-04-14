-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: DATABASE WIPE SCRIPT
-- ============================================================
-- ⚠️  WARNING: THIS IS IRREVERSIBLE.
-- This script permanently deletes ALL clinical data, user
-- profiles, and schema objects from the public schema.
-- Auth users in auth.users are NOT deleted — remove those
-- manually from the Supabase dashboard if needed.
--
-- WHEN TO USE:
--   • Resetting a development/staging database
--   • Starting fresh before applying standard_schema.sql
--   • Recovering from a corrupted schema state
--
-- HOW TO USE:
--   1. Run this script in the Supabase SQL editor FIRST.
--   2. Then run standard_schema.sql to rebuild everything.
-- ============================================================

-- Step 1: Remove tables from realtime publication (ignore errors if already absent)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.nurse_instructions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Drop all triggers on auth.users (user profile auto-creation)
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;

-- Step 3: Drop all tables in correct dependency order
-- (child tables before parent tables to respect FK constraints)
DROP TABLE IF EXISTS public.trash                 CASCADE;
DROP TABLE IF EXISTS public.notifications         CASCADE;
DROP TABLE IF EXISTS public.nurse_instructions    CASCADE;
DROP TABLE IF EXISTS public.referrals             CASCADE;
DROP TABLE IF EXISTS public.reminders             CASCADE;
DROP TABLE IF EXISTS public.investigations        CASCADE;
DROP TABLE IF EXISTS public.visits                CASCADE;
DROP TABLE IF EXISTS public.patients              CASCADE;
DROP TABLE IF EXISTS public.pharmacy_inventory    CASCADE;
DROP TABLE IF EXISTS public.lab_reference_ranges  CASCADE;
DROP TABLE IF EXISTS public.ward_settings         CASCADE;
DROP TABLE IF EXISTS public.system_settings       CASCADE;
DROP TABLE IF EXISTS public.user_profiles         CASCADE;

-- Step 4: Drop all stored functions
DROP FUNCTION IF EXISTS public.update_updated_at_column()       CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                CASCADE;
DROP FUNCTION IF EXISTS public.create_update_trigger(TEXT)      CASCADE;
DROP FUNCTION IF EXISTS public.proc_move_to_trash()             CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_patient_last_activity() CASCADE;
DROP FUNCTION IF EXISTS public.fn_notify_doctors_on_lab_result() CASCADE;
DROP FUNCTION IF EXISTS public.fn_notify_nurse_hub_on_instruction() CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_user_role()               CASCADE;
DROP FUNCTION IF EXISTS public.fn_is_admin()                    CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_user_ward_info()          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_return_patient_to_ward(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.migrate_patients(UUID, UUID)     CASCADE;
DROP FUNCTION IF EXISTS public.get_db_size()                    CASCADE;

-- ──────────────────────────────────────────────────────────────
-- ✅ Done. The public schema is now empty.
-- Run standard_schema.sql next to rebuild the full system.
-- ──────────────────────────────────────────────────────────────
