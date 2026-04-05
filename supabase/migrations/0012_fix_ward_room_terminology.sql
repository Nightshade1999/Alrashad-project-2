-- ============================================================
-- Migration 0012: Correct Terminology (Ward vs Room)
-- Wards are for accounts, Rooms are for patients.
-- ============================================================

-- 1. Rename column back to room_number
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='ward_number') THEN
    ALTER TABLE public.patients RENAME COLUMN ward_number TO room_number;
  END IF;
END $$;

-- 2. Update Indexes to match terminology
DROP INDEX IF EXISTS public.idx_patients_ward_number;
CREATE INDEX IF NOT EXISTS idx_patients_room_num ON public.patients(room_number);

-- 3. Ensure ward_name exists in patients table (it should already be there from migration 0008)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='ward_name') THEN
    ALTER TABLE public.patients ADD COLUMN ward_name TEXT;
  END IF;
END $$;
