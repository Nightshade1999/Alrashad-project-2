import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertCircle, Clock, Activity, ArrowLeft, Users, Building2, UserCircle } from 'lucide-react'
import { ExportButton } from '@/components/dashboard/export-button'
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
]

export default async function AdminWardsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // Fetch all patients (as admin, RLS allows this)
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, room_number, ward_name, category, user_id')
    
  // Check if current user is indeed an admin (schema check)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .maybeSingle()
    
  if (profile?.role !== 'admin') {
    // Basic redirect or warning if they somehow got here
    // For now we just let the data be filtered by RLS naturally
  }

  // Fetch unique wards / users to show stats
  const totalWards = new Set(patients?.map(p => p.ward_name)).size
  const totalAdmins = new Set(patients?.map(p => p.user_id)).size

  const counts = {
    'High Risk': patients?.filter(p => p.category === 'High Risk').length ?? 0,
    'Close Follow-up': patients?.filter(p => p.category === 'Close Follow-up').length ?? 0,
    'Normal': patients?.filter(p => p.category === 'Normal').length ?? 0,
    total: patients?.length ?? 0,
  }

  // Group patients by Ward Name
  const groups: Record<string, { total: number, highRisk: number, close: number, normal: number }> = {}
  
  patients?.forEach(p => {
    const w = p.ward_name || "Unassigned"
    if (!groups[w]) groups[w] = { total: 0, highRisk: 0, close: 0, normal: 0 }
    groups[w].total++
    if (p.category === 'High Risk') groups[w].highRisk++
    else if (p.category === 'Close Follow-up') groups[w].close++
    else if (p.category === 'Normal') groups[w].normal++
  })

  const wardGroups = Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]))

  return (
    <div className="space-y-10 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Panel
          </Link>
          <div className="flex items-center gap-3">
             <div className="p-2 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
               <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
               Global Wards Overview
             </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Monitoring {counts.total} patients across {totalWards} wards.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <ExportButton />
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500">Total Systems</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-50">{totalAdmins} active users</div>
              </div>
           </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500">Global Capacity</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-50">{totalWards} wards live</div>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500">Critical Monitor</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-50">{counts['High Risk']} high risk</div>
              </div>
           </div>
        </div>
      </div>

      {/* Global Ward Distribution List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 px-1">
          <Building2 className="h-5 w-5 text-emerald-600" /> Ward Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wardGroups.map(([name, stats]) => (
            <Link key={name} href={`/dashboard/category/pending-follow-up?ward=${encodeURIComponent(name)}`}>
              <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{name}</span>
                    </div>
                   </div>
                   <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     VIEW ALL <ArrowLeft className="h-3 w-3 rotate-180" />
                   </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Total Admitted</span>
                      <span className="font-bold">{stats.total} Patients</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Critical Monitor</span>
                      <span className={`font-bold ${stats.highRisk > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {stats.highRisk} High Risk
                      </span>
                    </div>
                 </div>

                 <div className="mt-6 flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-rose-500" style={{ width: `${(stats.highRisk / stats.total) * 100}%` }} />
                    <div className="h-full bg-amber-500" style={{ width: `${(stats.close / stats.total) * 100}%` }} />
                    <div className="h-full bg-emerald-500" style={{ width: `${(stats.normal / stats.total) * 100}%` }} />
                 </div>
                 
                 <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex gap-1 text-[10px] font-black uppercase">
                      <span className="text-rose-600">🔴 Critical</span>
                      <span className="text-amber-600">🟡 Close</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 opacity-60 italic">Click to Filter</div>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 px-1 mb-6">
          <Activity className="h-5 w-5 text-indigo-600" /> Category Analysis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = counts[cat.dbValue as keyof typeof counts] as number
            return (
              <Link key={cat.slug} href={`/dashboard/category/${cat.slug}`}>
                <div className={`group relative rounded-3xl border ${cat.border} ${cat.lightBg} p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 active:translate-y-0 overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cat.gradient}`} />

                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-2xl ${cat.iconBg} shadow-sm group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${cat.iconColor}`} />
                    </div>
                    <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{cat.dot}</span>
                  </div>

                  <div className={`text-5xl font-black mb-2 tracking-tighter ${cat.countColor}`}>{count}</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{cat.label}</div>
                  <p className="text-sm font-medium text-muted-foreground mt-1 mb-8 opacity-80">
                    Detailed view across all medical departments.
                  </p>

                  <div className="flex items-center text-sm font-bold text-muted-foreground group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    Analyze Global Data
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-3 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
