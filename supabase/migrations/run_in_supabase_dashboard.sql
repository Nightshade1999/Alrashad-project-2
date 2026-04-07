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
