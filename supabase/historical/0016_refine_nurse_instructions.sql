-- Refine Nurse Instructions Table
-- 1. Add new columns
ALTER TABLE public.nurse_instructions 
ADD COLUMN IF NOT EXISTS instruction_type TEXT DEFAULT 'single',
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acknowledgments JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing single-sign data to the new JSONB array for consistency
UPDATE public.nurse_instructions
SET acknowledgments = jsonb_build_array(
    jsonb_build_object(
        'nurse_id', read_by_nurse_id,
        'nurse_name', read_by_nurse_name,
        'at', read_at
    )
)
WHERE is_read = true AND (acknowledgments IS NULL OR jsonb_array_length(acknowledgments) = 0);

-- 3. Add constraint for instruction_type
ALTER TABLE public.nurse_instructions 
DROP CONSTRAINT IF EXISTS nurse_instructions_type_check;

ALTER TABLE public.nurse_instructions 
ADD CONSTRAINT nurse_instructions_type_check 
CHECK (instruction_type IN ('single', 'repetitive'));

-- 4. Update index for performance on expired filtering
CREATE INDEX IF NOT EXISTS idx_nurse_instructions_expires_at ON public.nurse_instructions(expires_at);
