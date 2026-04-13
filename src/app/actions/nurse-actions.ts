"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/** 
 * Create a new instruction for the nursing staff.
 */
export async function createNurseInstructionAction(payload: {
  patientId: string,
  wardName: string,
  instruction: string,
  doctorName: string,
  type?: 'single' | 'repetitive',
  durationDays?: number
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Authentication required" }

  const instructionType = payload.type || 'single'
  let expiresAt = null

  if (instructionType === 'repetitive' && payload.durationDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + payload.durationDays)
  }

  const { error } = await supabase
    .from('nurse_instructions')
    .insert({
      patient_id: payload.patientId,
      ward_name: payload.wardName,
      instruction: payload.instruction,
      doctor_id: user.id,
      doctor_name: payload.doctorName,
      instruction_type: instructionType,
      duration_days: payload.durationDays,
      expires_at: expiresAt?.toISOString()
    })

  if (error) return { error: error.message }

  revalidatePath(`/patient/${payload.patientId}`)
  revalidatePath('/')
  return { success: true }
}

/**
 * Mark a nurse instruction as read/acknowledged.
 * Supports multiple signs for repetitive instructions.
 */
export async function acknowledgeNurseInstructionAction(payload: {
  instructionId: string,
  nurseName: string
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Authentication required" }

  // 1. Fetch current acknowledgments
  const { data: current, error: fetchError } = await supabase
    .from('nurse_instructions')
    .select('acknowledgments, instruction_type')
    .eq('id', payload.instructionId)
    .single()

  if (fetchError || !current) return { error: "Instruction not found" }

  const newAck = {
    nurse_id: user.id,
    nurse_name: payload.nurseName,
    at: new Date().toISOString()
  }

  const updatedAcks = [...(current.acknowledgments || []), newAck]

  const { error } = await supabase
    .from('nurse_instructions')
    .update({
      is_read: true,
      read_at: newAck.at,
      read_by_nurse_name: payload.nurseName,
      read_by_nurse_id: user.id,
      acknowledgments: updatedAcks
    })
    .eq('id', payload.instructionId)

  if (error) return { error: error.message }

  revalidatePath('/')
  return { success: true, acknowledgments: updatedAcks }
}

/**
 * Update an existing instruction within 24 hours of creation.
 */
export async function updateNurseInstructionAction(payload: {
  instructionId: string,
  newText: string
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Authentication required" }

  // 1. Fetch current record to verify ownership and timing
  const { data: current, error: fetchError } = await supabase
    .from('nurse_instructions')
    .select('created_at, doctor_id, patient_id')
    .eq('id', payload.instructionId)
    .single()

  if (fetchError || !current) return { error: "Instruction not found" }
  if (current.doctor_id !== user.id) return { error: "Only the issuing doctor can edit this instruction" }

  // 2. Check 24h window
  const createdTime = new Date(current.created_at).getTime()
  const now = new Date().getTime()
  if (now - createdTime > 24 * 60 * 60 * 1000) {
    return { error: "Editing window expired (24 hours reached)" }
  }

  // 3. Update
  const { error: updateError } = await supabase
    .from('nurse_instructions')
    .update({ instruction: payload.newText })
    .eq('id', payload.instructionId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/patient/${current.patient_id}`)
  return { success: true }
}

/**
 * Delete an instruction within 24 hours of creation.
 */
export async function deleteNurseInstructionAction(instructionId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Authentication required" }

  // 1. Fetch current record
  const { data: current, error: fetchError } = await supabase
    .from('nurse_instructions')
    .select('created_at, doctor_id, patient_id')
    .eq('id', instructionId)
    .single()

  if (fetchError || !current) return { error: "Instruction not found" }
  if (current.doctor_id !== user.id) return { error: "Only the issuing doctor can delete this" }

  // 2. Check 24h window
  const createdTime = new Date(current.created_at).getTime()
  const now = new Date().getTime()
  if (now - createdTime > 24 * 60 * 60 * 1000) {
    return { error: "Deletion window expired (24 hours reached)" }
  }

  // 3. Delete
  const { error: deleteError } = await supabase
    .from('nurse_instructions')
    .delete()
    .eq('id', instructionId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath(`/patient/${current.patient_id}`)
  return { success: true }
}

/**
 * Fetch unresolved (unread) instructions for a specific ward.
 * High priority for real-time notifications.
 */

/**
 * Fetch active instructions for the nurse hub.
 * logic: (is_read=false) OR (repetitive AND not expired)
 */
export async function getWardPendingInstructionsAction(wardName: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const now = new Date().toISOString()

  // We fetch instructions that are unread OR repetitive and not yet expired
  const { data, error } = await supabase
    .from('nurse_instructions')
    .select(`
      *,
      patient:patients(name)
    `)
    .eq('ward_name', wardName)
    .or(`is_read.eq.false,and(instruction_type.eq.repetitive,expires_at.gt.${now})`)
    .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}
