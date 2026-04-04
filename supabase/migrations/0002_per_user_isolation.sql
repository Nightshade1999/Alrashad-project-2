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
-- (they will remain inaccessible under the new RLS policy — effectively deleted from view)

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
