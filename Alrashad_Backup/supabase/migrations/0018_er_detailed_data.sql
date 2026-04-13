-- Add er_treatment (JSONB) to patients for structured ER med lists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_treatment JSONB DEFAULT '[]'::jsonb;

-- Add er_admission_notes (TEXT) for the admitting doctor's exam note
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_notes TEXT;

-- Add is_er flag to visits to distinguish ER stay from ward stay
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;

-- Add is_er flag to investigations to distinguish ER labs
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;
