-- ============================================================
-- Migration 0026: Force PostgREST Schema Reload
-- Performs a dummy DDL operation to trigger Supabase's 
-- PostgREST cache refresh.
-- ============================================================

COMMENT ON TABLE investigations IS 'Patient laboratory investigations (including ER-specific records).';
COMMENT ON TABLE visits IS 'Doctor clinical visit notes and examination findings.';

-- Ensure RLS allows INSERT for anyone if patient is in ER
-- This is a safety layer for cross-ward documentation.
DROP POLICY IF EXISTS "Enable ER inserts for all" ON public.investigations;
CREATE POLICY "Enable ER inserts for all"
ON public.investigations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND p.is_in_er = true
  )
);

DROP POLICY IF EXISTS "Enable ER inserts for visits" ON public.visits;
CREATE POLICY "Enable ER inserts for visits"
ON public.visits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND p.is_in_er = true
  )
);
