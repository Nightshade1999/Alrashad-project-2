-- Add ER tracking fields to the patients table
ALTER TABLE patients
ADD COLUMN er_admission_date TIMESTAMPTZ,
ADD COLUMN er_admission_doctor VARCHAR(255),
ADD COLUMN er_chief_complaint VARCHAR(255),
ADD COLUMN er_history JSONB DEFAULT '[]'::jsonb;
