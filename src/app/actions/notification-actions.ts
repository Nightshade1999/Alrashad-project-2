"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * ── Mark Notification As Read ────────────────────────────────
 * Updates a notification record with the signature of the doctor 
 * who viewed it.
 */
export async function markNotificationAsReadAction(notificationId: string, actingDoctorName?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // Fetch doctor name for audit if not provided
    let doctorSignature = actingDoctorName
    if (!doctorSignature) {
        const { data: profile } = await supabase
        .from('user_profiles')
        .select('doctor_name')
        .eq('user_id', user.id)
        .single()
        doctorSignature = profile?.doctor_name || user.email || "Unknown Doctor"
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by_doctor_name: doctorSignature
      })
      .eq('id', notificationId)
      .eq('user_id', user.id) // Security check

    if (error) throw error

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error("Mark Read Failure:", err)
    return { error: err.message || "Failed to mark as read." }
  }
}

/**
 * ── Mark All Notifications As Read ────────────────────────────
 */
export async function markAllNotificationsAsReadAction(actingDoctorName?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Authentication required" }

    // Use provided signature or fall back to DB profile
    let doctorSignature = actingDoctorName
    if (!doctorSignature) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('doctor_name')
        .eq('user_id', user.id)
        .single()
      doctorSignature = profile?.doctor_name || user.email || "Unknown Doctor"
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by_doctor_name: doctorSignature
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error("Mark All Read Failure:", err)
    return { error: err.message || "Failed to clear notifications." }
  }
}
