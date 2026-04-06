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
        <div className="mt-12 overflow-hidden relative rounded-[2.5rem] bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/40 p-8 shadow-xl shadow-amber-900/5 transition-all animate-scale-in">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <AlertCircle className="h-32 w-32 text-amber-600 rotate-12" />
          </div>
          
          <div className="relative flex flex-col md:flex-row gap-6 items-start">
            <div className="p-4 rounded-3xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 shadow-sm">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xl font-black text-amber-900 dark:text-amber-100 tracking-tight">System Configuration Required</h4>
                <p className="text-amber-700 dark:text-amber-300 font-medium leading-relaxed max-w-2xl mt-2">
                  To access cross-ward statistics and system-wide research, you must configure the administrative service credentials in your environment.
                </p>
              </div>

              <div className="bg-white/40 dark:bg-black/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/30">
                <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2">Technical Details</p>
                <code className="text-xs font-mono bg-amber-100/50 dark:bg-amber-900/30 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                  {errorMessage}
                </code>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-200/40 dark:bg-amber-800/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Check .env.local File
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-200/40 dark:bg-amber-800/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Verify SUPABASE_SERVICE_ROLE_KEY
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
