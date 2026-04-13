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
