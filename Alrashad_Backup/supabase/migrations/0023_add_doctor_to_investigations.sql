-- ============================================================
-- Migration 0023: Add Doctor Tracking to Investigations
-- Allows standalone labs to record which doctor entered them,
-- independent of any linked visit.
-- ============================================================

ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
