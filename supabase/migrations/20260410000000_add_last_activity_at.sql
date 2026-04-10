-- Migration: Add last_activity_at column to patients table
-- This column is required for calculating pending follow-ups and UI consistency.

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Initialize last_activity_at with existing data
-- Priority: ER Admission Date > Creation Date
UPDATE public.patients 
SET last_activity_at = COALESCE(er_admission_date, created_at) 
WHERE last_activity_at IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_patients_last_activity ON public.patients(last_activity_at);
