-- Migration: Add offline_mode_enabled to user_profiles and admin toggle to system_settings
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS offline_mode_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add global offline enabled toggle to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS global_offline_enabled BOOLEAN DEFAULT true;

-- Update RLS to allow users to read the global setting
DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Ensure admins can update system settings (need a role-based policy update)
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true));
