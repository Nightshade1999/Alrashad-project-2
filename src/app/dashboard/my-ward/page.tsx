"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Clock, Activity, CalendarClock, Loader2, RefreshCw } from 'lucide-react'
import { ExportButton } from '@/components/dashboard/export-button'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'
import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'

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

interface PatientSummary {
  id: string
  name: string
  room_number: string | null
  category: string
  is_in_er: boolean
}

async function fetchPatientsOnline(wardName: string): Promise<PatientSummary[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('patients')
    .select('id, name, room_number, category, is_in_er')
    .eq('ward_name', wardName)
  return (data as PatientSummary[]) || []
}

async function fetchPatientsOffline(ps: any, wardName: string): Promise<{ pts: PatientSummary[], err: string | null }> {
  try {
    const data = await ps.getAll(
      `SELECT id, name, room_number, category, is_in_er FROM patients WHERE ward_name = ?`,
      [wardName]
    )
    return { pts: data as PatientSummary[], err: null }
  } catch (e: any) {
    return { pts: [], err: e.message || 'Unknown SQLite error' }
  }
}

export default function MyWardPage() {
  const router = useRouter()
  const ps = usePowerSync()
  const [wardName, setWardName] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offlineFetchError, setOfflineFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }

        let profile: any = null

        if (navigator.onLine) {
          const { data } = await supabase
            .from('user_profiles')
            .select('ward_name')
            .eq('user_id', user.id)
            .maybeSingle()
          profile = data as any
          // Cache so offline mode always knows the current ward
          if ((data as any)?.ward_name) localStorage.setItem(`profile_cache_${user.id}`, JSON.stringify(data))
        } else {
          // 1. Try PowerSync SQLite
          if (ps) {
            try {
              const psResult = (await ps.getAll('SELECT ward_name FROM user_profiles WHERE user_id = ?', [user.id]))[0] as any
              if (psResult?.ward_name) profile = psResult
            } catch (err) {
              console.warn('PowerSync SQLite empty, trying cache...')
            }
          }
          // 2. Fall back to localStorage cache
          if (!(profile as any)?.ward_name) {
            const cached = localStorage.getItem(`profile_cache_${user.id}`)
            if (cached) { try { profile = JSON.parse(cached) } catch {} }
          }
        }

        if (!loading && !profile?.ward_name) {
          router.replace('/dashboard/select-ward');
          return;
        }

        setWardName(profile.ward_name)

        let pts: PatientSummary[] = []
        if (navigator.onLine) {
          pts = await fetchPatientsOnline(profile.ward_name)
          setOfflineFetchError(null)
        } else if (ps) {
          const res = await fetchPatientsOffline(ps, profile.ward_name)
          pts = res.pts
          setOfflineFetchError(res.err)
          
          if (pts.length === 0 && !res.err) {
            // Check if ANY patients exist in DB
            try {
              const all = await ps.getAll('SELECT count(*) as c FROM patients')
              setOfflineFetchError(`DB total patients: ${(all as any)[0]?.c}`)
            } catch {}
          }
        }
        setPatients(pts)
      } catch (e: any) {
        setError(e?.message || 'Failed to load ward data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ps])

  const counts = {
    'High Risk': patients.filter(p => p.category === 'High Risk' && !p.is_in_er).length,
    'Close Follow-up': patients.filter(p => p.category === 'Close Follow-up' && !p.is_in_er).length,
    'Normal': patients.filter(p => p.category === 'Normal' && !p.is_in_er).length,
    'ER Patients': patients.filter(p => p.is_in_er).length,
    'Deceased/Archive': patients.filter(p => p.category === 'Deceased/Archive').length,
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            My Ward {wardName && <span className="text-slate-400 font-medium">({wardName})</span>}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} patient{counts.total !== 1 ? 's' : ''} currently admitted
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ExportButton />
            <AddPatientModal />
          </div>
          {offlineFetchError && (
            <div className="text-sm font-bold text-red-500 bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded">
              Debug offline: {offlineFetchError}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block ml-1">
          Search Patients in this Ward
        </label>
        <DashboardSearch patients={patients || []} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon
          const count = counts[cat.dbValue as keyof typeof counts] as number
          return (
            <Link key={cat.slug} href={`/dashboard/category/${cat.slug}`} prefetch={true}>
              <div
                className={`group relative rounded-2xl border ${cat.border} ${cat.lightBg} p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 overflow-hidden animate-in fade-in slide-in-from-bottom-2`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cat.gradient}`} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${cat.iconBg} group-hover:scale-110 transition-transform duration-300`}>
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
                {counts['Deceased/Archive']}
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
                {counts['ER Patients']}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current in ER</div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
