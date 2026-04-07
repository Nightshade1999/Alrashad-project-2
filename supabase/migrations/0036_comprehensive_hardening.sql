-- ============================================================
-- Migration 0036: Comprehensive Hardening & Optimization
-- ============================================================

-- 1. SECURITY: LOCK DOWN FUNCTION SEARCH PATHS (Defensive against missing functions or signature mismatches)
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.proname IN ('rpc_move_patient_to_er', 'rpc_return_patient_to_ward', 'track_high_risk_shift')
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 2. PERFORMANCE: MISSING FOREIGN KEY INDEXES (REMINDERS)
-- Advisors flagged unindexed FKs which cause slow lookups in notification hub
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_resolved_by ON public.reminders(resolved_by);

-- 3. PERFORMANCE: PRUNE UNUSED INDEXES
-- Redundant indexes slow down INSERT/UPDATE operations
DROP INDEX IF EXISTS public.idx_visits_doctor_id;
DROP INDEX IF EXISTS public.idx_visits_patient_id;

-- 4. SECURITY: CONSOLIDATE PATIENT RLS POLICIES
-- Removing overlapping/shadowed policies to ensure consistent access control.
-- We move from "Multiple OR-ed policies" to "One strict Clinician-Only policy".

-- Step 4a: Drop known fragmented/redundant policies
DROP POLICY IF EXISTS "Collaborative Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Unified Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Patient UPDATE permission" ON public.patients;
DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;
DROP POLICY IF EXISTS "Patient Shared Access" ON public.patients;
DROP POLICY IF EXISTS "Patient UPDATE restriction" ON public.patients;
DROP POLICY IF EXISTS "Patient SELECT restriction" ON public.patients;
DROP POLICY IF EXISTS "Shared Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Global Access" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Global Update" ON public.patients;

-- Step 4b: Implement "Verified Clinician Collaboration" Policy
-- Only users who are registered in user_profiles can access patients.
-- This allows Global Search and Shared Reminders to work safely.
CREATE POLICY "Verified Clinician Global Access"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Verified Clinician Global Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Note: DELETE is still restricted to the original owner/admin in 0008, 
-- but we ensure no broader "true" policy remains above it.
