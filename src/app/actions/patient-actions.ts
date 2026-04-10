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

    // 2. Combine Date and Time into a single timestamp
    const now = new Date()
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    const combinedDateTime = payload.visit_date && payload.visit_time 
      ? `${payload.visit_date}T${payload.visit_time}:${seconds}.${ms}` 
      : now.toISOString()

    // 3. Sanitize numeric fields to prevent NaN errors
    const sanitizedPayload = {
      patient_id: payload.patient_id,
      visit_date: combinedDateTime,
      exam_notes: payload.exam_notes,
      is_er: isEnforcedEr,
      doctor_id: user.id,
      bp_sys: typeof payload.bp_sys === 'number' && !isNaN(payload.bp_sys) ? payload.bp_sys : null,
      bp_dia: typeof payload.bp_dia === 'number' && !isNaN(payload.bp_dia) ? payload.bp_dia : null,
      pr: typeof payload.pr === 'number' && !isNaN(payload.pr) ? payload.pr : null,
      spo2: typeof payload.spo2 === 'number' && !isNaN(payload.spo2) ? payload.spo2 : null,
      temp: typeof payload.temp === 'number' && !isNaN(payload.temp) ? payload.temp : null,
      is_conscious: !!payload.is_conscious,
      is_oriented: !!payload.is_oriented,
      is_ambulatory: !!payload.is_ambulatory,
      is_dyspnic: !!payload.is_dyspnic,
      is_soft_abdomen: !!payload.is_soft_abdomen,
    }

    // 3. Primary Insert
    const { error } = await supabase.from('visits').insert(sanitizedPayload)

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

    // 2. Fetch doctor name for the signature
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('doctor_name')
      .eq('user_id', user.id)
      .single()

    // 2. Combine Date and Time
    const now = new Date()
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')

    const combinedDateTime = payload.date && payload.time
      ? `${payload.date}T${payload.time}:${seconds}.${ms}`
      : now.toISOString()

    // 3. Sanitize lab values to prevent NaN errors
    const sanitizedLabs: Record<string, any> = {}
    for (const key in payload) {
      if (['date', 'time', 'patient_id'].includes(key)) continue
      const val = payload[key]
      if (typeof val === 'number') {
        sanitizedLabs[key] = isNaN(val) ? null : val
      } else {
        sanitizedLabs[key] = val
      }
    }

    const finalPayload = {
      patient_id: payload.patient_id,
      date: combinedDateTime,
      ...sanitizedLabs,
      is_er: isEnforcedEr,
      doctor_id: user.id,
      doctor_name: profile?.doctor_name || user.email?.split('@')[0] || "Unknown Physician"
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
      p_doctor_identifier: doctorIdentifier,
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
