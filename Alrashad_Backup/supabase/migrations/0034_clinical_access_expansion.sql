-- ============================================================
-- Migration 0034: Clinical Access Expansion
-- Broadens RLS policies to allow all authenticated doctors
-- to view and add clinical data to any patient, supporting
-- global search and shared reminders.
-- ============================================================

-- 1. Redefine 'patients' table policies
DROP POLICY IF EXISTS "Shared Patient Select" ON public.patients;
DROP POLICY IF EXISTS "Shared Patient Update" ON public.patients;

-- Collaborative SELECT: Any authenticated doctor can find and view any patient
CREATE POLICY "Collaborative Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (true);

-- Collaborative UPDATE: Any authenticated doctor can update patient info/vitals
CREATE POLICY "Collaborative Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Redefine 'visits' table policies
DROP POLICY IF EXISTS "Shared Visit Access" ON public.visits;

-- Collaborative VISIT Access: Any authenticated doctor can add/view visits for any patient
CREATE POLICY "Collaborative Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Redefine 'investigations' table policies
DROP POLICY IF EXISTS "Shared Investigation Access" ON public.investigations;

-- Collaborative INVESTIGATION Access: Any authenticated doctor can add/view labs for any patient
CREATE POLICY "Collaborative Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
