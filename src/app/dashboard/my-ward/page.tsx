import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertCircle, Clock, Activity, CalendarClock } from 'lucide-react'
import { ExportButton } from '@/components/dashboard/export-button'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'

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
  {
    slug: 'deceased',
    label: 'Archive / Deceased',
    dbValue: 'Deceased/Archive',
    icon: AlertCircle,
    gradient: 'from-slate-500 to-slate-700',
    lightBg: 'bg-slate-50 dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    countColor: 'text-slate-700 dark:text-slate-300',
    dot: '📁',
  },
]

export default async function MyWardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .single()
    
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, room_number, category, is_in_er')
    .eq('ward_name', profile?.ward_name || '')
    .eq('is_in_er', false)

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
            My Ward ({profile?.ward_name})
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

      <div className="max-w-md">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block ml-1">
          Search Patients in this Ward
        </label>
        <DashboardSearch patients={patients || []} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const count = counts[cat.dbValue as keyof typeof counts] as number
          return (
            <Link key={cat.slug} href={`/dashboard/category/${cat.slug}`}>
              <div className={`group relative rounded-2xl border ${cat.border} ${cat.lightBg} p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 overflow-hidden`}>
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
      </div>
    </div>
  )
}
