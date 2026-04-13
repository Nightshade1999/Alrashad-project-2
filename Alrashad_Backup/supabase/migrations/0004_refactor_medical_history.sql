-- ============================================================
-- Migration 0004: Refactor Medical History & Add Archive/Relative fields
-- Apply this in your Supabase SQL Editor
-- ============================================================

-- 1. Add new fields to patients table for relative status and death tracking
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS relative_status TEXT DEFAULT 'Unknown' CHECK (relative_status IN ('Known', 'Unknown')),
  ADD COLUMN IF NOT EXISTS relative_visits TEXT,
  ADD COLUMN IF NOT EXISTS date_of_death DATE,
  ADD COLUMN IF NOT EXISTS cause_of_death TEXT;

-- 2. Update category check constraint to allow 'Deceased/Archive'
-- We have to drop the old constraint and add a new one.
-- First, find the name of the constraint (usually patients_category_check)
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_category_check;
ALTER TABLE patients ADD CONSTRAINT patients_category_check 
  CHECK (category IN ('High Risk', 'Close Follow-up', 'Normal', 'Deceased/Archive'));

-- 3. Refactor Medical History (Drop TEXT, add Arrays/JSONB)
-- This WILL wipe out any existing text in these columns.
ALTER TABLE patients
  DROP COLUMN IF EXISTS chronic_diseases,
  DROP COLUMN IF EXISTS past_surgeries,
  DROP COLUMN IF EXISTS medical_drugs,
  DROP COLUMN IF EXISTS psych_drugs,
  DROP COLUMN IF EXISTS allergies;

ALTER TABLE patients
  ADD COLUMN chronic_diseases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN past_surgeries TEXT[] DEFAULT '{}',
  ADD COLUMN medical_drugs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN psych_drugs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN allergies TEXT[] DEFAULT '{}';
