import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, AlertCircle, Clock, Activity, CalendarClock, Plus, Download, Settings, LayoutDashboard } from 'lucide-react'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { ExportButton } from '@/components/dashboard/export-button'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'
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

      {/* Search Bar - Client Component */}
      <DashboardSearch patients={patients || []} />

      {/* AI Safety Monitor */}
      <UrgentInsights />

      {/* Category Cards / Admin View */}
      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Manage Website Card */}
          <Link href="/admin/manage">
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Settings className="h-32 w-32 text-indigo-500" />
              </div>
              
              <div className="relative z-10">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Settings className="h-8 w-8" />
                </div>
                
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Manage Website
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
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

          {/* Wards Card */}
          <Link href="/dashboard/wards">
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <LayoutDashboard className="h-32 w-32 text-emerald-500" />
              </div>

              <div className="relative z-10">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Wards Overview
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                  Access all patient information across all wards and departments in the system.
                </p>

                <div className="mt-10 flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  View All Patients
                  <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = counts[cat.dbValue as keyof typeof counts] as number
            return (
              <Link key={cat.slug} href={`/dashboard/category/${cat.slug}`}>
                <div className={`group relative rounded-2xl border ${cat.border} ${cat.lightBg} p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 overflow-hidden`}>
                  {/* Gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient}`} />

                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${cat.iconBg}`}>
                      <Icon className={`h-5 w-5 ${cat.iconColor}`} />
                    </div>
                    <span className="text-2xl">{cat.dot}</span>
                  </div>

                  <div className={`text-4xl font-bold mb-1 ${cat.countColor}`}>
                    {cat.slug === 'pending-follow-up' ? '—' : count}
                  </div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cat.slug === 'pending-follow-up' ? 'Coming soon' : count === 0 ? 'No patients' : count === 1 ? '1 patient' : `${count} patients`}
                  </div>

                  <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    {cat.slug === 'pending-follow-up' ? 'View priority' : 'View patients'}
                    <svg className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Archive / Deceased Card */}
          {(() => {
            const cat = {
              slug: 'archive',
              label: 'Archive (Deceased)',
              dbValue: 'Deceased/Archive',
              icon: AlertCircle,
              gradient: 'from-slate-500 to-slate-700',
              lightBg: 'bg-slate-50 dark:bg-slate-900/30',
              border: 'border-slate-200 dark:border-slate-800',
              iconBg: 'bg-slate-200 dark:bg-slate-800',
              iconColor: 'text-slate-600 dark:text-slate-400',
              countColor: 'text-slate-700 dark:text-slate-300',
              dot: '⚫',
            }
            const count = patients?.filter(p => p.category === 'Deceased/Archive').length ?? 0
            const Icon = cat.icon
            return (
              <Link href={`/dashboard/category/${cat.slug}`}>
                <div className={`group relative rounded-2xl border ${cat.border} ${cat.lightBg} p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient}`} />

                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${cat.iconBg}`}>
                      <Icon className={`h-5 w-5 ${cat.iconColor}`} />
                    </div>
                    <span className="text-2xl">{cat.dot}</span>
                  </div>

                  <div className={`text-4xl font-bold mb-1 ${cat.countColor}`}>{count}</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {count === 0 ? 'No archived records' : count === 1 ? '1 archived record' : `${count} archived records`}
                  </div>

                  <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    View archives
                    <svg className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            )
          })()}
        </div>
      )}
    </div>
  )
}
