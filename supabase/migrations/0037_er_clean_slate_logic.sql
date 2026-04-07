-- ============================================================
-- Migration 0037: ER Clean Slate Logic
-- Ensures re-admitted patients start with a fresh ER record
-- by archiving previous ER-flagged visits and investigations.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  -- 1. Archive previous ER visits (move them to general history)
  UPDATE public.visits
  SET is_er = false
  WHERE patient_id = p_patient_id AND is_er = true;

  -- 2. Archive previous ER investigations
  UPDATE public.investigations
  SET is_er = false
  WHERE patient_id = p_patient_id AND is_er = true;

  -- 3. Reset patient's current ER fields for a clean slate
  UPDATE public.patients
  SET 
    is_in_er = true,
    er_admission_date = NOW(),
    er_admission_doctor = p_doctor_identifier,
    er_chief_complaint = p_chief_complaint,
    er_admission_notes = p_admission_notes,
    er_treatment = '[]'::jsonb, -- Initialize empty treatment
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke all on function, then grant to authenticated users only (Security Hardening)
REVOKE ALL ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) TO authenticated;
