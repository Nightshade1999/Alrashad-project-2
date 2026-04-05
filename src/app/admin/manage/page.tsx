import { getAllUsersAction, getDbSizeAction, getAllPatientsForAdminAction } from '@/app/actions/admin-actions'
import WardManagementClient from './ward-management-client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminManagePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let users: any[] = []
  let dbSizeMB = 'Error'
  let patientsData: any[] = []
  let errorMessage: string | null = null
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  if (hasServiceKey) {
    const [usersRes, dbSizeRes, patientsRes] = await Promise.all([
      getAllUsersAction(),
      getDbSizeAction(),
      getAllPatientsForAdminAction()
    ])
    
    if (usersRes.users) users = usersRes.users
    if (dbSizeRes.data) {
      dbSizeMB = (Number(dbSizeRes.data) / (1024 * 1024)).toFixed(2)
    }
    
    if (patientsRes.error) {
      errorMessage = `Database Fetch Error: ${patientsRes.error}`
    } else if (patientsRes.patients) {
      patientsData = patientsRes.patients
    }
  } else {
    errorMessage = "CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables (.env). Administrators cannot see global data without it."
  }

  // Fetch current user profile for AI permission check
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('ai_enabled')
    .eq('user_id', authUser?.id)
    .single()

  const aiEnabled = userProfile?.ai_enabled ?? true

  return (
    <div className="p-4 md:p-8">
      <WardManagementClient 
        initialUsers={users} 
        dbSizeMB={dbSizeMB} 
        patientsData={patientsData} 
        hasServiceKey={hasServiceKey}
        aiEnabled={aiEnabled}
      />
      {errorMessage && (
        <div className="mt-8 p-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-3xl flex items-start gap-4 shadow-sm animate-pulse">
          <AlertCircle className="h-6 w-6 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-extrabold text-lg">System Configuration Issue</h4>
            <p className="font-medium opacity-90">{errorMessage}</p>
            <p className="text-xs mt-4 font-bold uppercase underline">Important: Research and Global Statistics require the Service Role Key for cross-user reporting.</p>
          </div>
        </div>
      )}
    </div>
  )
}
