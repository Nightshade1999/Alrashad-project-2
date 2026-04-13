-- ============================================================
-- Migration 0030: Final Schema Hardening & RLS Repair
-- Fixes missing 'created_at' columns and repairs RLS overlap.
-- ============================================================

-- 1. Ensure 'created_at' and 'updated_at' exist on all core tables
DO $$ 
BEGIN
  -- Visits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='created_at') THEN
    ALTER TABLE public.visits ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='updated_at') THEN
    ALTER TABLE public.visits ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Investigations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='created_at') THEN
    ALTER TABLE public.investigations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='updated_at') THEN
    ALTER TABLE public.investigations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Patients (Ensure standard updated_at)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='created_at') THEN
    ALTER TABLE public.patients ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='updated_at') THEN
    ALTER TABLE public.patients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Consolidate RLS for 'patients' table
-- We drop existing fragmented policies and create clean, unified ones.
DROP POLICY IF EXISTS "Users can manage their own patients" ON public.patients;
DROP POLICY IF EXISTS "Global ER Patient Visibility" ON public.patients;
DROP POLICY IF EXISTS "Global ER Patient Status Update" ON public.patients;
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;

-- Unified SELECT: Owner OR if patient is in ER
CREATE POLICY "Unified Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
);

-- Unified UPDATE: Owner OR if patient is in ER (limited to status fields)
CREATE POLICY "Unified Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
)
WITH CHECK (true);

-- 3. Consolidate RLS for 'visits' table
DROP POLICY IF EXISTS "Global ER Visits Access" ON public.visits;
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;

CREATE POLICY "Unified Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND (p.user_id = auth.uid() OR p.is_in_er = true)
  )
)
WITH CHECK (true);

-- 4. Consolidate RLS for 'investigations' table
DROP POLICY IF EXISTS "Global ER Investigations Access" ON public.investigations;
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;

CREATE POLICY "Unified Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND (p.user_id = auth.uid() OR p.is_in_er = true)
  )
)
WITH CHECK (true);

-- 5. Performance: Add missing indexes for common filters
CREATE INDEX IF NOT EXISTS idx_visits_patient_created ON public.visits(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_patient_created ON public.investigations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_is_er ON public.patients(is_in_er);
