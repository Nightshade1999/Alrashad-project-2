-- ============================================================
-- Migration 0031: Security Definer Transition Functions
-- Provides a robust way to transition patients between wards 
-- regardless of the documenting doctor's original ward.
-- ============================================================

-- Function: Return Patient to Ward
CREATE OR REPLACE FUNCTION public.rpc_return_patient_to_ward(p_patient_id UUID)
RETURNS VOID AS $$
DECLARE
  v_history JSONB;
  v_admission_date TIMESTAMPTZ;
  v_admission_doctor TEXT;
  v_chief_complaint TEXT;
  v_admission_notes TEXT;
BEGIN
  -- 1. Fetch current ER details
  SELECT er_history, er_admission_date, er_admission_doctor, er_chief_complaint, er_admission_notes
  INTO v_history, v_admission_date, v_admission_doctor, v_chief_complaint, v_admission_notes
  FROM public.patients
  WHERE id = p_patient_id;

  -- 2. Build new history entry if admission date exists
  IF v_admission_date IS NOT NULL THEN
    v_history := COALESCE(v_history, '[]'::jsonb) || jsonb_build_object(
      'admission_date', v_admission_date,
      'discharge_date', NOW(),
      'doctor', v_admission_doctor,
      'chief_complaint', v_chief_complaint,
      'admission_notes', v_admission_notes
    );
  END IF;

  -- 3. Perform the update (Security Definer bypasses RLS)
  UPDATE public.patients
  SET 
    is_in_er = false,
    er_admission_date = null,
    er_admission_doctor = null,
    er_chief_complaint = null,
    er_admission_notes = null,
    er_treatment = '[]'::jsonb,
    er_history = v_history,
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Move Patient to ER
CREATE OR REPLACE FUNCTION public.rpc_move_patient_to_er(
  p_patient_id UUID, 
  p_doctor_identifier TEXT,
  p_chief_complaint TEXT,
  p_admission_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.patients
  SET 
    is_in_er = true,
    er_admission_date = NOW(),
    er_admission_doctor = p_doctor_identifier,
    er_chief_complaint = p_chief_complaint,
    er_admission_notes = p_admission_notes,
    er_treatment = '[]'::jsonb,
    updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all on functions, then grant to authenticated users only
REVOKE ALL ON FUNCTION public.rpc_return_patient_to_ward(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_return_patient_to_ward(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_move_patient_to_er(UUID, TEXT, TEXT, TEXT) TO authenticated;
