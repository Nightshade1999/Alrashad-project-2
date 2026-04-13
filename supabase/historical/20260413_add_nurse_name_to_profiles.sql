-- Add nurse_name column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS nurse_name TEXT;

-- Update comments for clarity
COMMENT ON COLUMN public.user_profiles.nurse_name IS 'Full name of the nurse for clinical signatures and bypass';
