"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase Admin credentials missing")
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/** Server-Side Helper to verify requesting user is an ADMIN. */
async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized: Login required")

  const { data: profile } = await (supabase
    .from('user_profiles') as any)
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error("Access Denied: Administrative privileges required")
  }
}

export async function createUserAction(formData: FormData) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string || 'user'
  const wardName = formData.get('ward_name') as string || 'General Ward'
  const specialty = formData.get('specialty') as string || 'psychiatry'
  const aiEnabled = formData.get('ai_enabled') === 'true'
  const offlineModeEnabled = formData.get('offline_mode_enabled') === 'true'
  const canSeeWardPatients = formData.get('can_see_ward_patients') === 'true'
  const gender = formData.get('gender') as 'Male' | 'Female' | null
  const accessibleWardsStr = formData.get('accessible_wards') as string // JSON array string
  let accessibleWards: string[] = []
  try { if (accessibleWardsStr) accessibleWards = JSON.parse(accessibleWardsStr) } catch {}

  if (!email || !password) return { error: 'Email and password required' }
  
  // Ensure primary ward is in accessible list
  if (wardName && !accessibleWards.includes(wardName)) {
    accessibleWards.push(wardName)
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  // 2. Wait 1 second for the trigger to possibly create the profile, 
  // then forcefully apply the requested role/ward settings.
  await new Promise(r => setTimeout(r, 1000))
  
  const { error: profileError } = await (getSupabaseAdmin()
    .from('user_profiles') as any)
    .upsert({ 
      user_id: authData.user.id, 
      role, 
      ward_name: wardName,
      specialty,
      gender,
      ai_enabled: aiEnabled,
      offline_mode_enabled: offlineModeEnabled,
      can_see_ward_patients: canSeeWardPatients,
      accessible_wards: accessibleWards
    })

  if (profileError) return { error: 'Auth succeeded but profile update failed: ' + profileError.message }

  revalidatePath('/admin/manage')
  return { success: true }
}

export async function deleteUserAction(userId: string) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!userId) return { error: 'User ID required' }

  // Check if they have patients to avoid constraint errors
  const { data: patients, error: patientError } = await getSupabaseAdmin()
    .from('patients')
    .select('id')
    .eq('user_id', userId)

  if (patientError) return { error: patientError.message }
  if (patients && patients.length > 0) {
    return { error: `Cannot delete user: They own ${patients.length} patient records. Migrate them first.` }
  }

  // Delete profile first
  await getSupabaseAdmin().from('user_profiles').delete().eq('user_id', userId)
  
  // Delete auth user
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId)
  
  if (error) return { error: error.message }
  
  revalidatePath('/admin/manage')
  return { success: true }
}

export async function updateUserPasswordAction(userId: string, newPassword: string) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!userId || !newPassword) return { error: 'User ID and password required' }

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { password: newPassword })
  
  if (error) return { error: error.message }
  return { success: true }
}

export async function updateUserDetailsAction(userId: string, email?: string, wardName?: string, role?: string, specialty?: string, aiEnabled?: boolean, offlineModeEnabled?: boolean, canSeeWardPatients?: boolean, gender?: 'Male' | 'Female' | null, accessibleWards?: string[]) {
  if (!userId) return { error: 'User ID required' }

  // Update email if provided
  if (email) {
    const { error: authError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { email })
    if (authError) return { error: 'Failed to update email: ' + authError.message }
  }

  // Update profile data if provided
  if (wardName || role || specialty) {
    const updatePayload: any = {}
    if (wardName) updatePayload.ward_name = wardName
    if (role) updatePayload.role = role
    if (specialty) updatePayload.specialty = specialty
    if (gender !== undefined) updatePayload.gender = gender
    if (aiEnabled !== undefined) updatePayload.ai_enabled = aiEnabled
    if (offlineModeEnabled !== undefined) updatePayload.offline_mode_enabled = offlineModeEnabled
    if (canSeeWardPatients !== undefined) updatePayload.can_see_ward_patients = canSeeWardPatients
    if (accessibleWards !== undefined) {
      updatePayload.accessible_wards = accessibleWards
      // Ensure primary ward is ALWAYS in accessible_wards
      if (wardName && !accessibleWards.includes(wardName)) {
        updatePayload.accessible_wards = [...accessibleWards, wardName]
      }
    }

    // 1. Fetch current profile to check if ward is changing
    const { data: currentProf } = await (getSupabaseAdmin()
      .from('user_profiles') as any)
      .select('ward_name')
      .eq('user_id', userId)
      .single()

    const isWardChanging = wardName && currentProf?.ward_name !== wardName

    // 2. Perform Profile Update
    const { error: profError } = await (getSupabaseAdmin()
      .from('user_profiles') as any)
      .update(updatePayload)
      .eq('user_id', userId)

    if (profError) return { error: 'Failed to update user profile: ' + profError.message }

    // 3. IF WARD CHANGED: Migrate all patients to the new ward!
    if (isWardChanging) {
      const { error: migError } = await getSupabaseAdmin()
        .from('patients')
        .update({ ward_name: wardName })
        .eq('user_id', userId)
      
      if (migError) console.error('Patient migration failed during ward change:', migError)
    }
  }

  revalidatePath('/admin/manage')
  return { success: true }
}

export async function migratePatientsAction(fromUserId: string, toUserId: string) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { error: 'Invalid user selections for migration' }
  }

  const { data, error } = await getSupabaseAdmin().rpc('migrate_patients', {
    from_user: fromUserId,
    to_user: toUserId
  })

  if (error) return { error: error.message }
  
  return { success: true, count: data }
}

export async function getDbSizeAction() {
  const { data, error } = await getSupabaseAdmin().rpc('get_db_size')
  if (error) return { error: error.message }
  return { data }
}

export async function getAllUsersAction() {
  const { data: users, error: authError } = await getSupabaseAdmin().auth.admin.listUsers()
  if (authError) return { error: authError.message, users: [] }
  
  const { data: profiles, error: profError } = await (getSupabaseAdmin().from('user_profiles') as any).select('*')
  if (profError) return { error: profError.message, users: [] }

  // Merge auth data with profile data
  const combined = users.users.map((u: any) => {
    const prof = profiles?.find((p: any) => p.user_id === u.id)
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: prof?.role || 'user',
      ward_name: prof?.ward_name || 'Unassigned',
      specialty: prof?.specialty || 'psychiatry',
      gender: prof?.gender || null,
      ai_enabled: prof?.ai_enabled ?? true,
      offline_mode_enabled: prof?.offline_mode_enabled ?? false,
      can_see_ward_patients: prof?.can_see_ward_patients ?? false,
      accessible_wards: prof?.accessible_wards || (prof?.ward_name ? [prof.ward_name] : [])
    }
  })

  return { users: combined }
}

export async function getAllPatientsForAdminAction() {
    const [patientsRes, profilesRes] = await Promise.all([
    getSupabaseAdmin()
      .from('patients')
      .select('*, visits(*), investigations(*)')
      .order('created_at', { ascending: false }),
    (getSupabaseAdmin()
      .from('user_profiles') as any)
      .select('user_id, ward_name')
  ])

  if (patientsRes.error) return { error: patientsRes.error.message, patients: [] }
  if (profilesRes.error) return { error: profilesRes.error.message, patients: [] }

  const profiles = profilesRes.data || []
  const patientsWithWards = (patientsRes.data || []).map((p: any) => {
    const prof = profiles.find((f: any) => f.user_id === p.user_id)
    return {
      ...p,
      doctor_ward: prof?.ward_name || 'Legacy / Unassigned'
    }
  })

  return { patients: patientsWithWards }
}

export async function getWardSettingsAction() {
  const { data, error } = await getSupabaseAdmin().from('ward_settings').select('*')
  if (error) return { error: error.message, settings: [] }
  return { settings: data }
}

export async function upsertWardSettingAction(wardName: string, gender: 'Male' | 'Female' | null) {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }
  
  if (!wardName) return { error: 'Ward name required' }
  const { error } = await (getSupabaseAdmin().from('ward_settings') as any).upsert({ 
    ward_name: wardName, 
    gender 
  }, { onConflict: 'ward_name' })
  
  if (error) return { error: error.message }
  revalidatePath('/admin/manage')
  return { success: true }
}

export async function deleteWardSettingAction(wardName: string) {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }
  
  if (!wardName) return { error: 'Ward name required' }
  const { error } = await getSupabaseAdmin()
    .from('ward_settings')
    .delete()
    .eq('ward_name', wardName)
  
  if (error) return { error: error.message }
  revalidatePath('/admin/manage')
  return { success: true }
}

export async function syncWardSettingsAction() {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }

  // 1. Get all unique ward names from user_profiles
  const { data: profiles, error: profError } = await (getSupabaseAdmin()
    .from('user_profiles') as any)
    .select('ward_name')
  
  if (profError) return { error: profError.message }
  
  const activeWards = Array.from(new Set(profiles?.map((p: any) => p.ward_name).filter(Boolean)))

  // 2. Delete from ward_settings if not in activeWards
  // Note: if activeWards is empty, we delete all settings.
  const query = getSupabaseAdmin()
    .from('ward_settings')
    .delete()
  
  if (activeWards.length > 0) {
    query.not('ward_name', 'in', `(${activeWards.join(',')})`)
  }

  const { error: deleteError } = await query
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/admin/manage')
  return { success: true }
}

export async function searchAllPatientsAction(query: string) {
  if (!query.trim()) return { patients: [] }
  
  try {
    // Try admin client first (bypasses RLS, searches all wards)
    const adminDb = getSupabaseAdmin()
    const { data, error } = await adminDb
      .from('patients')
      .select('id, name, age, room_number, ward_name, category, is_in_er')
      .ilike('name', `%${query}%`)
      .limit(10)

    if (error) {
      console.error('Global search admin error:', error.message)
      return { patients: [], error: error.message }
    }
    return { patients: data || [] }
  } catch (err: any) {
    console.error('Global search fallback:', err?.message)
    // Fallback: use the regular server client (RLS-scoped)
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data } = await supabase
        .from('patients')
        .select('id, name, age, room_number, ward_name, category, is_in_er')
        .ilike('name', `%${query}%`)
        .limit(10)
      return { patients: data || [] }
    } catch {
      return { patients: [] }
    }
  }
}

export async function syncProfileWardAction(newWardName: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required' }

  // Update CURRENT user_profile ward_name
  const { error } = await supabase
    .from('user_profiles')
    .update({ ward_name: newWardName })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function repairWardDiscrepanciesAction() {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }

  // 1. Fetch all current user profiles
  const { data: profiles, error: profError } = await (getSupabaseAdmin()
    .from('user_profiles') as any)
    .select('user_id, ward_name')
  
  if (profError) return { error: profError.message }

  // 2. Reconciliation: For each profile, ensure their patients match their CURRENT ward_name
  let totalMigrated = 0
  for (const prof of profiles) {
    const { data: migData, error: migError } = await getSupabaseAdmin()
      .from('patients')
      .update({ ward_name: prof.ward_name })
      .eq('user_id', prof.user_id)
      .neq('ward_name', prof.ward_name)
      .select()
    
    if (migError) console.error(`Failed repair for user ${prof.user_id}:`, migError)
    else if (migData) totalMigrated += migData.length
  }

  revalidatePath('/admin/manage')
  return { success: true, count: totalMigrated }
}

export async function getGlobalOfflineSettingAction() {
  try {
    const { data: settings, error } = await getSupabaseAdmin()
      .from('system_settings')
      .select('global_offline_enabled')
      .eq('id', 1)
      .single()

    if (error) return { error: error.message }
    return { enabled: settings?.global_offline_enabled ?? true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateGlobalOfflineSettingAction(enabled: boolean) {
  try {
    await verifyAdmin()
    const { error } = await getSupabaseAdmin()
      .from('system_settings')
      .update({ global_offline_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) return { error: error.message }
    revalidatePath('/admin/manage')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
