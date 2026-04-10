-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: CONSOLIDATED SCHEMA (OPTIMIZED)
-- Implementation: Helper Functions + Recursive-Safe RLS
-- ============================================================

-- 0. CORE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0.1 SCHEMA SYNCHRONIZATION (Ensures all columns exist in all tables)
DO $$ 
BEGIN
    -- user_profiles fixes (Nuclear Defaults to prevent trigger crashes)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ward_name TEXT DEFAULT 'Unassigned';
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS accessible_wards TEXT[] DEFAULT '{}'::text[];
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS offline_mode_enabled BOOLEAN DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS can_see_ward_patients BOOLEAN DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS doctor_name TEXT;
        
        -- Force re-applying defaults to existing columns
        ALTER TABLE public.user_profiles ALTER COLUMN ward_name SET DEFAULT 'Unassigned';
        ALTER TABLE public.user_profiles ALTER COLUMN accessible_wards SET DEFAULT '{}'::text[];
        ALTER TABLE public.user_profiles ALTER COLUMN ai_enabled SET DEFAULT true;
        ALTER TABLE public.user_profiles ALTER COLUMN offline_mode_enabled SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN can_see_ward_patients SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN is_admin SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'user';
        ALTER TABLE public.user_profiles ALTER COLUMN specialty SET DEFAULT 'psychiatry';
    END IF;

    -- patients fixes (Comprehensive alignment with latest frontend types)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients') THEN
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ward_name TEXT NOT NULL DEFAULT 'General Ward';
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_in_er BOOLEAN DEFAULT false;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS er_treatment JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS education_level TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS mother_name TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_record_number TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS psychological_diagnosis TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relative_status TEXT DEFAULT 'Unknown';
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relative_visits TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_death DATE;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS cause_of_death TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ;
        
        -- Handle terminology migration (education -> education_level)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='education') THEN
            UPDATE public.patients SET education_level = education WHERE education_level IS NULL;
        END IF;

        -- Initialize last_activity_at if missing
        UPDATE public.patients SET last_activity_at = COALESCE(er_admission_date, created_at) WHERE last_activity_at IS NULL;
    END IF;

    -- visits fixes (Vital signs terminology sync)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') THEN
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT false;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS bp_sys INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS bp_dia INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS pr INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS spo2 INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS temp NUMERIC;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_conscious BOOLEAN DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_oriented BOOLEAN DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_ambulatory BOOLEAN DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_dyspnic BOOLEAN DEFAULT false;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_soft_abdomen BOOLEAN DEFAULT true;

        -- Terminology migration
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='bp_systolic') THEN
            UPDATE public.visits SET bp_sys = bp_systolic WHERE bp_sys IS NULL;
        END IF;
    END IF;

    -- investigations fixes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investigations') THEN
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS is_er BOOLEAN DEFAULT false;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS serology JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS tg NUMERIC;
        
        -- Terminology migration
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investigations' AND column_name='triglycerides') THEN
            UPDATE public.investigations SET tg = triglycerides WHERE tg IS NULL;
        END IF;
    END IF;

    -- reminders fixes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminders') THEN
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 1. TRIGGER FUNCTIONS

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- 2. CREATE TABLE DEFINITIONS
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ward_name TEXT DEFAULT 'Unassigned',
    specialty TEXT DEFAULT 'psychiatry',
    gender TEXT,
    doctor_name TEXT,
    is_admin BOOLEAN DEFAULT false,
    ai_enabled BOOLEAN DEFAULT true,
    offline_mode_enabled BOOLEAN DEFAULT false,
    can_see_ward_patients BOOLEAN DEFAULT false,
    accessible_wards TEXT[] DEFAULT '{}'::text[],
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. IDENTITY & AUTH TRIGGERS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, specialty, ward_name, is_admin)
  VALUES (new.id, 'user', 'psychiatry', 'Unassigned', false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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
    age INTEGER,
    gender TEXT NOT NULL,
    ward_name TEXT NOT NULL DEFAULT 'General Ward',
    room_number TEXT,
    category TEXT NOT NULL DEFAULT 'Normal',
    province TEXT,
    education_level TEXT,
    mother_name TEXT,
    medical_record_number TEXT,
    psychological_diagnosis TEXT,
    relative_status TEXT DEFAULT 'Unknown',
    relative_visits TEXT,
    date_of_death DATE,
    cause_of_death TEXT,
    admission_date TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    
    -- Clinical Arrays (Optimized for PWA)
    past_surgeries TEXT[] DEFAULT '{}',
    chronic_diseases JSONB DEFAULT '[]'::jsonb,
    psych_drugs JSONB DEFAULT '[]'::jsonb,
    medical_drugs JSONB DEFAULT '[]'::jsonb,
    allergies TEXT[] DEFAULT '{}',
    
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
    
    -- Vitals (Synced with frontend types)
    bp_sys INTEGER,
    bp_dia INTEGER,
    pr INTEGER,
    spo2 INTEGER,
    temp NUMERIC,
    
    -- Clinical Status
    is_conscious BOOLEAN DEFAULT true,
    is_oriented BOOLEAN DEFAULT true,
    is_ambulatory BOOLEAN DEFAULT true,
    is_dyspnic BOOLEAN DEFAULT false,
    is_soft_abdomen BOOLEAN DEFAULT true,
    
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
    tg NUMERIC,
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
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated At triggers
CREATE OR REPLACE FUNCTION create_update_trigger(tbl_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', tbl_name, tbl_name);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl_name, tbl_name);
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    PERFORM create_update_trigger('user_profiles');
    PERFORM create_update_trigger('patients');
    PERFORM create_update_trigger('visits');
    PERFORM create_update_trigger('investigations');
    PERFORM create_update_trigger('reminders');
END $$;

-- 4. RLS HELPER FUNCTIONS (Critical for Performance & Stability)
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT AS $$
  -- SECURITY DEFINER bypasses RLS to prevent infinite recursion
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_get_user_ward()
RETURNS TEXT AS $$
  SELECT ward_name FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. ROW LEVEL SECURITY (HARDENED - WARD RESTRICTED)

DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ward_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop all existing policies before recreating to ensure a clean slate
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- User Profiles: Self-read, Self-update, Admin All
CREATE POLICY "Profiles_Self_Access" ON public.user_profiles 
FOR ALL TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin');

-- Ward Settings: Authenticated Read, Admin Write
CREATE POLICY "Settings_Read" ON public.ward_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings_Admin" ON public.ward_settings FOR ALL TO authenticated USING ((SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin');

-- Patient ACCESS: Hardened Permission-Based
--   A) User is the owner (creator) of the record
--   B) User is an administrator
--   C) User is in the same ward AND has 'can_see_ward_patients' enabled
--   D) User belongs to 'Master Ward'
CREATE POLICY "Patient_Hardened_Access" ON public.patients 
FOR ALL TO authenticated USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND (
            role = 'admin' 
            OR ward_name = 'Master Ward'
            OR (ward_name = patients.ward_name AND can_see_ward_patients = true)
            OR patients.ward_name = ANY(accessible_wards) -- Support for multi-ward access
        )
    )
);

-- Visits & Investigations: Access inherited from Patient access
CREATE POLICY "Visits_Inherited_Access" ON public.visits 
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id)
);

CREATE POLICY "Investigations_Inherited_Access" ON public.investigations 
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id)
);

-- Reminders: Global visibility for coordination within medical team
CREATE POLICY "Reminders_Team_Access" ON public.reminders 
FOR ALL TO authenticated USING (true);

-- System Settings: Read all, Write admin
CREATE POLICY "System_Settings_Read" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "System_Settings_Admin" ON public.system_settings FOR ALL TO authenticated USING ((SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin');

-- 6. INDICES (OPTIMIZATION)
CREATE INDEX IF NOT EXISTS idx_patients_ward ON public.patients(ward_name);
CREATE INDEX IF NOT EXISTS idx_patients_er ON public.patients(is_in_er);
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON public.visits(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_patient_date ON public.investigations(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON public.reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(is_resolved);

-- 7. RPC FUNCTIONS

-- Move to ER
CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
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

-- Bulk Migration
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
-- 5. CLINICAL ACTIVITY TRIGGERS
-- Automatically update patient's last_activity_at column when clinical events occur
CREATE OR REPLACE FUNCTION public.fn_update_patient_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patients
  SET last_activity_at = COALESCE(NEW.visit_date, NEW.date, NOW())
  WHERE id = NEW.patient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_patient_activity_on_visit ON public.visits;
CREATE TRIGGER tr_update_patient_activity_on_visit
  AFTER INSERT OR UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_patient_last_activity();

DROP TRIGGER IF EXISTS tr_update_patient_activity_on_investigation ON public.investigations;
CREATE TRIGGER tr_update_patient_activity_on_investigation
  AFTER INSERT OR UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_patient_last_activity();
