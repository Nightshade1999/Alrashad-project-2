-- Add is_name_fixed column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_name_fixed BOOLEAN DEFAULT false;

-- Update comments
COMMENT ON COLUMN public.user_profiles.is_name_fixed IS 'True if the name was set by an admin and should bypass identity verification permanently';
