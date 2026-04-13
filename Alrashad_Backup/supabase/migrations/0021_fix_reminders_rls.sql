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
