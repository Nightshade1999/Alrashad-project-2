-- Migration 0007_add_user_specialty.sql

-- Add specialty to track the doctor's residency type
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT 'psychiatry';

-- Ensure existing users (which are in the psych ward) are set to psychiatry 
-- (The default covers this, but we can explicitly allow changing it to internal_medicine)
