import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, AlertCircle, Clock, Activity, CalendarClock, Plus, Download, Settings, LayoutDashboard } from 'lucide-react'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { ExportButton } from '@/components/dashboard/export-button'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'
import { GlobalSearch } from '@/components/dashboard/global-search'
import { UrgentInsights } from '@/components/dashboard/urgent-insights'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  {
    slug: 'high-risk',
    label: 'High Risk',
    dbValue: 'High Risk',
    icon: AlertCircle,
    gradient: 'from-red-500 to-rose-600',
    lightBg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/40',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400',
    countColor: 'text-red-700 dark:text-red-300',
    dot: '🔴',
  },
  {
    slug: 'close-follow-up',
    label: 'Close Follow-up',
    dbValue: 'Close Follow-up',
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    countColor: 'text-amber-700 dark:text-amber-300',
    dot: '🟡',
  },
  {
    slug: 'normal',
    label: 'Normal Follow-up',
    dbValue: 'Normal',
    icon: Activity,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    countColor: 'text-emerald-700 dark:text-emerald-300',
    dot: '🟢',
  },
  {
    slug: 'pending-follow-up',
    label: 'Pending Follow-up',
    dbValue: 'ALL',
    icon: CalendarClock,
    gradient: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-900/40',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    countColor: 'text-violet-700 dark:text-violet-300',
    dot: '🕐',
    isPlaceholder: true
  },
]

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // Fetch user profile safely using * to avoid schema cache errors
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .maybeSingle()

  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (profileError) {
    console.error('Supabase profile fetch error:', profileError)
  }

  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, room_number, category')

  const isAdmin = profile?.role === 'admin'

  const counts = {
    'High Risk': patients?.filter(p => p.category === 'High Risk').length ?? 0,
    'Close Follow-up': patients?.filter(p => p.category === 'Close Follow-up').length ?? 0,
    'Normal': patients?.filter(p => p.category === 'Normal').length ?? 0,
    total: patients?.length ?? 0,
  }

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Patient Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} patient{counts.total !== 1 ? 's' : ''} currently admitted
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportButton />
          <AddPatientModal />
        </div>
      </div>

      {/* Global Search Bar (All Wards) */}
      <div className="max-w-2xl mx-auto w-full">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block ml-1">
          System-Wide Patient Search
        </label>
        <GlobalSearch />
      </div>

      {/* AI Safety Monitor */}
      <UrgentInsights aiEnabled={profile?.ai_enabled ?? true} />

      {/* Role-based Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* ER Ward Card */}
        <Link href="/dashboard/er">
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="h-32 w-32 text-rose-500" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                ER Ward
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                View and manage patients currently admitted to the emergency room based on your specialty.
              </p>
              <div className="mt-10 flex items-center font-semibold text-rose-600 dark:text-rose-400">
                Enter ER Ward
                <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Normal Ward Card */}
        <Link href={isAdmin ? "/dashboard/wards" : "/dashboard/my-ward"}>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <LayoutDashboard className="h-32 w-32 text-emerald-500" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <LayoutDashboard className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Ward
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                {isAdmin 
                  ? "Access all patient information across all wards and departments."
                  : "Access your assigned ward, manage patients grouped by priority."}
              </p>
              <div className="mt-10 flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                View Ward
                <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Admin Manage Card - ONLY FOR ADMINS */}
        {isAdmin && (
          <Link href="/admin/manage">
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Settings className="h-32 w-32 text-indigo-500" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Settings className="h-8 w-8" />
                </div>
                
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Ward Management
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                  Configure system settings, monitor platform activity, and manage application resources.
                </p>
                
                <div className="mt-10 flex items-center font-semibold text-indigo-600 dark:text-indigo-400">
                  Scale Operations
                  <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
