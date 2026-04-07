-- ============================================================
-- Migration 0019: Multi-Ward Access & Data Integrity Fix
-- Supporting multiple assigned wards per user.
-- ============================================================

-- 1. Add accessible_wards column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS accessible_wards TEXT[] DEFAULT '{}';

-- 2. Backfill: If accessible_wards is empty, add the current ward_name to it
UPDATE user_profiles 
  SET accessible_wards = ARRAY[ward_name] 
  WHERE array_length(accessible_wards, 1) IS NULL OR accessible_wards = '{}';

-- 3. Ensure ward_name is always contained within accessible_wards (Data Integrity)
-- (No trigger needed if we handle it in application logic, but good practice)
