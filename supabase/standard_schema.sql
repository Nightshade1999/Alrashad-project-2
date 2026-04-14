-- ============================================================
-- AL RASHAD CLINICAL SYSTEM: CONSOLIDATED SCHEMA (CORRECTED)
-- Version: 2.1 — April 2026
-- Fixes Applied:
--   • system_settings missing CREATE TABLE statement
--   • Duplicate auth trigger (on_auth_user_created removed)
--   • syncWardSettings filter reassignment pattern documented
-- ============================================================

-- 0. CORE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 0.1 SCHEMA SYNCHRONIZATION
-- Ensures all required columns exist on already-deployed tables.
-- Safe to run on an existing database — all statements are
-- ADD COLUMN IF NOT EXISTS so nothing is dropped.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    -- user_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ward_name              TEXT          DEFAULT 'Unassigned';
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS accessible_wards       TEXT[]        DEFAULT '{}'::text[];
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ai_enabled             BOOLEAN       DEFAULT true;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS offline_mode_enabled   BOOLEAN       DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS can_see_ward_patients  BOOLEAN       DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin               BOOLEAN       DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS doctor_name            TEXT;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS nurse_name             TEXT;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS lab_tech_name          TEXT;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS pharmacist_name        TEXT;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_name_fixed          BOOLEAN       DEFAULT false;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS default_password       TEXT;

        -- Re-apply defaults to existing rows
        ALTER TABLE public.user_profiles ALTER COLUMN ward_name             SET DEFAULT 'Unassigned';
        ALTER TABLE public.user_profiles ALTER COLUMN accessible_wards      SET DEFAULT '{}'::text[];
        ALTER TABLE public.user_profiles ALTER COLUMN ai_enabled            SET DEFAULT true;
        ALTER TABLE public.user_profiles ALTER COLUMN offline_mode_enabled  SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN can_see_ward_patients SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN is_admin              SET DEFAULT false;
        ALTER TABLE public.user_profiles ALTER COLUMN role                  SET DEFAULT 'doctor';
        ALTER TABLE public.user_profiles ALTER COLUMN specialty             SET DEFAULT 'psychiatry';
    END IF;

    -- patients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients') THEN
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ward_name                   TEXT          NOT NULL DEFAULT 'General Ward';
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_in_er                   BOOLEAN       DEFAULT false;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS er_treatment               JSONB         DEFAULT '[]'::jsonb;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_activity_at           TIMESTAMPTZ;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS education_level            TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS mother_name               TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_record_number     TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS psychological_diagnosis   TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relative_status           TEXT          DEFAULT 'Unknown';
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relative_visits           TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_death             DATE;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS cause_of_death            TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS admission_date            TIMESTAMPTZ;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS previous_category         TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS er_history               JSONB         DEFAULT '[]'::jsonb;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS er_treatment_last_edit_by TEXT;
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS er_treatment_last_edit_at TIMESTAMPTZ;

        -- Migrate old column name if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'education') THEN
            UPDATE public.patients SET education_level = education WHERE education_level IS NULL;
        END IF;

        -- Back-fill last_activity_at
        UPDATE public.patients
        SET last_activity_at = COALESCE(er_admission_date, created_at)
        WHERE last_activity_at IS NULL;
    END IF;

    -- visits
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') THEN
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_er            BOOLEAN   DEFAULT false;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS bp_sys           INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS bp_dia           INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS pr               INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS rr               INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS spo2             INTEGER;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS temp             NUMERIC;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_conscious     BOOLEAN   DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_oriented      BOOLEAN   DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_ambulatory    BOOLEAN   DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_dyspnic       BOOLEAN   DEFAULT false;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_soft_abdomen  BOOLEAN   DEFAULT true;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_psych_note    BOOLEAN   DEFAULT false;
        ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS created_by_role  TEXT      DEFAULT 'doctor';

        -- Migrate old column name if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'bp_systolic') THEN
            UPDATE public.visits SET bp_sys = bp_systolic WHERE bp_sys IS NULL;
        END IF;
    END IF;

    -- investigations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investigations') THEN
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS is_er             BOOLEAN   DEFAULT false;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS serology          JSONB     DEFAULT '{}'::jsonb;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS tg               NUMERIC;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS ldl              NUMERIC;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS hdl              NUMERIC;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS cholesterol      NUMERIC;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS lab_tech_name    TEXT;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS created_by_role  TEXT      DEFAULT 'lab_tech';
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS other_labs       JSONB     DEFAULT '[]'::jsonb;
        ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS gue              JSONB     DEFAULT '{}'::jsonb;

        -- Migrate old column name
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investigations' AND column_name = 'triglycerides') THEN
            UPDATE public.investigations SET tg = triglycerides WHERE tg IS NULL;
        END IF;
    END IF;

    -- reminders (fix stale column names — is_resolved, due_date were removed)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminders') THEN
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notes               TEXT;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS reminder_date       DATE;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS target_specialty    TEXT;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS target_gender       TEXT;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS status              TEXT    DEFAULT 'pending';
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS created_by_name     TEXT;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS resolved_by         UUID    REFERENCES auth.users(id) ON DELETE SET NULL;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS resolved_by_name    TEXT;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMPTZ;
        ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS resolve_notes       TEXT;
    END IF;

    -- nurse_instructions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nurse_instructions') THEN
        ALTER TABLE public.nurse_instructions ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.nurse_instructions(id);
    END IF;

END $$;


-- ─────────────────────────────────────────────────────────────
-- 1. SHARED TRIGGER FUNCTION: updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SET search_path = public;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE DEFINITIONS
-- All tables use CREATE TABLE IF NOT EXISTS for idempotency.
-- ─────────────────────────────────────────────────────────────

-- User Profiles (maps auth.users → clinical roles)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role                   TEXT        NOT NULL DEFAULT 'doctor',
    specialty              TEXT        DEFAULT 'psychiatry',
    gender                 TEXT,
    ward_name              TEXT        DEFAULT 'Unassigned',
    accessible_wards       TEXT[]      DEFAULT '{}'::text[],
    doctor_name            TEXT,
    nurse_name             TEXT,
    lab_tech_name          TEXT,
    pharmacist_name        TEXT,
    is_admin               BOOLEAN     DEFAULT false,
    ai_enabled             BOOLEAN     DEFAULT true,
    offline_mode_enabled   BOOLEAN     DEFAULT false,
    can_see_ward_patients  BOOLEAN     DEFAULT false,
    is_name_fixed          BOOLEAN     DEFAULT false,
    default_password       TEXT,       -- Admin reset convenience; treat as low-sensitivity
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Ward Settings (Institutional ward configuration)
CREATE TABLE IF NOT EXISTS public.ward_settings (
    ward_name   TEXT PRIMARY KEY,
    gender      TEXT,               -- Optional: restricts to specific clinician gender
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Patients (Master clinical records)
CREATE TABLE IF NOT EXISTS public.patients (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    name                        TEXT        NOT NULL,
    age                         INTEGER,
    gender                      TEXT        NOT NULL,
    ward_name                   TEXT        NOT NULL DEFAULT 'General Ward',
    room_number                 TEXT,
    category                    TEXT        NOT NULL DEFAULT 'Normal',
    province                    TEXT,
    education_level             TEXT,
    mother_name                 TEXT,
    medical_record_number       TEXT,
    psychological_diagnosis     TEXT,
    relative_status             TEXT        DEFAULT 'Unknown',
    relative_visits             TEXT,
    date_of_death               DATE,
    cause_of_death              TEXT,
    admission_date              TIMESTAMPTZ,
    last_activity_at            TIMESTAMPTZ,
    previous_category           TEXT,

    -- Psychiatric audit
    psych_last_edit_by          TEXT,
    psych_last_edit_at          TIMESTAMPTZ,

    -- ER Treatment audit
    er_treatment_last_edit_by   TEXT,
    er_treatment_last_edit_at   TIMESTAMPTZ,

    -- Referral status
    is_referred                 BOOLEAN     DEFAULT false,
    referral_hospital           TEXT,
    referral_date               DATE,

    -- Clinical arrays
    past_surgeries              TEXT[]      DEFAULT '{}',
    chronic_diseases            JSONB       DEFAULT '[]'::jsonb,
    psych_drugs                 JSONB       DEFAULT '[]'::jsonb,
    medical_drugs               JSONB       DEFAULT '[]'::jsonb,
    allergies                   TEXT[]      DEFAULT '{}',

    -- ER-specific fields
    is_in_er                    BOOLEAN     DEFAULT false,
    er_admission_date           TIMESTAMPTZ,
    er_admission_doctor         TEXT,
    er_chief_complaint          TEXT,
    er_admission_notes          TEXT,
    er_treatment                JSONB       DEFAULT '[]'::jsonb,
    er_history                  JSONB       DEFAULT '[]'::jsonb,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Visits (doctor encounters, nurse vitals)
CREATE TABLE IF NOT EXISTS public.visits (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name     TEXT,
    visit_date      TIMESTAMPTZ DEFAULT NOW(),
    exam_notes      TEXT        NOT NULL DEFAULT '',
    is_er           BOOLEAN     DEFAULT false,
    is_psych_note   BOOLEAN     DEFAULT false,

    -- Vitals
    bp_sys          INTEGER,
    bp_dia          INTEGER,
    pr              INTEGER,
    rr              INTEGER,
    spo2            INTEGER,
    temp            NUMERIC,

    -- Clinical status flags
    is_conscious    BOOLEAN     DEFAULT true,
    is_oriented     BOOLEAN     DEFAULT true,
    is_ambulatory   BOOLEAN     DEFAULT true,
    is_dyspnic      BOOLEAN     DEFAULT false,
    is_soft_abdomen BOOLEAN     DEFAULT true,

    -- Role audit
    created_by_role TEXT        DEFAULT 'doctor',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Laboratory Investigations
CREATE TABLE IF NOT EXISTS public.investigations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_id        UUID        REFERENCES public.visits(id) ON DELETE SET NULL,
    doctor_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name     TEXT,
    lab_tech_name   TEXT,
    date            TIMESTAMPTZ DEFAULT NOW(),
    is_er           BOOLEAN     DEFAULT false,
    is_critical     BOOLEAN     DEFAULT false,
    created_by_role TEXT        DEFAULT 'lab_tech',

    -- Haematology
    wbc             NUMERIC,
    hb              NUMERIC,
    hct             NUMERIC,
    plt             NUMERIC,

    -- Renal & Liver
    s_urea          NUMERIC,
    s_creatinine    NUMERIC,
    ast             NUMERIC,
    alt             NUMERIC,
    alp             NUMERIC,
    tsb             NUMERIC,

    -- Glucose & Metabolic
    hba1c           NUMERIC,
    rbs             NUMERIC,
    serum_iron      NUMERIC,
    ferritin        NUMERIC,

    -- Lipid Profile
    cholesterol     NUMERIC,
    tg              NUMERIC,
    hdl             NUMERIC,
    ldl             NUMERIC,

    -- Electrolytes
    ka              NUMERIC,
    na              NUMERIC,
    cl              NUMERIC,
    ca              NUMERIC,

    -- Inflammatory
    esr             NUMERIC,
    crp             TEXT,       -- Stored as text to support qualitative values (e.g. "+", "++")

    -- Structured / JSONB fields
    serology        JSONB       DEFAULT '{}'::jsonb,   -- VDRL, HBsAg, Anti-HCV, etc.
    gue             JSONB       DEFAULT '{}'::jsonb,   -- General Urine Exam
    other_labs      JSONB       DEFAULT '[]'::jsonb,   -- Custom named lab values

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders & Clinical Tasks
CREATE TABLE IF NOT EXISTS public.reminders (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name   TEXT,
    notes             TEXT        NOT NULL DEFAULT '',
    reminder_date     DATE        NOT NULL,
    target_specialty  TEXT        NOT NULL DEFAULT 'psychiatry',
    target_gender     TEXT,
    status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'resolved', 'rescheduled')),
    resolve_notes     TEXT,
    resolved_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by_name  TEXT,
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id            UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
    investigation_id      UUID        REFERENCES public.investigations(id) ON DELETE CASCADE,
    message               TEXT        NOT NULL,
    is_read               BOOLEAN     DEFAULT false,
    read_at               TIMESTAMPTZ,
    read_by_doctor_name   TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Reference Ranges (configurable normal values)
CREATE TABLE IF NOT EXISTS public.lab_reference_ranges (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT        UNIQUE NOT NULL,
    label       TEXT        NOT NULL,
    min_value   NUMERIC,
    max_value   NUMERIC,
    unit        TEXT,
    category    TEXT        DEFAULT 'General',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Clinical Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                  UUID        REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id                   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    destination                 TEXT        NOT NULL,
    department                  TEXT,
    companion_name              TEXT,
    indications                 TEXT,
    chief_complaint             TEXT,
    history_of_present_illness  TEXT,
    relevant_examination        TEXT,
    treatment_taken             TEXT,
    investigations_text         TEXT,

    -- Immutable snapshots at time of referral
    vitals_snapshot             JSONB       DEFAULT '{}'::jsonb,
    chronic_hx_snapshot         JSONB       DEFAULT '{}'::jsonb,
    investigations_snapshot     JSONB       DEFAULT '{}'::jsonb,
    er_treatment_snapshot       JSONB       DEFAULT '[]'::jsonb,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Nurse Instructions (live clinical orders)
CREATE TABLE IF NOT EXISTS public.nurse_instructions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    ward_name           TEXT        NOT NULL,
    instruction         TEXT        NOT NULL,
    instruction_type    TEXT        DEFAULT 'single'
                                    CHECK (instruction_type IN ('single', 'repetitive')),
    duration_days       INTEGER,
    expires_at          TIMESTAMPTZ,
    doctor_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name         TEXT,

    -- Acknowledgment
    is_read             BOOLEAN     DEFAULT false,
    read_at             TIMESTAMPTZ,
    read_by_nurse_name  TEXT,
    read_by_nurse_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledgments     JSONB       DEFAULT '[]'::jsonb,

    -- Versioning
    is_archived         BOOLEAN     DEFAULT false,
    parent_id           UUID        REFERENCES public.nurse_instructions(id),

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Pharmacy Inventory
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    scientific_name       TEXT        NOT NULL,
    generic_name          TEXT,
    dosage                TEXT,
    formulation           TEXT,
    mode_of_administration TEXT,
    expiration_date       DATE,
    quantity              INTEGER     DEFAULT 0,
    min_stock_level       INTEGER     DEFAULT 10,
    batch_number          TEXT,
    manufacturer          TEXT,
    price                 NUMERIC,
    pharmacist_name       TEXT,
    gudea_id              TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- FIX #1: system_settings was previously missing CREATE TABLE
-- This was a critical SQL syntax error in the old schema.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
    id                      INTEGER     PRIMARY KEY CHECK (id = 1), -- Singleton row
    global_offline_enabled  BOOLEAN     DEFAULT true,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure singleton row exists
INSERT INTO public.system_settings (id, global_offline_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- Recycle Bin (soft-delete log)
CREATE TABLE IF NOT EXISTS public.trash (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      TEXT        NOT NULL,
    data            JSONB       NOT NULL,
    original_id     UUID        NOT NULL,
    deleted_by_name TEXT,
    deleted_by_id   UUID,
    deleted_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW())
);


-- ─────────────────────────────────────────────────────────────
-- 3. AUTH TRIGGER
-- FIX #2: Old schema had TWO triggers (on_auth_user_created AND
-- tr_on_auth_user_created). We now only create ONE, idempotently.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role, specialty, ward_name, is_admin)
    VALUES (NEW.id, 'doctor', 'psychiatry', 'Unassigned', false)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Drop BOTH old trigger names to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;

-- Create a single canonical trigger
CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 4. UPDATED_AT TRIGGERS (all tables)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_update_trigger(tbl_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I',
        tbl_name, tbl_name
    );
    EXECUTE format(
        'CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        tbl_name, tbl_name
    );
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    PERFORM public.create_update_trigger('user_profiles');
    PERFORM public.create_update_trigger('patients');
    PERFORM public.create_update_trigger('visits');
    PERFORM public.create_update_trigger('investigations');
    PERFORM public.create_update_trigger('reminders');
    PERFORM public.create_update_trigger('referrals');
    PERFORM public.create_update_trigger('pharmacy_inventory');
    PERFORM public.create_update_trigger('nurse_instructions');
    PERFORM public.create_update_trigger('system_settings');
END $$;


-- ─────────────────────────────────────────────────────────────
-- 5. RECYCLE BIN TRIGGER
-- Moves deleted rows into public.trash before deletion.
-- Actor name is captured from user_profiles at delete time.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.proc_move_to_trash()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
BEGIN
    SELECT COALESCE(doctor_name, nurse_name, lab_tech_name, pharmacist_name, 'System/Unidentified')
    INTO v_actor_name
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    INSERT INTO public.trash (table_name, data, original_id, deleted_by_id, deleted_by_name)
    VALUES (TG_TABLE_NAME, to_jsonb(OLD), OLD.id, auth.uid(), v_actor_name);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS tr_trash_patients            ON public.patients;
    CREATE TRIGGER tr_trash_patients
        BEFORE DELETE ON public.patients
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_visits              ON public.visits;
    CREATE TRIGGER tr_trash_visits
        BEFORE DELETE ON public.visits
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_investigations      ON public.investigations;
    CREATE TRIGGER tr_trash_investigations
        BEFORE DELETE ON public.investigations
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_reminders           ON public.reminders;
    CREATE TRIGGER tr_trash_reminders
        BEFORE DELETE ON public.reminders
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_referrals           ON public.referrals;
    CREATE TRIGGER tr_trash_referrals
        BEFORE DELETE ON public.referrals
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_nurse_instructions  ON public.nurse_instructions;
    CREATE TRIGGER tr_trash_nurse_instructions
        BEFORE DELETE ON public.nurse_instructions
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

    DROP TRIGGER IF EXISTS tr_trash_pharmacy_inventory  ON public.pharmacy_inventory;
    CREATE TRIGGER tr_trash_pharmacy_inventory
        BEFORE DELETE ON public.pharmacy_inventory
        FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();
END $$;


-- ─────────────────────────────────────────────────────────────
-- 6. CLINICAL ACTIVITY TRIGGERS
-- Automatically update patients.last_activity_at when a visit
-- or investigation is inserted or updated.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_patient_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.patients
    SET last_activity_at = COALESCE(NEW.visit_date, NEW.date, NOW())
    WHERE id = NEW.patient_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_update_patient_activity_on_visit ON public.visits;
CREATE TRIGGER tr_update_patient_activity_on_visit
    AFTER INSERT OR UPDATE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_patient_last_activity();

DROP TRIGGER IF EXISTS tr_update_patient_activity_on_investigation ON public.investigations;
CREATE TRIGGER tr_update_patient_activity_on_investigation
    AFTER INSERT OR UPDATE ON public.investigations
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_patient_last_activity();


-- ─────────────────────────────────────────────────────────────
-- 7. RLS HELPER FUNCTIONS
-- SECURITY DEFINER so they bypass RLS and avoid infinite
-- recursion when called inside RLS policies.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(role = 'admin' OR is_admin = true, false)
    FROM public.user_profiles
    WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_get_user_ward_info()
RETURNS TABLE(ward_name TEXT, can_see_ward_patients BOOLEAN, accessible_wards TEXT[]) AS $$
    SELECT ward_name, can_see_ward_patients, accessible_wards
    FROM public.user_profiles
    WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ward_settings       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.patients            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.visits              ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.investigations      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.reminders           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pharmacy_inventory  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.system_settings     ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.lab_reference_ranges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.nurse_instructions  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.trash               ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop ALL existing policies for a clean slate
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ── User Profiles ──────────────────────────────────────────────
-- Each user sees/edits only their own profile; admins see all.
CREATE POLICY "Profiles_Self_Access" ON public.user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.fn_is_admin());

-- ── Ward Settings ──────────────────────────────────────────────
CREATE POLICY "Settings_Read"  ON public.ward_settings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings_Admin" ON public.ward_settings
    FOR ALL    TO authenticated USING (public.fn_is_admin());

-- ── Patients ────────────────────────────────────────────────────
-- Doctors own their patients; ward colleagues can see same-ward
-- patients; admins see all.
CREATE POLICY "Patient_Hardened_Access" ON public.patients
    FOR ALL TO authenticated USING (
        auth.uid() = user_id
        OR public.fn_is_admin()
        OR EXISTS (
            SELECT 1 FROM public.fn_get_user_ward_info() i
            WHERE LOWER(REPLACE(i.ward_name, ' ', '')) = 'masterward'
            OR (
                LOWER(REPLACE(i.ward_name, ' ', '')) = LOWER(REPLACE(patients.ward_name, ' ', ''))
                AND i.can_see_ward_patients = true
            )
            OR EXISTS (
                SELECT 1 FROM unnest(i.accessible_wards) aw
                WHERE LOWER(REPLACE(aw, ' ', '')) = LOWER(REPLACE(patients.ward_name, ' ', ''))
            )
        )
    );

-- Lab Techs can search/select all patients for filing results
CREATE POLICY "Patient_Lab_Global_Search" ON public.patients
    FOR SELECT TO authenticated
    USING (public.fn_get_user_role() = 'lab_tech');

-- ── Visits ──────────────────────────────────────────────────────
-- Access is inherited: if you can see the patient, you can see visits.
CREATE POLICY "Visits_Inherited_Access" ON public.visits
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id));

-- ── Investigations ──────────────────────────────────────────────
CREATE POLICY "Investigations_Inherited_Access" ON public.investigations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id));

CREATE POLICY "Investigations_Lab_Insert" ON public.investigations
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_get_user_role() IN ('lab_tech', 'admin'));

CREATE POLICY "Investigations_Lab_Modify_24h" ON public.investigations
    FOR ALL TO authenticated
    USING (
        public.fn_get_user_role() IN ('lab_tech', 'admin')
        AND investigations.created_at > (NOW() - INTERVAL '24 hours')
    );

-- ── Reminders ───────────────────────────────────────────────────
-- Team-wide visibility; filtered in application layer by specialty.
CREATE POLICY "Reminders_Team_Access" ON public.reminders
    FOR ALL TO authenticated USING (true);

-- ── Notifications ───────────────────────────────────────────────
-- Only the recipient user can read/update their own notifications.
CREATE POLICY "Notifications_Recipient_Access" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ── Referrals ────────────────────────────────────────────────────
CREATE POLICY "Referrals_Inherited_Access" ON public.referrals
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id));

-- ── Nurse Instructions ───────────────────────────────────────────
-- All authenticated can read; only doctors/admins insert;
-- nurses can mark as read; only the issuing doctor can delete.
CREATE POLICY "Nurse_Instructions_Read" ON public.nurse_instructions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Nurse_Instructions_Insert" ON public.nurse_instructions
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_get_user_role() IN ('doctor', 'admin'));

CREATE POLICY "Nurse_Instructions_Update" ON public.nurse_instructions
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (
        (is_read = true AND public.fn_get_user_role() = 'nurse')
        OR doctor_id = auth.uid()
        OR public.fn_is_admin()
    );

CREATE POLICY "Nurse_Instructions_Delete" ON public.nurse_instructions
    FOR DELETE TO authenticated
    USING (doctor_id = auth.uid() OR public.fn_is_admin());

-- ── System Settings ──────────────────────────────────────────────
CREATE POLICY "System_Settings_Read"  ON public.system_settings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "System_Settings_Admin" ON public.system_settings
    FOR ALL    TO authenticated USING (public.fn_is_admin());

-- ── Pharmacy Inventory ───────────────────────────────────────────
CREATE POLICY "Inventory_Pharmacist_Full" ON public.pharmacy_inventory
    FOR ALL TO authenticated
    USING (public.fn_get_user_role() IN ('pharmacist', 'admin'));

CREATE POLICY "Inventory_Read_All" ON public.pharmacy_inventory
    FOR SELECT TO authenticated USING (true);

-- ── Lab Reference Ranges ─────────────────────────────────────────
CREATE POLICY "Lab_Ranges_Read"   ON public.lab_reference_ranges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lab_Ranges_Manage" ON public.lab_reference_ranges
    FOR ALL TO authenticated
    USING (public.fn_get_user_role() IN ('lab_tech', 'admin'));

-- ── Trash (admin-only restore / inspect) ─────────────────────────
CREATE POLICY "Trash_Admin_Only" ON public.trash
    FOR ALL TO authenticated USING (public.fn_is_admin());


-- ─────────────────────────────────────────────────────────────
-- 9. NOTIFICATION TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Notify doctors when a lab result is filed for their patient.
CREATE OR REPLACE FUNCTION public.fn_notify_doctors_on_lab_result()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_ward_name    TEXT;
    v_ward_clean   TEXT;
    v_tests        TEXT := '';
    v_doctor       RECORD;
BEGIN
    -- 1. Get patient info
    SELECT name, ward_name
    INTO v_patient_name, v_ward_name
    FROM public.patients
    WHERE id = NEW.patient_id;

    v_ward_clean := LOWER(REPLACE(v_ward_name, ' ', ''));

    -- 2. Build a readable test summary
    IF NEW.wbc          IS NOT NULL THEN v_tests := v_tests || 'WBC, ';         END IF;
    IF NEW.hb           IS NOT NULL THEN v_tests := v_tests || 'HB, ';          END IF;
    IF NEW.plt          IS NOT NULL THEN v_tests := v_tests || 'PLT, ';         END IF;
    IF NEW.s_urea       IS NOT NULL THEN v_tests := v_tests || 'Urea, ';        END IF;
    IF NEW.s_creatinine IS NOT NULL THEN v_tests := v_tests || 'Creatinine, ';  END IF;
    IF NEW.alt          IS NOT NULL THEN v_tests := v_tests || 'ALT, ';         END IF;
    IF NEW.ast          IS NOT NULL THEN v_tests := v_tests || 'AST, ';         END IF;
    IF NEW.alp          IS NOT NULL THEN v_tests := v_tests || 'ALP, ';         END IF;
    IF NEW.tsb          IS NOT NULL THEN v_tests := v_tests || 'TSB, ';         END IF;
    IF NEW.esr          IS NOT NULL THEN v_tests := v_tests || 'ESR, ';         END IF;
    IF NEW.crp          IS NOT NULL THEN v_tests := v_tests || 'CRP, ';         END IF;
    IF NEW.rbs          IS NOT NULL THEN v_tests := v_tests || 'RBS, ';         END IF;
    IF NEW.hba1c        IS NOT NULL THEN v_tests := v_tests || 'HbA1c, ';       END IF;

    v_tests := CASE WHEN v_tests <> ''
                    THEN '(' || RTRIM(v_tests, ', ') || ')'
                    ELSE ''
               END;

    -- 3. Notify all matching doctors / admins
    FOR v_doctor IN
        SELECT up.user_id
        FROM public.user_profiles up
        WHERE (up.role = 'doctor' OR up.role = 'admin' OR up.is_admin = true)
          AND (
              LOWER(REPLACE(up.ward_name, ' ', '')) = v_ward_clean
              OR EXISTS (
                  SELECT 1 FROM unnest(up.accessible_wards) w
                  WHERE LOWER(REPLACE(w, ' ', '')) = v_ward_clean
              )
              OR v_ward_name IS NULL
          )
    LOOP
        INSERT INTO public.notifications (user_id, patient_id, investigation_id, message)
        VALUES (
            v_doctor.user_id,
            NEW.patient_id,
            NEW.id,
            'Labs ' || (CASE WHEN TG_OP = 'UPDATE' THEN '(EDITED) ' ELSE '' END)
              || 'for ' || COALESCE(v_patient_name, 'Unknown') || ' ' || v_tests
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_investigation ON public.investigations;
CREATE TRIGGER tr_notify_on_investigation
    AFTER INSERT OR UPDATE ON public.investigations
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_doctors_on_lab_result();

-- Notify nurses when a new instruction is issued for their ward.
CREATE OR REPLACE FUNCTION public.fn_notify_nurse_hub_on_instruction()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_name TEXT;
    v_nurse        RECORD;
BEGIN
    SELECT name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;

    FOR v_nurse IN
        SELECT user_id
        FROM public.user_profiles
        WHERE (role = 'nurse' OR role = 'admin' OR is_admin = true)
          AND (
              LOWER(REPLACE(ward_name, ' ', '')) = LOWER(REPLACE(NEW.ward_name, ' ', ''))
              OR EXISTS (
                  SELECT 1 FROM unnest(accessible_wards) w
                  WHERE LOWER(REPLACE(w, ' ', '')) = LOWER(REPLACE(NEW.ward_name, ' ', ''))
              )
          )
    LOOP
        INSERT INTO public.notifications (user_id, patient_id, message)
        VALUES (
            v_nurse.user_id,
            NEW.patient_id,
            'New instruction for ' || COALESCE(v_patient_name, 'Unknown')
              || ': ' || LEFT(NEW.instruction, 60)
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_nurse_instruction ON public.nurse_instructions;
CREATE TRIGGER tr_notify_on_nurse_instruction
    AFTER INSERT ON public.nurse_instructions
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_nurse_hub_on_instruction();


-- ─────────────────────────────────────────────────────────────
-- 10. RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Move patient to ER ward
CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
    p_patient_id        UUID,
    p_doctor_identifier TEXT,
    p_chief_complaint   TEXT,
    p_admission_notes   TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Clear previous ER flags on history records
    UPDATE public.visits       SET is_er = false WHERE patient_id = p_patient_id AND is_er = true;
    UPDATE public.investigations SET is_er = false WHERE patient_id = p_patient_id AND is_er = true;

    UPDATE public.patients
    SET
        is_in_er            = true,
        er_admission_date   = NOW(),
        er_admission_doctor = p_doctor_identifier,
        er_chief_complaint  = p_chief_complaint,
        er_admission_notes  = p_admission_notes,
        er_treatment        = '[]'::jsonb,
        updated_at          = NOW()
    WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Return patient from ER to ward
CREATE OR REPLACE FUNCTION public.rpc_return_patient_to_ward(
    p_patient_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_patient public.patients%ROWTYPE;
    v_er_snapshot JSONB;
BEGIN
    SELECT * INTO v_patient FROM public.patients WHERE id = p_patient_id;

    -- Build an ER history snapshot for the record
    v_er_snapshot := jsonb_build_object(
        'admission_date',   v_patient.er_admission_date,
        'admission_doctor', v_patient.er_admission_doctor,
        'chief_complaint',  v_patient.er_chief_complaint,
        'admission_notes',  v_patient.er_admission_notes,
        'discharge_date',   NOW()
    );

    UPDATE public.patients
    SET
        is_in_er            = false,
        er_history          = COALESCE(er_history, '[]'::jsonb) || jsonb_build_array(v_er_snapshot),
        er_admission_date   = NULL,
        er_admission_doctor = NULL,
        er_chief_complaint  = NULL,
        er_admission_notes  = NULL,
        updated_at          = NOW()
    WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bulk patient migration (admin only)
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

-- Database size reporter (admin dashboard)
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS TEXT AS $$
    SELECT pg_size_pretty(pg_database_size(current_database()));
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ─────────────────────────────────────────────────────────────
-- 11. PERFORMANCE INDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_ward           ON public.patients(ward_name);
CREATE INDEX IF NOT EXISTS idx_patients_er             ON public.patients(is_in_er);
CREATE INDEX IF NOT EXISTS idx_patients_category       ON public.patients(category);
CREATE INDEX IF NOT EXISTS idx_patients_user           ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_date     ON public.visits(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_role             ON public.visits(created_by_role);
CREATE INDEX IF NOT EXISTS idx_invs_patient_date       ON public.investigations(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invs_role               ON public.investigations(created_by_role);
CREATE INDEX IF NOT EXISTS idx_reminders_date          ON public.reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status        ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nurse_inst_patient      ON public.nurse_instructions(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_inst_ward         ON public.nurse_instructions(ward_name);
CREATE INDEX IF NOT EXISTS idx_nurse_inst_archived     ON public.nurse_instructions(is_archived);
CREATE INDEX IF NOT EXISTS idx_trash_original_id       ON public.trash(original_id);


-- ─────────────────────────────────────────────────────────────
-- 12. LAB REFERENCE RANGES (Seed Data)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.lab_reference_ranges (key, label, min_value, max_value, unit, category) VALUES
    ('wbc',          'WBC',              4.0,   11.0,  'x10³/µL',  'Haematology'),
    ('hb',           'Hemoglobin',       12.0,  17.5,  'g/dL',     'Haematology'),
    ('hct',          'Haematocrit',      37.0,  52.0,  '%',        'Haematology'),
    ('plt',          'Platelets',        150.0, 400.0, 'x10³/µL',  'Haematology'),
    ('esr',          'ESR',              NULL,  20.0,  'mm/h',     'Haematology'),
    ('s_urea',       'S. Urea',          15.0,  45.0,  'mg/dL',    'Renal'),
    ('s_creatinine', 'S. Creatinine',    0.6,   1.2,   'mg/dL',    'Renal'),
    ('ast',          'AST',              NULL,  40.0,  'U/L',      'Liver'),
    ('alt',          'ALT',              NULL,  40.0,  'U/L',      'Liver'),
    ('alp',          'ALP',              44.0,  147.0, 'U/L',      'Liver'),
    ('tsb',          'TSB',              NULL,  1.2,   'mg/dL',    'Liver'),
    ('rbs',          'RBS',              70.0,  140.0, 'mg/dL',    'Metabolism'),
    ('hba1c',        'HbA1c',            NULL,  6.5,   '%',        'Metabolism'),
    ('serum_iron',   'Serum Iron',       60.0,  170.0, 'µg/dL',    'Metabolism'),
    ('ferritin',     'Ferritin',         12.0,  300.0, 'ng/mL',    'Metabolism'),
    ('cholesterol',  'Cholesterol',      NULL,  200.0, 'mg/dL',    'Lipids'),
    ('tg',           'Triglycerides',    NULL,  150.0, 'mg/dL',    'Lipids'),
    ('ldl',          'LDL',              NULL,  130.0, 'mg/dL',    'Lipids'),
    ('hdl',          'HDL',              40.0,  NULL,  'mg/dL',    'Lipids'),
    ('ka',           'Potassium (Ka)',   3.5,   5.0,   'mmol/L',   'Electrolytes'),
    ('na',           'Sodium (Na)',      135.0, 145.0, 'mmol/L',   'Electrolytes'),
    ('cl',           'Chloride (Cl)',    98.0,  107.0, 'mmol/L',   'Electrolytes'),
    ('ca',           'Calcium (Ca)',     8.5,   10.5,  'mg/dL',    'Electrolytes')
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 13. REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'nurse_instructions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nurse_instructions;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.notifications       REPLICA IDENTITY FULL;
ALTER TABLE public.nurse_instructions  REPLICA IDENTITY FULL;
