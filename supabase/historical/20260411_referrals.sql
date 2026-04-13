-- Official Bilingual Referral System
-- This migration creates the referrals table to store formal clinical letters.

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(user_id),
    
    -- General Info
    destination TEXT,
    department TEXT,
    companion_name TEXT,
    
    -- Clinical Form Fields (Basic structure)
    indications TEXT,
    chief_complaint TEXT,
    relevant_examination TEXT,
    treatment_taken TEXT,
    investigations_text TEXT,
    
    -- Automated Snapshots (JSONB to freeze state at time of referral)
    vitals_snapshot JSONB,         -- { bp_sys, bp_dia, pr, temp, rr }
    chronic_hx_snapshot JSONB,    -- { diseases: [], meds: [] }
    investigations_snapshot JSONB, -- { hb, wbc, urea, creatinine, etc }
    er_treatment_snapshot JSONB,   -- Snapshot of er_treatment if applicable
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure New Columns Exist (Handles cases where table was already created)
DO $$ 
BEGIN
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS history_of_present_illness TEXT;
    
    -- Cleanup redundant column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='history_of_illness') THEN
        ALTER TABLE public.referrals DROP COLUMN history_of_illness;
    END IF;
END $$;

-- RLS Policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all referrals" ON public.referrals;
CREATE POLICY "Users can view all referrals" ON public.referrals
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
CREATE POLICY "Users can create referrals" ON public.referrals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update referrals" ON public.referrals;
CREATE POLICY "Users can update referrals" ON public.referrals
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Individuals can delete their own referrals" ON public.referrals;
CREATE POLICY "Individuals can delete their own referrals" ON public.referrals
    FOR DELETE USING (auth.uid() = doctor_id OR 
                      EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Trigger to move referrals to trash on delete (future-proof recycle bin)
DROP TRIGGER IF EXISTS tr_trash_referrals ON public.referrals;
CREATE TRIGGER tr_trash_referrals
    BEFORE DELETE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();
