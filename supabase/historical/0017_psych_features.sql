-- Add is_psych_note boolean to the visits table
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS is_psych_note BOOLEAN DEFAULT false;
