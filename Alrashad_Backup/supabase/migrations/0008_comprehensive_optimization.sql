-- ============================================================
-- Migration 0008 (ROBUST): Optimization & Ward Visibility
-- 1. Safe JSONB Conversion
-- 2. Ward-Restricted Collaboration Logic
-- 3. Room Number Refactor
-- ============================================================

-- A. Safety Functions for Migration
CREATE OR REPLACE FUNCTION public.to_jsonb_safe(t text) 
RETURNS jsonb AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN OTHERS THEN
  -- If it's not valid JSON (e.g. comma-separated string), make it a JSON array of strings
  RETURN jsonb_build_array(t);
END;
$$ LANGUAGE plpgsql;

-- B. Table Schema Updates
-- 1. Add ward_name for collaboration scoping
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ward_name TEXT;

-- 2. Rename ward_number to room_number safely
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='ward_number') THEN
    ALTER TABLE public.patients RENAME COLUMN ward_number TO room_number;
  END IF;
END $$;

-- 3. Defensive Type Conversion to JSONB
-- We only alter if they are not already jsonb
DO $$ 
DECLARE
    col_name text;
    cols_to_convert text[] := ARRAY['chronic_diseases', 'medical_drugs', 'psych_drugs', 'allergies', 'past_surgeries'];
BEGIN
    FOREACH col_name IN ARRAY cols_to_convert LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'patients' AND column_name = col_name AND data_type = 'text'
        ) THEN
            EXECUTE format('ALTER TABLE public.patients ALTER COLUMN %I TYPE jsonb USING public.to_jsonb_safe(%I)', col_name, col_name);
        END IF;
    END LOOP;
END $$;

-- 4. Backfill ward_name from creator's profiles
UPDATE public.patients p
SET ward_name = up.ward_name
FROM public.user_profiles up
WHERE p.user_id = up.user_id
AND p.ward_name IS NULL;

-- C. System Settings Refinement
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    see_all_patients BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

INSERT INTO public.system_settings (id, see_all_patients)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Grant SELECT access so clinicians can check the toggle in their RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- D. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_patients_category ON public.patients(category);
-- Index the room column (regardless of rename status)
CREATE INDEX IF NOT EXISTS idx_patients_room_num ON public.patients(room_number); 
CREATE INDEX IF NOT EXISTS idx_patients_ward_name ON public.patients(ward_name);

-- GIN Indexes for Clinical Arrays (Research Engine)
CREATE INDEX IF NOT EXISTS idx_patients_chronic_diseases_gin ON public.patients USING GIN (chronic_diseases);
CREATE INDEX IF NOT EXISTS idx_patients_medical_drugs_gin ON public.patients USING GIN (medical_drugs);
CREATE INDEX IF NOT EXISTS idx_patients_psych_drugs_gin ON public.patients USING GIN (psych_drugs);

-- E. Refined RLS Policies (Split for Security)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinicians can see their own patients" ON public.patients;
DROP POLICY IF EXISTS "Dynamic Visibility Patient Access" ON public.patients;
DROP POLICY IF EXISTS "Authenticated SELECT access" ON public.patients;
DROP POLICY IF EXISTS "Authenticated INSERT access" ON public.patients;
DROP POLICY IF EXISTS "Authenticated UPDATE access" ON public.patients;

-- 1. SELECT: Owner OR (Global Toggle ON AND In Same Ward)
CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner access
  OR 
  (
    (SELECT see_all_patients FROM public.system_settings WHERE id = 1) = true -- Global toggle is ON
    AND 
    EXISTS (
      SELECT 1 FROM public.user_profiles AS up 
      WHERE up.user_id = auth.uid() AND up.ward_name = patients.ward_name -- Same ward check
    )
  )
);

-- 2. INSERT: Must be creating for yourself and your own ward
CREATE POLICY "Patient INSERT restriction"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND 
  ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
);

-- 3. UPDATE: Owner only
CREATE POLICY "Patient UPDATE restriction"
ON public.patients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Owner only
CREATE POLICY "Patient DELETE restriction"
ON public.patients FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
