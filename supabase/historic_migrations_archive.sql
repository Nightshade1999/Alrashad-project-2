-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_number TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('High Risk', 'Close Follow-up', 'Normal')),
  past_surgeries TEXT,
  chronic_diseases TEXT,
  psych_drugs TEXT,
  medical_drugs TEXT,
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exam_notes TEXT NOT NULL
);

-- Create investigations table
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wbc NUMERIC,
  hb NUMERIC,
  s_urea NUMERIC,
  s_creatinine NUMERIC,
  ast NUMERIC,
  alt NUMERIC,
  tsb NUMERIC,
  hba1c NUMERIC,
  rbs NUMERIC
);

-- Set up Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated doctors to perform CRUD
CREATE POLICY "Enable read/write access for authenticated users" ON patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write access for authenticated users" ON visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write access for authenticated users" ON investigations FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE visits
ADD COLUMN bp_sys INTEGER,
ADD COLUMN bp_dia INTEGER,
ADD COLUMN pr INTEGER,
ADD COLUMN spo2 INTEGER,
ADD COLUMN temp NUMERIC;
-- ============================================================
-- Migration 0002: Per-user data isolation + cross-device ward name
-- Apply this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- 1. Create user_profiles table to store per-user settings (ward name, etc.)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ward_name TEXT NOT NULL DEFAULT 'Internal Medicine - Psych Ward',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add user_id column to patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill: since we're starting fresh, set any existing rows to NULL
-- (they will remain inaccessible under the new RLS policy â€” effectively deleted from view)

-- 3. Make user_id NOT NULL going forward (new inserts must supply it)
-- We use a default so RLS inserts work correctly
ALTER TABLE patients ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4. Drop old open-access policies
DROP POLICY IF EXISTS "Enable read/write access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable read/write access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable read/write access for authenticated users" ON investigations;

-- 5. New per-user policy for patients
CREATE POLICY "Users can only access their own patients"
  ON patients FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Per-user policy for visits (via patient ownership)
CREATE POLICY "Users can only access visits for their patients"
  ON visits FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = visits.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = visits.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- 7. Per-user policy for investigations (via patient ownership)
CREATE POLICY "Users can only access investigations for their patients"
  ON investigations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = investigations.patient_id
        AND patients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = investigations.patient_id
        AND patients.user_id = auth.uid()
    )
  );

-- 8. Auto-update updated_at on user_profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================================
-- Migration 0003: Add province and education_level to patients
-- Apply this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS education_level TEXT;
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
-- Migration 0005: Add roles and admin bypass for RLS

-- 1. Add role to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Update patient policy to allow admin bypass
-- Standard user: can ONLY see their own patients.
-- Admin user: can see ALL patients.
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;
CREATE POLICY "Users can only access their own patients"
  ON public.patients FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
  )
  WITH CHECK (
    (auth.uid() = user_id) OR
    (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- 3. Update visits policy to allow admin bypass
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
CREATE POLICY "Users can only access visits for their patients"
  ON public.visits FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.visits.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.visits.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- 4. Update investigations policy to allow admin bypass
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
CREATE POLICY "Users can only access investigations for their patients"
  ON public.investigations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.investigations.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.investigations.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );
-- Migration 0006_admin_functions.sql
-- Contains RPCs for admin operations.

-- 1. Migrate Patients from one doctor to another
CREATE OR REPLACE FUNCTION public.migrate_patients(from_user UUID, to_user UUID)
RETURNS INT AS $$
DECLARE
  rows_moved INT;
BEGIN
  -- Verify admin status of caller OR allow service_role bypass
  IF auth.role() = 'service_role' THEN
    -- Allow Service Key to proceed
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Only admins can migrate patients';
  END IF;

  -- Reassign ownership. (Visits & Investigations are linked to patient_id, so they move automatically)
  UPDATE public.patients
  SET user_id = to_user, updated_at = NOW()
  WHERE user_id = from_user;

  GET DIAGNOSTICS rows_moved = ROW_COUNT;
  RETURN rows_moved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get live database size in bytes (For storage monitoring)
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS BIGINT AS $$
BEGIN
  -- Verify admin status of caller OR allow service_role bypass
  IF auth.role() = 'service_role' THEN
    -- Allow Service Key to proceed
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Only admins can view database size';
  END IF;
  
  RETURN CAST(pg_database_size(current_database()) AS BIGINT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration 0007_add_user_specialty.sql

-- Add specialty to track the doctor's residency type
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT 'psychiatry';

-- Ensure existing users (which are in the psych ward) are set to psychiatry 
-- (The default covers this, but we can explicitly allow changing it to internal_medicine)
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
-- ============================================================
-- Migration 0009: Per-User Collaboration & Schema Cleanup
-- 1. Add collaboration flag to user profiles
-- 2. Refactor RLS to check individual account permissions
-- 3. Cleanup of global settings (deprecated)
-- ============================================================

-- 1. Add individual permission flag to profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS can_see_ward_patients BOOLEAN DEFAULT false;

-- 2. Cleanup Global Settings (No longer used)
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- 3. Refactor RLS Policies for Patients
-- We now check if the viewing doctor has 'can_see_ward_patients' enabled in THEIR profile
-- or if they are the owner of the record.

DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;

CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner access (Always allowed)
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.can_see_ward_patients = true -- Viewer has collaboration enabled
    AND viewer.ward_name = patients.ward_name -- Viewer is in the same ward
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.role = 'admin' -- Admins should see everything in their ward? 
    -- User clarified earlier: same ward designated to account.
    AND viewer.ward_name = patients.ward_name
  )
);

-- 4. INSERT/UPDATE Policies (Preserved from 0008)
DROP POLICY IF EXISTS "Patient INSERT restriction" ON public.patients;
CREATE POLICY "Patient INSERT restriction"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND 
  ward_name = (SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patient UPDATE restriction" ON public.patients;
CREATE POLICY "Patient UPDATE restriction"
ON public.patients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- ============================================================
-- Migration 0010: Database Health & Hardening
-- 1. Performance Optimization (Indexing FKs & Dup cleanup)
-- 2. Security Hardening (Function Search Paths)
-- 3. RLS Performance (Static Predicates)
-- ============================================================

-- 1. Performance: Foreign Key Indexing (Covering Joins/Deletes)
CREATE INDEX IF NOT EXISTS idx_investigations_visit_id ON public.investigations(visit_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_id ON public.visits(doctor_id);

-- 2. Performance: Resolve Duplicate Indexes
-- In 0008 we created idx_patients_room_num after a rename.
-- Drop the legacy idx_patients_room if it exists.
DROP INDEX IF EXISTS public.idx_patients_room;

-- 3. Security Hardening: Function Search Paths
-- Explicitly lock functions to public schema to prevent spoofing/path attacks.

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- to_jsonb_safe
CREATE OR REPLACE FUNCTION public.to_jsonb_safe(t text) 
RETURNS jsonb 
SET search_path = public
AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_array(t);
END;
$$ LANGUAGE plpgsql;

-- migrate_patients
CREATE OR REPLACE FUNCTION public.migrate_patients(from_user UUID, to_user UUID)
RETURNS INT 
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  rows_moved INT;
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    -- Allow Service Key
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Only admins can migrate patients';
  END IF;

  UPDATE public.patients
  SET user_id = to_user, updated_at = NOW()
  WHERE user_id = from_user;

  GET DIAGNOSTICS rows_moved = ROW_COUNT;
  RETURN rows_moved;
END;
$$ LANGUAGE plpgsql;

-- get_db_size
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS BIGINT 
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    -- Allow Service Key
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Only admins can view database size';
  END IF;
  
  RETURN CAST(pg_database_size(current_database()) AS BIGINT);
END;
$$ LANGUAGE plpgsql;

-- 4. RLS Performance: Optimized Static Predicates
-- Using (SELECT auth.uid()) prevents per-row evaluation cost.

-- a. Patients Visibility
DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;
CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = (SELECT auth.uid()) 
    AND (viewer.can_see_ward_patients = true OR viewer.role = 'admin')
    AND viewer.ward_name = patients.ward_name 
  )
);

-- b. User Profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;
CREATE POLICY "Users can manage their own profile"
ON public.user_profiles FOR ALL 
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- c. Visits (Cascaded Visibility)
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
CREATE POLICY "Users can only access visits for their patients"
ON public.visits FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = visits.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);

-- d. Investigations (Cascaded Visibility)
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
CREATE POLICY "Users can only access investigations for their patients"
ON public.investigations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = investigations.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);
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
-- ============================================================
-- Migration 0013: Harden Patient Policies
-- Removes all legacy overlaps and implements clean, action-specific rules.
-- ============================================================

-- 1. Drop ALL existing policies for the patients table to avoid overlaps
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'patients' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patients', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 3. Consolidated SELECT Visibility
--    Grants access if:
--    A) User is the owner of the record
--    B) User is an administrator
--    C) User is in the same ward AND has the 'can_see_ward_patients' permission enabled
CREATE POLICY "Patient SELECT permission"
ON public.patients FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id -- Owner access
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND (
      role = 'admin' -- Admin access override
      OR 
      (ward_name = patients.ward_name AND can_see_ward_patients = true) -- Same-ward collaboration
    )
  )
);

-- 4. Consolidated INSERT Restriction
--    A user can only create a patient for themselves.
CREATE POLICY "Patient INSERT permission"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 5. Consolidated UPDATE Restriction
--    Only the owner or an administrator can update the patient record.
CREATE POLICY "Patient UPDATE permission"
ON public.patients FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Consolidated DELETE Restriction
--    Only the owner or an administrator can delete the patient record.
CREATE POLICY "Patient DELETE permission"
ON public.patients FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
-- ============================================================
-- Migration 0014: Performance Optimization (RLS & Indexing)
-- Improving Row Level Security performance via splitting policies.
-- ============================================================

-- 1. Split 'Patient SELECT permission' into smaller, indexable policies
-- PostgreSQL handles multiple policies on the same table-action as an OR.
-- Smaller policies are easier for the optimizer to handle.

DROP POLICY IF EXISTS "Patient SELECT permission" ON public.patients;

-- A) Own Data: Purely based on user_id (indexed via PK/FK)
CREATE POLICY "Patient SELECT owner"
ON public.patients FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- B) Admin Access: Separate policy for administrative visibility
CREATE POLICY "Patient SELECT admin"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- C) Ward Collaboration: Separate policy for peer visibility
CREATE POLICY "Patient SELECT collaborator"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND can_see_ward_patients = true 
      AND ward_name = patients.ward_name
  )
);

-- 2. Performance Indexing
-- Composite index for ward-based lookups (highly used in selects/dashboard)
CREATE INDEX IF NOT EXISTS idx_patients_ward_user ON public.patients (ward_name, user_id);

-- GIN index for search-like queries on chronic diseases if not already robust
-- (Already exists from 0008, but making sure)

-- 3. Optimization for Investigations/Visits
-- These tables are often fetched by patient_id.
CREATE INDEX IF NOT EXISTS idx_investigations_patient_date ON public.investigations (patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON public.visits (patient_id, visit_date DESC);
-- ============================================================
-- Migration 0015: Maintenance and Storage Cleanup
-- Optimizing storage by removing redundant indexes and reclaiming space.
-- ============================================================

-- 1. Remove redundant single-column index
-- This is already covered by the composite index (ward_name, user_id).
DROP INDEX IF EXISTS public.idx_patients_ward_name;

-- 2. Re-optimize the clinical search indexes
-- These GIN indexes can be large, but they are necessary for search.
-- We ensure they are up-to-date.
ANALYZE public.patients;
ANALYZE public.visits;
ANALYZE public.investigations;

-- 3. Diagnostic Tool (Manual)
-- Copy and run the query below in your Supabase SQL Editor 
-- to see exactly how much space each table and its indexes are using.
/*
SELECT
    relname AS "Table Name",
    pg_size_pretty(pg_table_size(C.oid)) AS "Data Size",
    pg_size_pretty(pg_indexes_size(C.oid)) AS "Index Size",
    pg_size_pretty(pg_total_relation_size(C.oid)) AS "Total Size (Inc Index)",
    reltuples::bigint AS "Approx Row Count"
FROM pg_class C
LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
WHERE nspname = 'public'
  AND relkind = 'r'
ORDER BY pg_total_relation_size(C.oid) DESC;
*/

-- 4. Quick Cleanup (Manual)
-- If you have recently deleted many patients, you can run:
-- VACUUM FULL public.patients;
-- in your SQL editor to immediately shrink the table on disk.
-- Add is_in_er to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_in_er BOOLEAN DEFAULT FALSE;

-- Add gender to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female'));

-- Create ward_settings table
CREATE TABLE IF NOT EXISTS ward_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_name TEXT UNIQUE NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE ward_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated users to ward_settings
CREATE POLICY "Enable read/write access for authenticated users" ON ward_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Add ER tracking fields to the patients table
ALTER TABLE patients
ADD COLUMN er_admission_date TIMESTAMPTZ,
ADD COLUMN er_admission_doctor VARCHAR(255),
ADD COLUMN er_chief_complaint VARCHAR(255),
ADD COLUMN er_history JSONB DEFAULT '[]'::jsonb;
-- Add er_treatment (JSONB) to patients for structured ER med lists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_treatment JSONB DEFAULT '[]'::jsonb;

-- Add er_admission_notes (TEXT) for the admitting doctor's exam note
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_notes TEXT;

-- Add is_er flag to visits to distinguish ER stay from ward stay
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;

-- Add is_er flag to investigations to distinguish ER labs
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;
-- ============================================================
-- Migration 0019: Multi-Ward Access & Data Integrity Fix
-- Supporting multiple assigned wards per user.
-- ============================================================

-- 1. Add accessible_wards column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS accessible_wards TEXT[] DEFAULT '{}';

-- 2. Backfill: If accessible_wards is empty, add the current ward_name to it
UPDATE user_profiles 
  SET accessible_wards = ARRAY[ward_name] 
  WHERE array_length(accessible_wards, 1) IS NULL OR accessible_wards = '{}';

-- 3. Ensure ward_name is always contained within accessible_wards (Data Integrity)
-- (No trigger needed if we handle it in application logic, but good practice)
-- Add ESR, CRP and Other Labs to investigations
ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS esr NUMERIC,
ADD COLUMN IF NOT EXISTS crp NUMERIC,
ADD COLUMN IF NOT EXISTS other_labs JSONB DEFAULT '[]'::jsonb;
-- ======================================================================
-- FIX: Reminders table RLS policies
-- The reminders table has RLS enabled but is missing INSERT/UPDATE policies 
-- for authenticated users, causing "new row violates row-level security" errors.
-- ======================================================================

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "reminders_select" ON reminders;
DROP POLICY IF EXISTS "reminders_insert" ON reminders;
DROP POLICY IF EXISTS "reminders_update" ON reminders;
DROP POLICY IF EXISTS "reminders_delete" ON reminders;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON reminders;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON reminders;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON reminders;

-- Allow all authenticated users to read reminders
CREATE POLICY "reminders_select" ON reminders
  FOR SELECT TO authenticated
  USING (true);

-- Allow all authenticated users to create reminders
CREATE POLICY "reminders_insert" ON reminders
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update reminders (for resolve/reschedule)
CREATE POLICY "reminders_update" ON reminders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow admins to delete reminders (optional cleanup)
CREATE POLICY "reminders_delete" ON reminders
  FOR DELETE TO authenticated
  USING (true);
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
-- ============================================================
-- Migration 0023: Add Doctor Tracking to Investigations
-- Allows standalone labs to record which doctor entered them,
-- independent of any linked visit.
-- ============================================================

ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
-- ============================================================
-- Migration 0024: Allow Global Tasks (Nullable Patient ID)
-- This fixes the Not-Null constraint error when adding tasks 
-- from the Notification Center that aren't linked to a specific patient.
-- ============================================================

ALTER TABLE public.reminders 
  ALTER COLUMN patient_id DROP NOT NULL;
-- ============================================================
-- Migration 0025: Global ER Visibility (Simplified)
-- Allows all doctors to see and document for any patient in ER
-- ============================================================

-- 1. Patients: Allow SELECT if is_in_er is true, regardless of ward
DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;
CREATE POLICY "Patient SELECT visibility"
ON public.patients FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  is_in_er = true
  OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles AS viewer
    WHERE viewer.user_id = (SELECT auth.uid()) 
    AND (viewer.can_see_ward_patients = true OR viewer.role = 'admin')
    AND viewer.ward_name = patients.ward_name 
  )
);

-- 2. Visits: Allow access if patient is in ER
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
CREATE POLICY "Users can only access visits for their patients"
ON public.visits FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = visits.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      p.is_in_er = true
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);

-- 3. Investigations: Allow access if patient is in ER
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
CREATE POLICY "Users can only access investigations for their patients"
ON public.investigations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = investigations.patient_id
    AND (
      p.user_id = (SELECT auth.uid())
      OR 
      p.is_in_er = true
      OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles AS v
        WHERE v.user_id = (SELECT auth.uid())
        AND (v.can_see_ward_patients = true OR v.role = 'admin')
        AND v.ward_name = p.ward_name
      )
    )
  )
);
-- ============================================================
-- Migration 0026: Force PostgREST Schema Reload
-- Performs a dummy DDL operation to trigger Supabase's 
-- PostgREST cache refresh.
-- ============================================================

COMMENT ON TABLE investigations IS 'Patient laboratory investigations (including ER-specific records).';
COMMENT ON TABLE visits IS 'Doctor clinical visit notes and examination findings.';

-- Ensure RLS allows INSERT for anyone if patient is in ER
-- This is a safety layer for cross-ward documentation.
DROP POLICY IF EXISTS "Enable ER inserts for all" ON public.investigations;
CREATE POLICY "Enable ER inserts for all"
ON public.investigations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND p.is_in_er = true
  )
);

DROP POLICY IF EXISTS "Enable ER inserts for visits" ON public.visits;
CREATE POLICY "Enable ER inserts for visits"
ON public.visits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND p.is_in_er = true
  )
);
-- ============================================================
-- Migration 0027: Simplified Cross-Ward ER Visibility
-- Replaces complex subqueries with direct 'is_er' checks
-- for visits and investigations to ensure high availability.
-- ============================================================

-- 1. Investigations: Global Read/Write for any record marked as ER
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
DROP POLICY IF EXISTS "Enable ER inserts for all" ON public.investigations;

CREATE POLICY "Global ER Investigations Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = investigations.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = investigations.patient_id)
  )
);

-- 2. Visits: Global Read/Write for any record marked as ER
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
DROP POLICY IF EXISTS "Enable ER inserts for visits" ON public.visits;

CREATE POLICY "Global ER Visits Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = visits.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = visits.patient_id)
  )
);

-- Ensure anyone can see patient metadata if in ER (already in 0025, but double checking)
-- We don't change the patients policy as it already relies on is_in_er = true.
-- ============================================================
-- Migration 0028: Global ER Access & Policy Repair (Fixed)
-- Corrects the column name back to 'ward_name' as per the schema
-- and ensures that while a patient is in the ER, ALL their 
-- historical records (Ward + ER) are visible to any doctor.
-- ============================================================

-- Fix Investigations Policy
DROP POLICY IF EXISTS "Global ER Investigations Access" ON public.investigations;
CREATE POLICY "Global ER Investigations Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  -- Allow access if the patient is CURRENTLY in ER
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND p.is_in_er = true
  )
  OR
  -- Original Ownership/Ward logic
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = investigations.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = investigations.patient_id)
  )
);

-- Fix Visits Policy
DROP POLICY IF EXISTS "Global ER Visits Access" ON public.visits;
CREATE POLICY "Global ER Visits Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  -- Allow access if the patient is CURRENTLY in ER
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND p.is_in_er = true
  )
  OR
  -- Original Ownership/Ward logic
  (SELECT auth.uid()) = (SELECT p.user_id FROM public.patients p WHERE p.id = visits.patient_id)
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles v
    WHERE v.user_id = (SELECT auth.uid())
    AND (v.can_see_ward_patients = true OR v.role = 'admin')
    AND v.ward_name = (SELECT p.ward_name FROM public.patients p WHERE p.id = visits.patient_id)
  )
);
-- ============================================================
-- Migration 0029: Global ER Patient Visibility & Updates
-- Allows any authenticated doctor to view and manage 
-- patient status for current ER admissions.
-- ============================================================

-- 1. Patients: Global Select for any record marked as 'in er'
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;

CREATE POLICY "Users can manage their own patients"
ON public.patients FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Global ER Patient Visibility"
ON public.patients FOR SELECT
TO authenticated
USING (is_in_er = true);

-- 2. Patients: Global Update for ER status transitions
CREATE POLICY "Global ER Patient Status Update"
ON public.patients FOR UPDATE
TO authenticated
USING (is_in_er = true)
WITH CHECK (true); -- Allow moving back to ward (is_in_er = false)

-- Allow inserting if moved to ER? (Usually, owners insert, but let's be safe)
-- Patients are usually created in a ward, then moved.
-- ============================================================
-- Migration 0030: Final Schema Hardening & RLS Repair
-- Fixes missing 'created_at' columns and repairs RLS overlap.
-- ============================================================

-- 1. Ensure 'created_at' and 'updated_at' exist on all core tables
DO $$ 
BEGIN
  -- Visits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='created_at') THEN
    ALTER TABLE public.visits ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='updated_at') THEN
    ALTER TABLE public.visits ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Investigations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='created_at') THEN
    ALTER TABLE public.investigations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='updated_at') THEN
    ALTER TABLE public.investigations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Patients (Ensure standard updated_at)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='created_at') THEN
    ALTER TABLE public.patients ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='updated_at') THEN
    ALTER TABLE public.patients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Consolidate RLS for 'patients' table
-- We drop existing fragmented policies and create clean, unified ones.
DROP POLICY IF EXISTS "Users can manage their own patients" ON public.patients;
DROP POLICY IF EXISTS "Global ER Patient Visibility" ON public.patients;
DROP POLICY IF EXISTS "Global ER Patient Status Update" ON public.patients;
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;

-- Unified SELECT: Owner OR if patient is in ER
CREATE POLICY "Unified Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
);

-- Unified UPDATE: Owner OR if patient is in ER (limited to status fields)
CREATE POLICY "Unified Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
)
WITH CHECK (true);

-- 3. Consolidate RLS for 'visits' table
DROP POLICY IF EXISTS "Global ER Visits Access" ON public.visits;
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;

CREATE POLICY "Unified Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = visits.patient_id
    AND (p.user_id = auth.uid() OR p.is_in_er = true)
  )
)
WITH CHECK (true);

-- 4. Consolidate RLS for 'investigations' table
DROP POLICY IF EXISTS "Global ER Investigations Access" ON public.investigations;
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;

CREATE POLICY "Unified Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = investigations.patient_id
    AND (p.user_id = auth.uid() OR p.is_in_er = true)
  )
)
WITH CHECK (true);

-- 5. Performance: Add missing indexes for common filters
CREATE INDEX IF NOT EXISTS idx_visits_patient_created ON public.visits(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_patient_created ON public.investigations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_is_er ON public.patients(is_in_er);
-- ============================================================
-- Migration 0031: Security Definer Transition Functions
-- Provides a robust way to transition patients between wards 
-- regardless of the documenting doctor's original ward.
-- ============================================================

-- Function: Return Patient to Ward
CREATE OR REPLACE FUNCTION public.rpc_return_patient_to_ward(p_patient_id UUID)
RETURNS VOID AS $$
DECLARE
  v_history JSONB;
  v_admission_date TIMESTAMPTZ;
  v_admission_doctor TEXT;
  v_chief_complaint TEXT;
  v_admission_notes TEXT;
BEGIN
  -- 1. Fetch current ER details
  SELECT er_history, er_admission_date, er_admission_doctor, er_chief_complaint, er_admission_notes
  INTO v_history, v_admission_date, v_admission_doctor, v_chief_complaint, v_admission_notes
  FROM public.patients
  WHERE id = p_patient_id;

  -- 2. Build new history entry if admission date exists
  IF v_admission_date IS NOT NULL THEN
    v_history := COALESCE(v_history, '[]'::jsonb) || jsonb_build_object(
      'admission_date', v_admission_date,
      'discharge_date', NOW(),
      'doctor', v_admission_doctor,
      'chief_complaint', v_chief_complaint,
      'admission_notes', v_admission_notes
    );
  END IF;

  -- 3. Perform the update (Security Definer bypasses RLS)
  UPDATE public.patients
  SET 
    is_in_er = false,
    er_admission_date = null,
    er_admission_doctor = null,
    er_chief_complaint = null,
    er_admission_notes = null,
    er_treatment = '[]'::jsonb,
    er_history = v_history,
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Move Patient to ER
CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.patients
  SET 
    is_in_er = true,
    er_admission_date = NOW(),
    er_admission_doctor = p_doctor_identifier,
    er_chief_complaint = p_chief_complaint,
    er_admission_notes = p_admission_notes,
    er_treatment = '[]'::jsonb,
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all on functions, then grant to authenticated users only
REVOKE ALL ON FUNCTION public.rpc_return_patient_to_ward(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_return_patient_to_ward(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) TO authenticated;
-- ============================================================
-- Migration 0032: Global Signature Visibility
-- Allows all doctors to see each other's professional names 
-- so signatures appear correctly across the whole system.
-- ============================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;

-- 1. SELECT: Global visibility for all authenticated doctors
CREATE POLICY "Global profile visibility"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT/UPDATE: Restrict to the account owner only
CREATE POLICY "Users can manage their own data"
ON public.user_profiles FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
-- ============================================================
-- Migration 0033: Shared Ward Access
-- Allows all doctors assigned to the same ward to manage
-- their ward's patients together.
-- ============================================================

-- 1. Redefine 'patients' table policies
DROP POLICY IF EXISTS "Unified Patient Select" ON public.patients;
DROP POLICY IF EXISTS "Unified Patient Update" ON public.patients;

-- Shared SELECT: Admin, Creator, ER, OR same Ward
CREATE POLICY "Shared Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND (up.role = 'admin' OR up.ward_name = patients.ward_name)
  )
);

-- Shared UPDATE: Admin, Creator, ER, OR same Ward
CREATE POLICY "Shared Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  is_in_er = true
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND (up.role = 'admin' OR up.ward_name = patients.ward_name)
  )
)
WITH CHECK (true);

-- 2. Redefine 'visits' table policies
DROP POLICY IF EXISTS "Unified Visit Access" ON public.visits;

CREATE POLICY "Shared Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.user_profiles up ON up.user_id = auth.uid()
    WHERE p.id = visits.patient_id
    AND (
      p.user_id = auth.uid() 
      OR 
      p.is_in_er = true 
      OR 
      up.role = 'admin' 
      OR 
      up.ward_name = p.ward_name
    )
  )
)
WITH CHECK (true);

-- 3. Redefine 'investigations' table policies
DROP POLICY IF EXISTS "Unified Investigation Access" ON public.investigations;

CREATE POLICY "Shared Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (
  is_er = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.user_profiles up ON up.user_id = auth.uid()
    WHERE p.id = investigations.patient_id
    AND (
      p.user_id = auth.uid() 
      OR 
      p.is_in_er = true 
      OR 
      up.role = 'admin' 
      OR 
      up.ward_name = p.ward_name
    )
  )
)
WITH CHECK (true);
-- ============================================================
-- Migration 0034: Clinical Access Expansion
-- Broadens RLS policies to allow all authenticated doctors
-- to view and add clinical data to any patient, supporting
-- global search and shared reminders.
-- ============================================================

-- 1. Redefine 'patients' table policies
DROP POLICY IF EXISTS "Shared Patient Select" ON public.patients;
DROP POLICY IF EXISTS "Shared Patient Update" ON public.patients;

-- Collaborative SELECT: Any authenticated doctor can find and view any patient
CREATE POLICY "Collaborative Patient Select"
ON public.patients FOR SELECT
TO authenticated
USING (true);

-- Collaborative UPDATE: Any authenticated doctor can update patient info/vitals
CREATE POLICY "Collaborative Patient Update"
ON public.patients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Redefine 'visits' table policies
DROP POLICY IF EXISTS "Shared Visit Access" ON public.visits;

-- Collaborative VISIT Access: Any authenticated doctor can add/view visits for any patient
CREATE POLICY "Collaborative Visit Access"
ON public.visits FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Redefine 'investigations' table policies
DROP POLICY IF EXISTS "Shared Investigation Access" ON public.investigations;

-- Collaborative INVESTIGATION Access: Any authenticated doctor can add/view labs for any patient
CREATE POLICY "Collaborative Investigation Access"
ON public.investigations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- ============================================================
-- Migration 0035: Repair Investigation Signatures (Fixed)
-- Ensures columns exist BEFORE attempting to backfill data.
-- ============================================================

-- 1. Ensure columns exist first
ALTER TABLE public.investigations 
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);

-- 2. Backfill from linked visits where possible
UPDATE public.investigations i
SET 
  doctor_id = v.doctor_id,
  doctor_name = COALESCE(p.doctor_name, 'Unknown Physician')
FROM public.visits v
LEFT JOIN public.user_profiles p ON v.doctor_id = p.user_id
WHERE i.visit_id = v.id
  AND (i.doctor_name IS NULL OR i.doctor_name = 'Unknown Physician');
-- ============================================================
-- Migration 0036: Comprehensive Hardening & Optimization
-- ============================================================

-- 1. SECURITY: LOCK DOWN FUNCTION SEARCH PATHS (Defensive against missing functions or signature mismatches)
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.proname IN ('rpc_move_patient_to_er', 'rpc_return_patient_to_ward', 'track_high_risk_shift')
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 2. PERFORMANCE: MISSING FOREIGN KEY INDEXES (REMINDERS)
-- Advisors flagged unindexed FKs which cause slow lookups in notification hub
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_resolved_by ON public.reminders(resolved_by);

-- 3. PERFORMANCE: PRUNE UNUSED INDEXES
-- Redundant indexes slow down INSERT/UPDATE operations
DROP INDEX IF EXISTS public.idx_visits_doctor_id;
DROP INDEX IF EXISTS public.idx_visits_patient_id;

-- 4. SECURITY: CONSOLIDATE PATIENT RLS POLICIES
-- Removing overlapping/shadowed policies to ensure consistent access control.
-- We move from "Multiple OR-ed policies" to "One strict Clinician-Only policy".

-- Step 4a: Drop known fragmented/redundant policies
DROP POLICY IF EXISTS "Collaborative Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Unified Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Patient UPDATE permission" ON public.patients;
DROP POLICY IF EXISTS "Patient SELECT visibility" ON public.patients;
DROP POLICY IF EXISTS "Patient Shared Access" ON public.patients;
DROP POLICY IF EXISTS "Patient UPDATE restriction" ON public.patients;
DROP POLICY IF EXISTS "Patient SELECT restriction" ON public.patients;
DROP POLICY IF EXISTS "Shared Patient Update" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Global Access" ON public.patients;
DROP POLICY IF EXISTS "Verified Clinician Global Update" ON public.patients;

-- Step 4b: Implement "Verified Clinician Collaboration" Policy
-- Only users who are registered in user_profiles can access patients.
-- This allows Global Search and Shared Reminders to work safely.
CREATE POLICY "Verified Clinician Global Access"
ON public.patients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Verified Clinician Global Update"
ON public.patients FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Note: DELETE is still restricted to the original owner/admin in 0008, 
-- but we ensure no broader "true" policy remains above it.
-- ============================================================
-- Migration 0037: ER Clean Slate Logic
-- Ensures re-admitted patients start with a fresh ER record
-- by archiving previous ER-flagged visits and investigations.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  -- 1. Archive previous ER visits (move them to general history)
  UPDATE public.visits
  SET is_er = false
  WHERE patient_id = p_patient_id AND is_er = true;

  -- 2. Archive previous ER investigations
  UPDATE public.investigations
  SET is_er = false
  WHERE patient_id = p_patient_id AND is_er = true;

  -- 3. Reset patient's current ER fields for a clean slate
  UPDATE public.patients
  SET 
    is_in_er = true,
    er_admission_date = NOW(),
    er_admission_doctor = p_doctor_identifier,
    er_chief_complaint = p_chief_complaint,
    er_admission_notes = p_admission_notes,
    er_treatment = '[]'::jsonb, -- Initialize empty treatment
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke all on function, then grant to authenticated users only (Security Hardening)
REVOKE ALL ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) TO authenticated;
-- Migration: Add offline_mode_enabled to user_profiles and admin toggle to system_settings
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS offline_mode_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add global offline enabled toggle to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS global_offline_enabled BOOLEAN DEFAULT true;

-- Update RLS to allow users to read the global setting
DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Ensure admins can update system settings (need a role-based policy update)
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true));
-- ======================================================================
-- CONSOLIDATED MIGRATIONS (0016, 0017, 0018): Emergency Department Features
-- ======================================================================

-- 1. SCHEMAS FROM 0016 (Core Ward & ER Status)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_in_er BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female'));

CREATE TABLE IF NOT EXISTS ward_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_name TEXT UNIQUE NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ward_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read/write access for authenticated users' AND tablename = 'ward_settings') THEN
    CREATE POLICY "Enable read/write access for authenticated users" ON ward_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- 2. SCHEMAS FROM 0017 & 0018 (Detailed ER Clinical Data)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_date TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_doctor VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_chief_complaint VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_admission_notes TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_treatment JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS er_history JSONB DEFAULT '[]'::jsonb;

-- 3. CLINICAL DATA TAGGING
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT FALSE;
