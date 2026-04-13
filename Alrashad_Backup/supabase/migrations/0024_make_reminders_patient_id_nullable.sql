-- ============================================================
-- Migration 0024: Allow Global Tasks (Nullable Patient ID)
-- This fixes the Not-Null constraint error when adding tasks 
-- from the Notification Center that aren't linked to a specific patient.
-- ============================================================

ALTER TABLE public.reminders 
  ALTER COLUMN patient_id DROP NOT NULL;
