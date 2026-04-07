-- ======================================================================
-- FIX: Add foreign key on reminders.patient_id -> patients(id)
-- This enables Supabase's automatic join syntax: .select('*, patients(name)')
-- Without it, the patients(name) join returns null.
-- ======================================================================

-- Add FK constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reminders_patient_id_fkey' 
    AND table_name = 'reminders'
  ) THEN
    ALTER TABLE reminders 
      ADD CONSTRAINT reminders_patient_id_fkey 
      FOREIGN KEY (patient_id) 
      REFERENCES patients(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
