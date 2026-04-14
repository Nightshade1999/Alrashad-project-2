"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

/**
 * ── Add Visit Action ──────────────────────────────────────────
 * Handles doctor visit documentation, ensuring the UI 
 * revalidates immediately.
 */
export async function addVisitAction(payload: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // 1. Automatic ER Detection: Check if patient is currently in ER
    const { data: patient } = await supabase
      .from('patients')
      .select('is_in_er')
      .eq('id', payload.patient_id)
      .single()
    
    const isEnforcedEr = patient?.is_in_er || payload.is_er || false

    // 2. Fetch User Profile for Role Checks
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, doctor_name, nurse_name')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role?.toLowerCase() || 'doctor'

    // 3. Combine Date and Time into a single timestamp
    const now = new Date()
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    const combinedDateTime = payload.visit_date && payload.visit_time 
      ? `${payload.visit_date}T${payload.visit_time}:${seconds}.${ms}` 
      : now.toISOString()

    // 4. Sanitize numeric fields to prevent NaN errors
    const sanitizedPayload: any = {
      patient_id: payload.patient_id,
      visit_date: combinedDateTime,
      exam_notes: payload.exam_notes,
      is_er: isEnforcedEr,
      doctor_id: user.id,
      is_psych_note: !!payload.is_psych_note,
      bp_sys: typeof payload.bp_sys === 'number' && !isNaN(payload.bp_sys) ? payload.bp_sys : null,
      bp_dia: typeof payload.bp_dia === 'number' && !isNaN(payload.bp_dia) ? payload.bp_dia : null,
      pr: typeof payload.pr === 'number' && !isNaN(payload.pr) ? payload.pr : null,
      rr: typeof payload.rr === 'number' && !isNaN(payload.rr) ? payload.rr : null,
      spo2: typeof payload.spo2 === 'number' && !isNaN(payload.spo2) ? payload.spo2 : null,
      temp: typeof payload.temp === 'number' && !isNaN(payload.temp) ? payload.temp : null,
      is_conscious: !!payload.is_conscious,
      is_oriented: !!payload.is_oriented,
      is_ambulatory: !!payload.is_ambulatory,
      is_dyspnic: !!payload.is_dyspnic,
      is_soft_abdomen: !!payload.is_soft_abdomen,
      created_by_role: role
    }

    // 5. Nurse Restriction Enforcer: nurses may only record vitals — no clinical notes.
    // Fix 3: This block was previously empty (comment only) — no restriction was enforced.
    if (role === 'nurse') {
      sanitizedPayload.exam_notes = ''       // Nurses cannot write clinical exam notes
      sanitizedPayload.is_psych_note = false // Nurses cannot flag psych notes
    }

    // 3. Primary Insert with explicit doctor name from client if available
    const { error } = await supabase.from('visits').insert({
      ...sanitizedPayload,
      doctor_name: payload.actingDoctorName || null 
    })

    if (error) {
      // If it's a schema cache error, retry once with the same payload.
      // We no longer strip doctor_id or vitals as the schema is now stable.
      if (error.message.includes("schema cache")) {
        console.warn("Retrying visit insert due to schema cache mismatch...")
        const { error: retryError } = await supabase.from('visits').insert(sanitizedPayload)
        if (retryError) return { error: retryError.message }
      } else {
        return { error: error.message }
      }
    }

    // 4. Update the patient's master activity date
    await supabase
      .from('patients')
      .update({ last_activity_at: combinedDateTime })
      .eq('id', payload.patient_id)

    // Revalidate paths
    revalidatePath(`/patient/${payload.patient_id}/visits`)
    revalidatePath(`/patient/${payload.patient_id}`)
    revalidatePath('/dashboard/my-ward')
    return { success: true }
  } catch (err: any) {
    console.error("Critical Add Visit Action Failure:", err)
    return { error: err?.message || "An unexpected error occurred while saving the visit." }
  }
}

/**
 * ── Add Investigation Action ──────────────────────────────────
 * Handles lab results with a defensive fallback for 
 * schema cache issues.
 */
export async function addInvestigationAction(payload: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // 1. Automatic ER Detection
    const { data: patient } = await supabase
      .from('patients')
      .select('is_in_er')
      .eq('id', payload.patient_id)
      .single()
    
    const isEnforcedEr = patient?.is_in_er || payload.is_er || false

    // 2. Fetch profile for role and signature
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, doctor_name, lab_tech_name, nurse_name')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role?.toLowerCase() || 'lab_tech'

    // 3. Combine Date and Time
    const now = new Date()
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    const combinedDateTime = payload.date && payload.time
      ? `${payload.date}T${payload.time}:${seconds}.${ms}`
      : now.toISOString()

    // 4. Sanitize and Filter based on Role
    const sanitizedLabs: Record<string, any> = {}
    for (const key in payload) {
      if (['date', 'time', 'patient_id'].includes(key)) continue
      
      // Nurse Restriction: Only allow RBS
      if (role === 'nurse' && key !== 'rbs') continue;

      const val = payload[key]
      if (typeof val === 'number') {
        sanitizedLabs[key] = isNaN(val) ? null : val
      } else {
        sanitizedLabs[key] = val
      }
    }

    const signature = payload.actingDoctorName || profile?.doctor_name || profile?.lab_tech_name || profile?.nurse_name || user.email?.split('@')[0] || "Unknown Staff"

    const finalPayload = {
      patient_id: payload.patient_id,
      date: combinedDateTime,
      ...sanitizedLabs,
      is_er: isEnforcedEr,
      doctor_id: user.id,
      doctor_name: signature,
      lab_tech_name: profile?.lab_tech_name || payload.actingLabTechName || null,
      created_by_role: role
    }

    // 4. Primary Attempt
    const { error: primaryError } = await supabase
      .from('investigations')
      .insert(finalPayload)

    if (primaryError) {
      // If it's a schema cache error, retry once with the same payload.
      if (primaryError.message.includes("schema cache")) {
        console.warn("Retrying lab insert due to schema cache mismatch...")
        const { error: retryError } = await supabase
          .from('investigations')
          .insert(finalPayload)
        
        if (retryError) return { error: retryError.message }
      } else {
        return { error: primaryError.message }
      }
    }

    // 5. Update the patient's master activity date
    await supabase
      .from('patients')
      .update({ last_activity_at: combinedDateTime })
      .eq('id', payload.patient_id)

    revalidatePath(`/patient/${payload.patient_id}/investigations`)
    revalidatePath(`/patient/${payload.patient_id}`)
    revalidatePath('/dashboard/my-ward')
    return { success: true }
  } catch (err: any) {
    console.error("Critical Add Investigation Action Failure:", err)
    return { error: err?.message || "An unexpected error occurred while saving labs." }
  }
}

/**
 * ── Update Investigation Action ───────────────────────────────
 * Securely updates an existing investigation record.
 * Permission checks (48h/Admin) are enforced in the UI, 
 * but this action ensures data sanitization.
 */
export async function updateInvestigationAction(id: string, payload: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // 1. Combine Date and Time
    const now = new Date()
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    const combinedDateTime = payload.date && payload.time
      ? `${payload.date}T${payload.time}:${seconds}.${ms}`
      : now.toISOString()

    // 2. Sanitize lab values
    const sanitizedLabs: Record<string, any> = {}
    for (const key in payload) {
      if (['date', 'time', 'patient_id', 'id'].includes(key)) continue
      const val = payload[key]
      if (typeof val === 'number') {
        sanitizedLabs[key] = isNaN(val) ? null : val
      } else {
        sanitizedLabs[key] = val
      }
    }

    const { error } = await supabase
      .from('investigations')
      .update({
        date: combinedDateTime,
        ...sanitizedLabs,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/patient/${payload.patient_id}/investigations`)
    revalidatePath(`/patient/${payload.patient_id}`)
    return { success: true }
  } catch (err: any) {
    console.error("Update Investigation Failure:", err)
    return { error: err?.message || "Failed to update lab results." }
  }
}

/**
 * ── Move Patient to ER ────────────────────────────────────────
 * Transitions a patient from a ward to the ER ward.
 */
export async function movePatientToErAction(payload: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('doctor_name')
      .eq('user_id', user.id)
      .single()

    const doctorIdentifier = profile?.doctor_name || user.email || 'Unknown Doctor'

    const { error } = await supabase.rpc('rpc_move_patient_to_er', {
      p_patient_id: payload.patient_id,
      p_doctor_identifier: payload.actingDoctorName || doctorIdentifier,
      p_chief_complaint: payload.chief_complaint,
      p_admission_notes: payload.admission_notes
    })

    if (error) throw error

    revalidatePath(`/patient/${payload.patient_id}`)
    return { success: true }
  } catch (err: any) {
    console.error("Move to ER Failed:", err)
    return { error: err.message || "Failed to initiate ER admission." }
  }
}

/**
 * ── Return Patient to Ward ────────────────────────────────────
 * Discharges a patient from ER back to their original ward.
 */
export async function returnPatientToWardAction(patientId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // 1. Fetch current ER details for history AND gender for redirect
    const { data: p } = await supabase
      .from('patients')
      .select('gender, er_admission_date, er_admission_doctor, er_chief_complaint, er_admission_notes, er_history')
      .eq('id', patientId)
      .single()

    // 2. Perform RPC with Security Definer to bypass RLS for this specific operation
    const { error } = await supabase.rpc('rpc_return_patient_to_ward', {
      p_patient_id: patientId
    })

    if (error) throw error

    revalidatePath(`/patient/${patientId}`)
    return { success: true, gender: p?.gender }
  } catch (err: any) {
    console.error("Return to Ward Failed:", err)
    return { error: err.message || "Failed to discharge patient from ER." }
  }
}

/**
 * ── Update Psych Patient Action ─────────────────────────────
 * Updates psychiatric diagnosis and chronic drugs with audit trail.
 */
export async function updatePsychPatientAction(
  patientId: string, 
  data: { 
    psychological_diagnosis?: string; 
    psych_drugs?: any[];
    actingDoctorName?: string;
  }
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    const updatePayload: any = {
      psych_last_edit_by: data.actingDoctorName || 'Unknown Doctor',
      psych_last_edit_at: new Date().toISOString(),
    }

    if (data.psychological_diagnosis !== undefined) {
      updatePayload.psychological_diagnosis = data.psychological_diagnosis
    }
    if (data.psych_drugs !== undefined) {
      updatePayload.psych_drugs = data.psych_drugs
    }

    const { error } = await supabase
      .from('patients')
      .update(updatePayload)
      .eq('id', patientId)

    if (error) throw error

    revalidatePath(`/patient/${patientId}`)
    revalidatePath('/dashboard/my-ward')
    return { success: true }
  } catch (err: any) {
    console.error("Update Psych Patient Action Failed:", err)
    return { error: err.message || "Failed to update psychiatric records." }
  }
}
