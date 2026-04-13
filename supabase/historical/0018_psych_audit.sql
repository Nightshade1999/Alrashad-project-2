-- Add audit tracking columns to patients table for psych and ER treatment
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS psych_last_edit_by TEXT,
ADD COLUMN IF NOT EXISTS psych_last_edit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS er_treatment_last_edit_by TEXT,
ADD COLUMN IF NOT EXISTS er_treatment_last_edit_at TIMESTAMPTZ;

-- Ensure doctor_name exists in visits table
ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- Index for better performance if needed
CREATE INDEX IF NOT EXISTS idx_patients_psych_edit ON public.patients(psych_last_edit_at);
