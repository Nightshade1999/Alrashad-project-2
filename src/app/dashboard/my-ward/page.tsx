"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Clock, Activity, CalendarClock, Loader2, RefreshCw, Database, Brain } from 'lucide-react'
import { ExportButton } from '@/components/dashboard/export-button'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'
import { useDatabase } from '@/hooks/useDatabase'
import { safeJsonParse } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
  },
  {
    slug: 'awaiting-assessment',
    label: 'Awaiting Assessment',
    dbValue: 'Awaiting Assessment',
    icon: Activity,
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900/40',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    countColor: 'text-blue-700 dark:text-blue-300',
    dot: '🔵',
  },
]

interface PatientSummary {
  id: string
  name: string
  room_number: string | null
  category: string
  is_in_er: boolean
  last_activity_at: string | null
  created_at: string
  psychological_diagnosis?: string | null
  psych_drugs?: any
  psych_last_edit_by?: string | null
}

async function fetchPatientsOnline(wardName: string): Promise<PatientSummary[]> {
  const supabase = createClient()
  let query = supabase
    .from('patients')
    .select('id, name, room_number, category, is_in_er, last_activity_at, created_at, psychological_diagnosis, psych_drugs, psych_last_edit_by')
    .limit(5000)

  // Master Ward Bypass: Admins or Master Ward users see everyone
  if (wardName !== 'Master' && wardName !== 'Master Ward') {
    // Using ilike for case-insensitive matching and robustness against trailing spaces
    query = query.ilike('ward_name', wardName)
  }

  const { data, error } = await query
  if (error) {
    console.error('Supabase fetch error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
  }
  return (data as PatientSummary[]) || []
}

export default function MyWardPage() {
  const router = useRouter()
  const { profile, isReady } = useDatabase()
  const [wardName, setWardName] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function load() {
      if (!isReady) return
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }

        const { data: profileData, error: profError } = await supabase
          .from('user_profiles')
          .select('ward_name, role')
          .eq('user_id', user.id)
          .maybeSingle() as any

        if (profError) throw profError

        if (profileData?.role?.toLowerCase() === 'nurse') {
          router.replace(`/nurse/ward/${encodeURIComponent(profileData.ward_name || 'General Ward')}`)
          return
        }

        if (!profileData?.ward_name) {
          router.replace('/dashboard/select-ward');
          return;
        }

        const currentWard = profileData.ward_name
        setWardName(currentWard)
        const pts = await fetchPatientsOnline(currentWard)
        setPatients(pts)
        
        setDebugInfo({
          uid: user.id.slice(0, 8) + '...',
          role: profileData.role,
          ward: currentWard,
          count: pts.length,
          timestamp: new Date().toLocaleTimeString()
        })
      } catch (e: any) {
        console.error('Page Load Error:', e)
        setError(e?.message || 'Failed to load ward data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, isReady])

  const counts = {
    'high-risk': patients.filter(p => p.category === 'High Risk' && !p.is_in_er).length,
    'close-follow-up': patients.filter(p => p.category === 'Close Follow-up' && !p.is_in_er).length,
    'normal': patients.filter(p => p.category === 'Normal' && !p.is_in_er).length,
    'er-patients': patients.filter(p => p.is_in_er).length,
    'awaiting-assessment': patients.filter(p => p.category === 'Awaiting Assessment' && !p.is_in_er).length,
    'archive': patients.filter(p => p.category === 'Deceased/Archive').length,
    'pending-follow-up': patients.filter(p => {
      if (p.category === 'Deceased/Archive' || p.is_in_er) return false;
      const last = (p.last_activity_at || p.created_at) 
        ? new Date(p.last_activity_at || p.created_at).getTime() 
        : 0;
      const ageDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
      
      if (p.category === 'High Risk') return ageDays > 7;
      if (p.category === 'Close Follow-up') return ageDays > 30;
      // Normal or other
      return ageDays > 90;
    }).length,
    total: patients.filter(p => p.category !== 'Deceased/Archive' && !p.is_in_er).length,
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-t-4 border-r-4 border-teal-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="h-8 w-8 text-teal-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Loading Ward</p>
          <p className="text-sm text-slate-400 mt-1">Fetching patient records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{error}</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="pt-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            My Ward {wardName && <span className="text-slate-400 font-medium not-italic">({wardName})</span>}
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            {counts.total} patient{counts.total !== 1 ? 's' : ''} currently admitted
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ExportButton isAdmin={profile?.role?.toLowerCase() === 'admin'} />
            <AddPatientModal role={profile?.role} />
          </div>
        </div>
      </div>

      <div className="max-w-md">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block ml-1">
          Search Patients in this Ward
        </label>
        <DashboardSearch patients={patients || []} />
      </div>

      {profile?.specialty === 'psychiatry' ? (
        <div className="space-y-4 pt-4 animate-in fade-in">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Active Ward Patients</h3>
          {patients.filter(p => !p.is_in_er && p.category !== 'Deceased/Archive').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.filter(p => !p.is_in_er && p.category !== 'Deceased/Archive').map((p, i) => (
                <Link key={p.id} href={`/patient/${p.id}?view=ward`} prefetch={true}>
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer glass-card" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate">{p.name}</h4>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30">
                              <Brain className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex flex-col">
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                                {p.psychological_diagnosis || 'Unspecified'}
                              </p>
                              {p.psych_last_edit_by && (
                                <p className="text-[9px] font-medium text-indigo-400/80">
                                  Signed by {p.psych_last_edit_by}
                                </p>
                              )}
                            </div>
                          </div>
                      
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {safeJsonParse(p.psych_drugs).length > 0 ? (
                              safeJsonParse(p.psych_drugs).slice(0, 2).map((drug: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[9px] h-4 px-1.5 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">
                                  {drug.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] italic text-slate-400">No chronic psych meds</span>
                            )}
                            {safeJsonParse(p.psych_drugs).length > 2 && (
                              <span className="text-[9px] font-bold text-slate-400">+{safeJsonParse(p.psych_drugs).length - 2} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                        <span className="text-slate-400 group-hover:text-indigo-600 transition-colors font-bold text-lg">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
               <Activity className="h-10 w-10 text-slate-300 mb-3" />
               <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No active patients found in this ward</p>
             </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon
          const count = counts[cat.slug as keyof typeof counts] as number
          
          // Hide awaiting assessment if empty
          if (cat.slug === 'awaiting-assessment' && count === 0) return null
          return (
            <Link key={cat.slug} href={`/dashboard/category/${cat.slug}`} prefetch={true}>
              <div
                className={`group relative rounded-2xl border ${cat.border} ${cat.lightBg} p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 overflow-hidden animate-in fade-in slide-in-from-bottom-2`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient}`} />
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 rounded-lg sm:rounded-xl ${cat.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${cat.iconColor}`} />
                  </div>
                  <span className="text-xl sm:text-2xl">{cat.dot}</span>
                </div>
                <div className={`text-2xl sm:text-4xl font-bold mb-0.5 sm:mb-1 ${cat.slug === 'pending-follow-up' && count > 0 ? 'text-rose-600 dark:text-rose-400' : cat.countColor}`}>
                  {count}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{cat.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {cat.slug === 'pending-follow-up' 
                    ? (count === 0 ? 'All caught up' : `${count} overdue patient${count !== 1 ? 's' : ''}`)
                    : count === 0 ? 'No patients' : count === 1 ? '1 patient' : `${count} patients`}
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  {cat.slug === 'pending-follow-up' ? 'Review priority' : 'View patients'}
                  <svg className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Archive / Deceased Section */}
      <Link href="/dashboard/category/archive" prefetch={true}>
        <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-6 cursor-pointer transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800/80">
                <AlertCircle className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚫</span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Archived / Deceased</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Access clinical records for patients who have been discharged or declared deceased.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                {counts['archive']}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Records</div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* ── ER Patients Section ── */}
      <Link href="/dashboard/er" prefetch={true}>
        <div className="group relative rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-6 cursor-pointer transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '310ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚑</span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">ER Patients</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Patients from {wardName || 'your ward'} currently receiving emergency care.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                {counts['er-patients']}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current in ER</div>
            </div>
          </div>
        </div>
      </Link>
      </>
      )}

      {/* Debug Monitor - Unobtrusive but accessible for diagnostics */}
      {(profile?.role?.toLowerCase() === 'admin' || profile?.ward_name === 'Master Ward') && debugInfo && (
        <div className="mt-20 pt-8 border-t border-dashed border-slate-200 dark:border-slate-800 opacity-20 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
             <Activity className="h-3 w-3" /> System Diagnostic Monitor
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Profile Ward</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{debugInfo.ward}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Visibility Load</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{debugInfo.count} Records</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Auth Ref</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{debugInfo.uid}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Sync Link</p>
                <p className="text-xs font-black text-emerald-600">Online/Realtime</p>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
