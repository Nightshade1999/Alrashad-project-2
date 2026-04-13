"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )
}

export async function updateUserProfileAction(payload: {
  doctor_name: string
  gender: 'Male' | 'Female' | null
}) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Update Profile (Role and Specialty are NOT changed here)
  const { error } = await (supabase.from('user_profiles') as any)
    .update({
      doctor_name: payload.doctor_name.trim(),
      gender: payload.gender,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getUserProfileAction() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await (supabase.from('user_profiles') as any)
    .select('doctor_name, gender, specialty, role')
    .eq('user_id', user.id)
    .single()

  if (error) return { error: error.message }
  return { data }
}
