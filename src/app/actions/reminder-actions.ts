"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/** helper to get baghdad date (UTC+3) */
export async function getBaghdadDate() {
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function createReminderAction(payload: {
  patient_id?: string | null
  notes: string
  reminder_date: string
  target_specialty: string
  target_gender: string | null
}) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get current user profile for the name stamp
  const { data: profile } = await (supabase.from('user_profiles') as any).select('doctor_name').eq('user_id', user.id).single()

  const { error } = await (supabase.from('reminders') as any).insert({
    ...payload,
    created_by: user.id,
    created_by_name: profile?.doctor_name || 'Unknown Doctor',
    status: 'pending'
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function resolveReminderAction(id: string, resolveNotes: string) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase.from('user_profiles') as any).select('doctor_name').eq('user_id', user.id).single()

  const { error } = await (supabase.from('reminders') as any)
    .update({
      status: 'resolved',
      resolve_notes: resolveNotes,
      resolved_by: user.id,
      resolved_by_name: profile?.doctor_name || 'Unknown Doctor',
      resolved_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rescheduleReminderAction(id: string, newDate: string, updatedNotes: string, isPartial: boolean) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase.from('user_profiles') as any).select('doctor_name').eq('user_id', user.id).single()

  // 1. Mark current reminder as 'rescheduled'
  const { data: oldReminder, error: getError } = await (supabase.from('reminders') as any).select('*').eq('id', id).single()
  if (getError) return { error: getError.message }

  const { error: updateError } = await (supabase.from('reminders') as any)
    .update({
      status: 'rescheduled',
      resolve_notes: isPartial ? 'Partially Resolved - Rescheduled' : 'Not Resolved - Rescheduled',
      resolved_by: user.id,
      resolved_by_name: profile?.doctor_name || 'Unknown Doctor',
      resolved_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // 2. Create the new reminder for the future date
  const { error: insertError } = await (supabase.from('reminders') as any).insert({
    patient_id: oldReminder.patient_id,
    notes: updatedNotes,
    reminder_date: newDate,
    target_specialty: oldReminder.target_specialty,
    target_gender: oldReminder.target_gender,
    created_by: user.id,
    created_by_name: profile?.doctor_name || 'Unknown Doctor',
    status: 'pending'
  })

  if (insertError) return { error: insertError.message }
  
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getTodayRemindersAction() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await (supabase.from('user_profiles') as any).select('role, specialty, gender').eq('user_id', user.id).single()
  if (!profile) return { error: 'Profile not found', data: [] }

  const today = await getBaghdadDate()

  let query = (supabase.from('reminders') as any)
    .select('*, patients(name)')
    .lte('reminder_date', today)
    .eq('status', 'pending')
  
  // Enforcement: Only Admins see everything. Doctors are filtered by specialty/gender.
  if (profile.role !== 'admin') {
    query = query.eq('target_specialty', profile.specialty)
    if (profile.specialty === 'internal_medicine' && profile.gender) {
      query = query.or(`target_gender.eq.${profile.gender},target_gender.is.null`)
    }
  }

  const { data, error } = await query

  if (error) return { error: error.message, data: [] }
  return { data }
}

export async function getTodayRemindersCountAction() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0 }

  const { data: profile } = await (supabase.from('user_profiles') as any).select('role, specialty, gender').eq('user_id', user.id).single()
  if (!profile) return { count: 0 }

  const today = await getBaghdadDate()

  let query = (supabase.from('reminders') as any)
    .select('*', { count: 'exact', head: true })
    .lte('reminder_date', today)
    .eq('status', 'pending')

  if (profile.role !== 'admin') {
    query = query.eq('target_specialty', profile.specialty)
    if (profile.specialty === 'internal_medicine' && profile.gender) {
      query = query.or(`target_gender.eq.${profile.gender},target_gender.is.null`)
    }
  }

  const { count, error } = await query
  if (error) return { count: 0 }
  return { count: count || 0 }
}

export async function getRemindersArchiveAction() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  // Get user profile to determine visibility
  const { data: profile } = await (supabase.from('user_profiles') as any)
    .select('role, specialty, gender')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found', data: [] }

  let query = (supabase.from('reminders') as any)
    .select('*, patients(name)')
    .order('reminder_date', { ascending: false })

  // Enforcement: Only Admins see everything. Doctors are filtered.
  if (profile.role !== 'admin') {
    query = query.eq('target_specialty', profile.specialty)
    if (profile.specialty === 'internal_medicine' && profile.gender) {
      query = query.or(`target_gender.eq.${profile.gender},target_gender.is.null`)
    }
  }

  const { data, error } = await query

  if (error) return { error: error.message, data: [] }
  return { data }
}

export async function deleteReminderAction(id: string) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only admins can delete reminders
  const { data: profile } = await (supabase.from('user_profiles') as any)
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Only admins can delete reminders' }

  const { error } = await (supabase.from('reminders') as any)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/admin/manage')
  return { success: true }
}

export async function updateReminderAction(id: string, payload: {
  notes?: string
  reminder_date?: string
  target_specialty?: string
  target_gender?: string | null
}) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Fetch current reminder to check ownership and status
  const { data: reminder, error: fetchError } = await (supabase.from('reminders') as any)
    .select('created_by, status')
    .eq('id', id)
    .single()

  if (fetchError || !reminder) return { error: "Reminder not found" }
  
  // 2. Security Check: Only creator can edit, and only if pending
  if (reminder.created_by !== user.id) {
    // Check if admin
    const { data: profile } = await (supabase.from('user_profiles') as any).select('role').eq('user_id', user.id).single()
    if (profile?.role !== 'admin') return { error: "Only the creator or an admin can edit this reminder" }
  }

  if (reminder.status !== 'pending') {
    return { error: "Only pending reminders can be edited" }
  }

  // 3. Perform update
  const { error } = await (supabase.from('reminders') as any)
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard')
  revalidatePath('/admin/manage')
  return { success: true }
}
