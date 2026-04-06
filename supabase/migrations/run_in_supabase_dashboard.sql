-- ===========================================
-- Migration 0017 ONLY: ER Features (Admission Data)
-- Run this — migration 0016 was already applied.
-- ===========================================

-- Add ER tracking fields to the patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_date TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_doctor VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_chief_complaint VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_history JSONB DEFAULT '[]'::jsonb;
