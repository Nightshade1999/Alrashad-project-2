-- ============================================================
-- Migration 0003: Add province and education_level to patients
-- Apply this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS education_level TEXT;
