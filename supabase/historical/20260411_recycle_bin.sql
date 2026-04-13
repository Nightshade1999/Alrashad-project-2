-- Future-Proof Recycle Bin System
-- This migration creates the trash table and the triggers that automatically 
-- archive deleted rows from core clinical tables.

-- 1. Create the trash table
CREATE TABLE IF NOT EXISTS public.trash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    data JSONB NOT NULL,
    original_id UUID NOT NULL,
    deleted_by_name TEXT,
    deleted_by_id UUID,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.trash ENABLE ROW LEVEL SECURITY;

-- 3. Create Admin-only Policy
DROP POLICY IF EXISTS "Admins can view trash" ON public.trash;
CREATE POLICY "Admins can view trash" ON public.trash
    FOR ALL USING (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 4. Create the Generic Move-to-Trash Function
CREATE OR REPLACE FUNCTION public.proc_move_to_trash()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_name TEXT;
BEGIN
    -- Try to fetch the doctor name from user_profiles for metadata
    SELECT doctor_name INTO v_doctor_name 
    FROM public.user_profiles 
    WHERE user_id = auth.uid();

    INSERT INTO public.trash (
        table_name,
        data,
        original_id,
        deleted_by_id,
        deleted_by_name
    ) VALUES (
        TG_TABLE_NAME,
        to_jsonb(OLD),
        OLD.id,
        auth.uid(),
        COALESCE(v_doctor_name, 'System/Unidentified')
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Apply Triggers to Existing Clinical Tables
-- Patients
DROP TRIGGER IF EXISTS tr_trash_patients ON public.patients;
CREATE TRIGGER tr_trash_patients
    BEFORE DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- Visits
DROP TRIGGER IF EXISTS tr_trash_visits ON public.visits;
CREATE TRIGGER tr_trash_visits
    BEFORE DELETE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- Investigations
DROP TRIGGER IF EXISTS tr_trash_investigations ON public.investigations;
CREATE TRIGGER tr_trash_investigations
    BEFORE DELETE ON public.investigations
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- Reminders
DROP TRIGGER IF EXISTS tr_trash_reminders ON public.reminders;
CREATE TRIGGER tr_trash_reminders
    BEFORE DELETE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();
