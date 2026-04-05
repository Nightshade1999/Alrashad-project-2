-- ============================================================
-- Migration 0011: Revert Terminology (Room -> Ward)
-- Returning to 'ward_number' as requested by the clinical staff.
-- ============================================================

-- 1. Rename column back to ward_number
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='room_number') THEN
    ALTER TABLE public.patients RENAME COLUMN room_number TO ward_number;
  END IF;
END $$;

-- 2. Update Indexes to match terminology
DROP INDEX IF EXISTS public.idx_patients_room_num;
CREATE INDEX IF NOT EXISTS idx_patients_ward_number ON public.patients(ward_number);

-- 3. Update RLS policies (just in case they referenced room_number, though they usually don't)
-- (No changes needed for RLS as they use ward_name and user_id)
