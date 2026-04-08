-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: CONSOLIDATED SCHEMA (UNIFIED)
-- This file represents the canonical state of the database.
-- ============================================================

-- 0. CORE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRIGGER FUNCTIONS

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Handle user profile creation on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, specialty, gender)
  VALUES (new.id, 'user', 'psychiatry', null);
  RETURN new;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- 2. CORE TABLES

-- User Profiles (Extended user data)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    ward_name TEXT DEFAULT 'Unassigned',
    specialty TEXT DEFAULT 'psychiatry',
    gender TEXT,
    ai_enabled BOOLEAN DEFAULT true,
    offline_mode_enabled BOOLEAN DEFAULT false,
    can_see_ward_patients BOOLEAN DEFAULT false,
    accessible_wards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ward Settings (Institutional configuration)
CREATE TABLE IF NOT EXISTS public.ward_settings (
    ward_name TEXT PRIMARY KEY,
    gender TEXT, -- Optional: Restricts visibility to specific clinician genders
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients (Master records)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Original owner
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    ward_name TEXT NOT NULL DEFAULT 'General Ward',
    room_number TEXT,
    category TEXT NOT NULL DEFAULT 'Normal',
    province TEXT,
    education TEXT,
    past_surgeries TEXT,
    chronic_diseases TEXT,
    psych_drugs TEXT,
    medical_drugs TEXT,
    allergies TEXT,
    
    -- ER Specific Fields
    is_in_er BOOLEAN DEFAULT false,
    er_admission_date TIMESTAMPTZ,
    er_admission_doctor TEXT,
    er_chief_complaint TEXT,
    er_admission_notes TEXT,
    er_treatment JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits (Clinical encounters)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name TEXT, -- Captures signature at time of visit
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    exam_notes TEXT NOT NULL,
    is_er BOOLEAN DEFAULT false,
    
    -- Vitals
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse INTEGER,
    resp_rate INTEGER,
    temp NUMERIC(3,1),
    saturation INTEGER,
    weight INTEGER,
    glucose INTEGER,
    pain_score INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Laboratory Investigations
CREATE TABLE IF NOT EXISTS public.investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    is_er BOOLEAN DEFAULT false,
    
    -- WBC & RBC
    wbc NUMERIC,
    hb NUMERIC,
    hct NUMERIC,
    plt NUMERIC,
    
    -- Renal & Liver
    s_urea NUMERIC,
    s_creatinine NUMERIC,
    ast NUMERIC,
    alt NUMERIC,
    tsb NUMERIC,
    
    -- Glucose & Metabolic
    hba1c NUMERIC,
    rbs NUMERIC,
    serum_iron NUMERIC,
    ferritin NUMERIC,
    
    -- Lipid Profile
    cholesterol NUMERIC,
    triglycerides NUMERIC,
    hdl NUMERIC,
    ldl NUMERIC,
    
    -- Inflammatory & Other
    esr NUMERIC,
    crp TEXT,
    serology JSONB DEFAULT '{}'::jsonb, -- Store VDRL, HBsAg, etc
    other_tests TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders & Tasks
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    due_date TIMESTAMPTZ,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings (Institutional global flags)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton
    global_offline_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRIGGERS
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated At triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON investigations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RPC FUNCTIONS

-- Move to ER (Clean slate readmission)
CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Archive previous ER records
  UPDATE public.visits SET is_er = false WHERE patient_id = p_patient_id AND is_er = true;
  UPDATE public.investigations SET is_er = false WHERE patient_id = p_patient_id AND is_er = true;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Return to Ward
CREATE OR REPLACE FUNCTION public.rpc_return_patient_to_ward(p_patient_id UUID, p_ward_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.patients
  SET is_in_er = false, ward_name = p_ward_name, updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bulk Migration (Admin Tool)
CREATE OR REPLACE FUNCTION public.migrate_patients(from_user UUID, to_user UUID)
RETURNS INTEGER AS $$
DECLARE
  m_count INTEGER;
BEGIN
  UPDATE public.patients SET user_id = to_user WHERE user_id = from_user;
  GET DIAGNOSTICS m_count = ROW_COUNT;
  RETURN m_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. ROW LEVEL SECURITY (UNIFIED)

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- User Profiles: Self-read, Self-update, Admin All
CREATE POLICY "Self Read" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Self Update" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin CRUD Profiles" ON public.user_profiles FOR ALL TO authenticated USING (
    (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Ward Settings: Authenticated Read, Admin Write
CREATE POLICY "Auth Read Settings" ON public.ward_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Write Settings" ON public.ward_settings FOR ALL TO authenticated USING (
    (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Patients: Clinician Global Access (For Search & Ward Coverage)
CREATE POLICY "Verified Clinician Access" ON public.patients FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Verified Clinician Update" ON public.patients FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Owner Admin Delete" ON public.patients FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
);
CREATE POLICY "Authenticated Insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);

-- Visits & Investigations: Access linked to Patient visibility
CREATE POLICY "Linked Patient Content Access" ON public.visits FOR ALL TO authenticated USING (
    is_er = true OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id)
);
CREATE POLICY "Linked Patient Investigation Access" ON public.investigations FOR ALL TO authenticated USING (
    is_er = true OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id)
);

-- Reminders: Global visibility for clinicians (Coordination)
CREATE POLICY "Clinician Reminder Access" ON public.reminders FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid())
);

-- 6. INDICES (OPTMIZATION)
CREATE INDEX IF NOT EXISTS idx_patients_ward ON public.patients(ward_name);
CREATE INDEX IF NOT EXISTS idx_patients_er ON public.patients(is_in_er);
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON public.visits(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_patient_date ON public.investigations(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(is_resolved);
