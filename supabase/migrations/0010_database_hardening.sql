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
