-- ============================================================
-- Migration 0035: Repair Investigation Signatures (Fixed)
-- Ensures columns exist BEFORE attempting to backfill data.
-- ============================================================

-- 1. Ensure columns exist first
ALTER TABLE public.investigations 
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);

-- 2. Backfill from linked visits where possible
UPDATE public.investigations i
SET 
  doctor_id = v.doctor_id,
  doctor_name = COALESCE(p.doctor_name, 'Unknown Physician')
FROM public.visits v
LEFT JOIN public.user_profiles p ON v.doctor_id = p.user_id
WHERE i.visit_id = v.id
  AND (i.doctor_name IS NULL OR i.doctor_name = 'Unknown Physician');
