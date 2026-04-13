-- ============================================================
-- Migration 0014: Performance Optimization (RLS & Indexing)
-- Improving Row Level Security performance via splitting policies.
-- ============================================================

-- 1. Split 'Patient SELECT permission' into smaller, indexable policies
-- PostgreSQL handles multiple policies on the same table-action as an OR.
-- Smaller policies are easier for the optimizer to handle.

DROP POLICY IF EXISTS "Patient SELECT permission" ON public.patients;

-- A) Own Data: Purely based on user_id (indexed via PK/FK)
CREATE POLICY "Patient SELECT owner"
ON public.patients FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- B) Admin Access: Separate policy for administrative visibility
CREATE POLICY "Patient SELECT admin"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- C) Ward Collaboration: Separate policy for peer visibility
CREATE POLICY "Patient SELECT collaborator"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND can_see_ward_patients = true 
      AND ward_name = patients.ward_name
  )
);

-- 2. Performance Indexing
-- Composite index for ward-based lookups (highly used in selects/dashboard)
CREATE INDEX IF NOT EXISTS idx_patients_ward_user ON public.patients (ward_name, user_id);

-- GIN index for search-like queries on chronic diseases if not already robust
-- (Already exists from 0008, but making sure)

-- 3. Optimization for Investigations/Visits
-- These tables are often fetched by patient_id.
CREATE INDEX IF NOT EXISTS idx_investigations_patient_date ON public.investigations (patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON public.visits (patient_id, visit_date DESC);
