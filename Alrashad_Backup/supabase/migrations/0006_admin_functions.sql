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
