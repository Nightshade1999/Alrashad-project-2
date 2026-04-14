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

  // 1. Check Auth Metadata first (Instant & Decisive)
  const metadataRole = user.app_metadata?.role || user.user_metadata?.role;
  if (typeof metadataRole === 'string' && metadataRole.toLowerCase() === 'admin') {
    return; // Authorized
  }

  // 2. Check Database Profile (Fallback)
  const { data: profile } = await (supabase
    .from('user_profiles') as any)
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role?.toLowerCase() !== 'admin') {
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
  const role = formData.get('role') as string || 'doctor'
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
  
  // 0. Validate Wards against ward_settings (Skip for non-clinical roles)
  const isClinicalRole = role === 'doctor' || role === 'admin'
  
  if (isClinicalRole) {
    const { data: validWards } = await getSupabaseAdmin().from('ward_settings').select('ward_name')
    const validNames = (validWards || []).map(w => w.ward_name)
    
    if (!validNames.includes(wardName)) {
      return { error: `Invalid primary ward: "${wardName}". Wards must be created in Ward Setup first.` }
    }
    
    const invalidWards = accessibleWards.filter(w => !validNames.includes(w))
    if (invalidWards.length > 0) {
      return { error: `Invalid accessible wards: ${invalidWards.join(', ')}. Wards must be created in Ward Setup first.` }
    }
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
        can_see_ward_patients: (role === 'doctor' || role === 'nurse' || role === 'admin'),
        accessible_wards: accessibleWards,
        default_password: password,
        // Map userName to correct column
        doctor_name: (role === 'doctor' || role === 'admin') ? formData.get('user_name') : null,
        nurse_name: (role === 'nurse') ? formData.get('user_name') : null,
        lab_tech_name: (role === 'lab_tech') ? formData.get('user_name') : null,
        pharmacist_name: (role === 'pharmacist') ? formData.get('user_name') : null,
        is_name_fixed: !!formData.get('user_name')
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

export async function updateUserPasswordAction(userId: string, newPassword: string, updateDefault: boolean = false) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!userId || !newPassword) return { error: 'User ID and password required' }

  // 1. Update Auth Password
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: error.message }

  // 2. Optionally update the stored Default Password for future resets
  if (updateDefault) {
    const { error: profError } = await (getSupabaseAdmin()
      .from('user_profiles') as any)
      .update({ default_password: newPassword })
      .eq('user_id', userId)
    
    if (profError) console.error('Failed to update default_password:', profError)
  }

  return { success: true }
}

/** 
 * SELF-SERVICE: Allows currently logged-in user to change their own password.
 * This uses the user's OWN session, not admin privileges.
 */
export async function updateUserSelfPasswordAction(newPassword: string) {
  if (!newPassword || newPassword.length < 6) return { error: 'Password must be at least 6 characters' }
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

/**
 * BULK RESET: Reverts multiple accounts to their respective stored default_password.
 */
export async function bulkResetPasswordsToDefaultAction(userIds: string[]) {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!userIds || userIds.length === 0) return { error: 'No users selected' }

  const admin = getSupabaseAdmin()
  const successIds: string[] = []
  const failureIds: string[] = []

  // 1. Fetch defaults for all selected users
  const { data: profiles } = await (admin.from('user_profiles') as any)
    .select('user_id, default_password')
    .in('user_id', userIds)

  // 2. Process each reset individually to handle potential partial failures correctly
  for (const userId of userIds) {
    const prof = profiles?.find((p: any) => p.user_id === userId)
    const defaultPass = prof?.default_password

    if (!defaultPass) {
      failureIds.push(userId)
      continue
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password: defaultPass })
    if (error) failureIds.push(userId)
    else successIds.push(userId)
  }

  revalidatePath('/admin/manage')
  return { 
    successCount: successIds.length, 
    failureCount: failureIds.length,
    message: `Resetted ${successIds.length} users. ${failureIds.length} users failed or had no default password stored.`
  }
}

export async function updateUserDetailsAction(
  userId: string, 
  email?: string, 
  wardName?: string, 
  role?: string, 
  specialty?: string, 
  aiEnabled?: boolean, 
  offlineModeEnabled?: boolean, 
  canSeeWardPatients?: boolean, 
  gender?: 'Male' | 'Female' | null, 
  accessibleWards?: string[],
  userName?: string
) {
  // Fix 8: verifyAdmin() was missing — any authenticated user could call this action
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }
  if (!userId) return { error: 'User ID required' }

  // Update email if provided
  if (email) {
    const { error: authError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { email })
    if (authError) return { error: 'Failed to update email: ' + authError.message }
  }

  // Pre-validate Wards if they are being updated (Skip for non-clinical roles)
  const roleToUse = role || 'doctor' // default to doctor if not changing role
  const isClinicalRole = roleToUse === 'doctor' || roleToUse === 'admin'

  if (isClinicalRole && (wardName || accessibleWards)) {
     const { data: validWards } = await getSupabaseAdmin().from('ward_settings').select('ward_name')
     const validNames = (validWards || []).map(w => w.ward_name)
     
     if (wardName && !validNames.includes(wardName)) {
       return { error: `Invalid ward: "${wardName}". Create it in Ward Setup first.` }
     }
     if (accessibleWards) {
       const invalid = accessibleWards.filter(w => !validNames.includes(w))
       if (invalid.length > 0) {
         return { error: `Invalid accessible wards: ${invalid.join(', ')}. Create them in Ward Setup first.` }
       }
     }
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
    updatePayload.can_see_ward_patients = (roleToUse === 'doctor' || roleToUse === 'nurse' || roleToUse === 'admin')
    if (accessibleWards !== undefined) {
      updatePayload.accessible_wards = accessibleWards
    }
    if (userName !== undefined) {
      const targetRole = role || 'doctor'
      if (targetRole === 'doctor' || targetRole === 'admin') updatePayload.doctor_name = userName
      else if (targetRole === 'nurse') updatePayload.nurse_name = userName
      else if (targetRole === 'lab_tech') updatePayload.lab_tech_name = userName
      else if (targetRole === 'pharmacist') updatePayload.pharmacist_name = userName
      updatePayload.is_name_fixed = !!userName
    }

    // 2. Perform Profile Update
    const { error: profError } = await (getSupabaseAdmin()
      .from('user_profiles') as any)
      .update(updatePayload)
      .eq('user_id', userId)

    if (profError) return { error: 'Failed to update user profile: ' + profError.message }
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
      role: prof?.role || 'doctor',
      ward_name: prof?.ward_name || 'Unassigned',
      specialty: prof?.specialty || 'psychiatry',
      gender: prof?.gender || null,
      ai_enabled: prof?.ai_enabled ?? true,
      offline_mode_enabled: prof?.offline_mode_enabled ?? false,
      can_see_ward_patients: prof?.can_see_ward_patients ?? false,
      accessible_wards: prof?.accessible_wards || (prof?.ward_name ? [prof.ward_name] : []),
      default_password: prof?.default_password || null,
      userName: prof?.role === 'lab_tech' ? prof?.lab_tech_name :
                prof?.role === 'pharmacist' ? prof?.pharmacist_name :
                prof?.role === 'nurse' ? prof?.nurse_name :
                prof?.doctor_name || null,
      isNameFixed: prof?.is_name_fixed ?? false
    }
  })

  return { users: combined }
}

export async function getAllPatientsForAdminAction() {
    const [patientsRes, profilesRes] = await Promise.all([
    getSupabaseAdmin()
      .from('patients')
      .select('*, visits(*), investigations(*)')
      .order('created_at', { ascending: false })
      .limit(5000),
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
      // Priority: 1. Patient's literal ward name, 2. Doctor's assigned ward
      doctor_ward: p.ward_name || prof?.ward_name || 'Unassigned'
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
  // Fix 4: Must reassign query — .not() returns a NEW builder, dropping it silently deleted ALL wards
  let query = getSupabaseAdmin()
    .from('ward_settings')
    .delete()
  
  if (activeWards.length > 0) {
    query = query.not('ward_name', 'in', `(${activeWards.map(w => `"${w}"`).join(',')})`)
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
      .limit(50)

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

  // Fix 11: Validate the ward actually exists before allowing a user to move themselves there
  const { data: wardExists } = await getSupabaseAdmin()
    .from('ward_settings')
    .select('ward_name')
    .eq('ward_name', newWardName)
    .single()

  if (!wardExists) {
    return { error: `Ward "${newWardName}" does not exist. Contact your administrator.` }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ ward_name: newWardName })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function findUnusedWardsAction() {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }

  // 1. Get all wards defined in settings
  const { data: settings, error: sError } = await getSupabaseAdmin()
    .from('ward_settings')
    .select('ward_name')
  
  if (sError) return { error: sError.message }

  // 2. Get all wards currently in use by profiles
  const { data: profiles, error: pError } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('ward_name')
  
  if (pError) return { error: pError.message }

  const usedWards = new Set(profiles.map(p => p.ward_name).filter(Boolean))
  const unused = settings
    .map(s => s.ward_name)
    .filter(name => !usedWards.has(name))

  return { unused }
}

export async function bulkDeleteWardsAction(wardNames: string[]) {
  try { await verifyAdmin() } catch (e: any) { return { error: e.message } }
  
  const { error } = await getSupabaseAdmin()
    .from('ward_settings')
    .delete()
    .in('ward_name', wardNames)

  if (error) return { error: error.message }
  revalidatePath('/admin/manage')
  return { success: true }
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
import * as fs from 'fs/promises'
import * as path from 'path'

export async function prepareBackupFilesAction() {
  try {
    await verifyAdmin()
    
    // 1. Setup backup directory
    const backupDir = path.join(process.cwd(), 'system_backup')
    const dataDir = path.join(backupDir, 'database_records')
    await fs.mkdir(dataDir, { recursive: true })
    
    const admin = getSupabaseAdmin()
    const tables = ['patients', 'visits', 'investigations', 'user_profiles', 'ward_settings', 'reminders']
    
    // 2. Export each table to JSON
    for (const table of tables) {
      const { data, error } = await admin.from(table).select('*')
      if (error) {
        console.error(`Backup error exporting ${table}:`, error.message)
        continue
      }
      await fs.writeFile(
        path.join(dataDir, `${table}.json`),
        JSON.stringify(data, null, 2),
        'utf-8'
      )
    }
    
    // 3. Revalidate and return success
    return { success: true, path: backupDir }
  } catch (e: any) {
    return { error: e.message }
  }
}

/** Bulk-enable PowerSync offline mode for every user in user_profiles. */
export async function enableOfflineForAllUsersAction() {
  try {
    await verifyAdmin()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('user_profiles')
      .update({ offline_mode_enabled: true })
      .neq('user_id', '00000000-0000-0000-0000-000000000000') // matches all rows

    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function exportSystemDataAction() {
  try {
    await verifyAdmin()
    const admin = getSupabaseAdmin()
    const tables = ['patients', 'visits', 'investigations', 'user_profiles', 'ward_settings', 'reminders']
    const exportData: any = {}
    
    for (const table of tables) {
      const { data, error } = await admin.from(table).select('*')
      if (error) throw error
      exportData[table] = data
    }
    
    return { data: exportData }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function restoreSystemDataAction(data: any, strategy: 'skip' | 'overwrite') {
  try {
    await verifyAdmin()
    const admin = getSupabaseAdmin()
    const results: any = {}
    
    // Ordered to respect foreign key relationships
    const tables = ['ward_settings', 'user_profiles', 'patients', 'visits', 'investigations', 'reminders']
    
    for (const table of tables) {
      const tableData = data[table]
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        results[table] = { success: 0, skipped: 0, failed: 0 }
        continue
      }
      
      const conflictCol = table === 'user_profiles' ? 'user_id' : (table === 'ward_settings' ? 'ward_name' : 'id')
      let rowsToProcess = [...tableData]
      let skippedCount = 0
      
      if (strategy === 'skip') {
        // Optimization: Fetch existing IDs in bulk
        const { data: existingRows } = await admin.from(table).select(conflictCol)
        const existingIds = new Set(existingRows?.map((r: any) => r[conflictCol]) || [])
        
        const initialCount = rowsToProcess.length
        rowsToProcess = rowsToProcess.filter(row => !existingIds.has(row[conflictCol]))
        skippedCount = initialCount - rowsToProcess.length
      }

      if (rowsToProcess.length === 0) {
        results[table] = { success: 0, skipped: skippedCount, failed: 0 }
        continue
      }

      // Perform Bulk Upsert or Insert
      // Note: We use chunks of 500 to avoid request size limits if data is huge
      const CHUNK_SIZE = 500
      let successCount = 0
      let failedCount = 0

      for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
        const chunk = rowsToProcess.slice(i, i + CHUNK_SIZE)
        const { error } = await (admin.from(table) as any).upsert(chunk, { 
          onConflict: conflictCol
        })

        if (error) {
          console.error(`Bulk restore error on ${table} (chunk ${i}):`, error.message)
          failedCount += chunk.length
        } else {
          successCount += chunk.length
        }
      }

      results[table] = { success: successCount, skipped: skippedCount, failed: failedCount }
    }
    
    revalidatePath('/admin/manage')
    return { results }
  } catch (e: any) {
    console.error('System Restore Action Failure:', e)
    return { error: e.message }
  }
}

/**
 * ── Referral Management Actions ───────────────────────────────
 */

export async function getAllReferralsForAdminAction() {
  try {
    await verifyAdmin()
    const { data, error } = await getSupabaseAdmin()
      .from('referrals')
      .select(`
        *,
        patients (
          name,
          medical_record_number,
          mother_name,
          ward_name
        ),
        user_profiles:doctor_id (
          doctor_name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data: data || [] }
  } catch (e: any) {
    return { error: e.message, data: [] }
  }
}

export async function deleteReferralAction(referralId: string) {
  try {
    await verifyAdmin()
    const { error } = await getSupabaseAdmin()
      .from('referrals')
      .delete()
      .eq('id', referralId)
    
    if (error) throw error
    revalidatePath('/admin/manage')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

/**
 * ── Global Pharmacy & Nursing Oversight ───────────────────────
 */

export async function getAllInstructionsForAdminAction() {
  try {
    await verifyAdmin()
    const { data, error } = await getSupabaseAdmin()
      .from('nurse_instructions')
      .select(`
        *,
        patients (
          name,
          medical_record_number,
          ward_name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { data: data || [] }
  } catch (e: any) {
    return { error: e.message, data: [] }
  }
}

export async function getAllPharmacyInventoryAction() {
  try {
    await verifyAdmin()
    const { data, error } = await getSupabaseAdmin()
      .from('pharmacy_inventory')
      .select('*')
      .order('generic_name', { ascending: true })
    
    if (error) throw error
    return { data: data || [] }
  } catch (e: any) {
    return { error: e.message, data: [] }
  }
}

/**
 * ── Recycle Bin Actions ───────────────────────────────────────
 */

export async function getTrashItemsAction() {
  try {
    await verifyAdmin()
    const { data, error } = await getSupabaseAdmin()
      .from('trash')
      .select('*')
      .order('deleted_at', { ascending: false })
    
    if (error) throw error
    return { data: data || [] }
  } catch (e: any) {
    return { error: e.message, data: [] }
  }
}

// Fix 12/19: Only these tables are safe to restore into. Prevents a tampered trash record
// from injecting data into auth.users or other sensitive system tables.
const RESTORABLE_TABLES = new Set([
  'patients', 'visits', 'investigations', 'reminders',
  'referrals', 'nurse_instructions', 'pharmacy_inventory'
])

export async function restoreFromTrashAction(trashId: string) {
  try {
    await verifyAdmin()
    const admin = getSupabaseAdmin()
    
    // 1. Get the trash record
    const { data: trashRecord, error: fetchError } = await admin
      .from('trash')
      .select('*')
      .eq('id', trashId)
      .single()
    
    if (fetchError || !trashRecord) throw new Error("Trash record not found")

    // 2. Whitelist check — never restore into auth or system tables
    if (!RESTORABLE_TABLES.has(trashRecord.table_name)) {
      throw new Error(`Restore blocked: "${trashRecord.table_name}" is not a restorable table.`)
    }
    
    // 3. Insert back into original table
    const { error: restoreError } = await admin
      .from(trashRecord.table_name)
      .insert(trashRecord.data)
    
    if (restoreError) throw restoreError
    
    // 4. Delete from trash
    await admin.from('trash').delete().eq('id', trashId)
    
    revalidatePath('/admin/recycle-bin')
    if (trashRecord.data.patient_id) {
        revalidatePath(`/patient/${trashRecord.data.patient_id}/investigations`)
        revalidatePath(`/patient/${trashRecord.data.patient_id}/visits`)
    }
    
    return { success: true }
  } catch (e: any) {
    console.error("Restore Failure:", e)
    return { error: e.message }
  }
}

export async function permanentlyDeleteFromTrashAction(trashId: string) {
  try {
    await verifyAdmin()
    const { error } = await getSupabaseAdmin()
      .from('trash')
      .delete()
      .eq('id', trashId)
    
    if (error) throw error
    revalidatePath('/admin/recycle-bin')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function bulkRestoreFromTrashAction(trashIds: string[]) {
  try {
    await verifyAdmin()
    const admin = getSupabaseAdmin()
    
    // Fetch all trash records
    const { data: trashRecords, error: fetchError } = await admin
      .from('trash')
      .select('*')
      .in('id', trashIds)
    
    if (fetchError || !trashRecords) throw new Error("Trash records not found")
    
    // Restore each record (with whitelist check)
    for (const record of trashRecords) {
      if (!RESTORABLE_TABLES.has(record.table_name)) {
        console.warn(`Bulk restore skipped blocked table: ${record.table_name}`)
        continue
      }
      const { error: restoreError } = await admin
        .from(record.table_name)
        .insert(record.data)
      
      if (!restoreError) {
        // Only delete from trash if insert succeeded
        await admin.from('trash').delete().eq('id', record.id)
      }
    }
    
    revalidatePath('/admin/recycle-bin')
    return { success: true }
  } catch (e: any) {
    console.error("Bulk Restore Failure:", e)
    return { error: e.message }
  }
}

export async function bulkPermanentlyDeleteFromTrashAction(trashIds: string[]) {
  try {
    await verifyAdmin()
    const { error } = await getSupabaseAdmin()
      .from('trash')
      .delete()
      .in('id', trashIds)
    
    if (error) throw error
    revalidatePath('/admin/recycle-bin')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
