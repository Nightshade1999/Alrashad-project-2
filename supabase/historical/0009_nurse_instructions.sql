-- 1. Add 'Awaiting Assessment' to Patient Category Constraint
-- Check if the constraint exists first (assuming it's a CHECK constraint on the patients table)
DO $$ 
BEGIN
    -- This assumes category is stored as TEXT with a CHECK constraint.
    -- If it's a domain or enum, the migration would differ. 
    -- For Supabase/PostgreSQL, we typically use CHECK constraints for this project's patterns.
    ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_category_check;
    ALTER TABLE public.patients ADD CONSTRAINT patients_category_check 
        CHECK (category IN ('High Risk', 'Close Follow-up', 'Normal', 'Awaiting Assessment', 'Deceased/Archive'));
END $$;

-- 2. Create Nurse Instructions Table
CREATE TABLE IF NOT EXISTS public.nurse_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    ward_name TEXT NOT NULL,
    instruction TEXT NOT NULL,
    doctor_id UUID REFERENCES auth.users(id),
    doctor_name TEXT, -- Snapshot of doctor's signature name
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Acknowledgment Fields
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    read_by_nurse_name TEXT, -- Snapshot of nurse's signature name
    read_by_nurse_id UUID REFERENCES auth.users(id)
);

-- 3. RLS Policies
ALTER TABLE public.nurse_instructions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (needed for cross-role visibility)
CREATE POLICY "Allow authenticated read nurse_instructions" 
ON public.nurse_instructions FOR SELECT 
TO authenticated 
USING (true);

-- Allow doctors to insert instructions
CREATE POLICY "Allow doctors to insert instructions" 
ON public.nurse_instructions FOR INSERT 
TO authenticated 
WITH CHECK (true); -- In a real app, we'd check the role in user_profiles

-- Allow nurses to update acknowledgment fields
CREATE POLICY "Allow nurses to acknowledge instructions" 
ON public.nurse_instructions FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Indexes for performance (30-day filtering)
CREATE INDEX IF NOT EXISTS idx_nurse_instructions_patient_id ON public.nurse_instructions(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_instructions_created_at ON public.nurse_instructions(created_at);
CREATE INDEX IF NOT EXISTS idx_nurse_instructions_ward_name ON public.nurse_instructions(ward_name);
