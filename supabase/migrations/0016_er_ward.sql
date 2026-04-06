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
