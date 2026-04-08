"use client"

import { useState, useEffect, use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { AlertCircle, Clock, Activity, CalendarClock, Loader2, RefreshCw } from 'lucide-react'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { PatientList, type PatientRow } from '@/components/dashboard/patient-list'
import { createClient } from '@/lib/supabase'
import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'

const CATEGORY_MAP: Record<string, {
  label: string; dbValue: string | null; icon: any
  gradient: string; lightBg: string; border: string
  iconBg: string; iconColor: string; dot: string
  description?: string
}> = {
  'high-risk': {
    label: 'High Risk', dbValue: 'High Risk', icon: AlertCircle,
    gradient: 'from-red-500 to-rose-600', lightBg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-900/40', iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400', dot: '🔴',
  },
  'close-follow-up': {
    label: 'Close Follow-up', dbValue: 'Close Follow-up', icon: Clock,
    gradient: 'from-amber-500 to-orange-500', lightBg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/40', iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400', dot: '🟡',
  },
  'normal': {
    label: 'Normal Follow-up', dbValue: 'Normal', icon: Activity,
    gradient: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/40', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400', dot: '🟢',
  },
  'pending-follow-up': {
    label: 'Pending Follow-up', dbValue: 'ALL', icon: CalendarClock,
    gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-900/40', iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400', dot: '🕐',
    description: 'All patients sorted by oldest last visit — review who needs attention first.',
  },
  'archive': {
    label: 'Archive (Deceased)', dbValue: 'Deceased/Archive', icon: AlertCircle,
    gradient: 'from-slate-500 to-slate-700', lightBg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-slate-200 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-400', dot: '⚫',
  },
}

function getDynamicAge(baseAge: number, timestampIso?: string): number {
  if (!timestampIso) return baseAge;
  const ts = new Date(timestampIso);
  const now = new Date();
  let diffYears = now.getFullYear() - ts.getFullYear();
  if (now.getMonth() < ts.getMonth() || (now.getMonth() === ts.getMonth() && now.getDate() < ts.getDate())) {
    diffYears--;
  }
  return baseAge + Math.max(0, diffYears);
}

async function fetchRowsOnline(supabase: any, categoryDbValue: string | null, targetWard: string | null, isAdmin: boolean): Promise<PatientRow[]> {
  let query = supabase
    .from('patients')
    .select('id, name, age, room_number, chronic_diseases, category, is_in_er, created_at, date_of_death, cause_of_death, previous_category')
    .order('created_at', { ascending: false })

  if (categoryDbValue !== 'Deceased/Archive') {
    query = query.eq('is_in_er', false)
  }
  if (categoryDbValue && categoryDbValue !== 'ALL') {
    query = query.eq('category', categoryDbValue)
  }
  if (targetWard) {
    query = query.eq('ward_name', targetWard)
  }

  const { data: patients } = await query
  if (!patients || patients.length === 0) return []

  const ids = patients.map((p: any) => p.id)
  const [investigationsRes, visitsRes] = await Promise.all([
    supabase.from('investigations').select('patient_id, hba1c, hb, date').in('patient_id', ids).order('date', { ascending: false }),
    supabase.from('visits').select('patient_id, visit_date, bp_sys, bp_dia, pr, spo2, temp').in('patient_id', ids).order('visit_date', { ascending: false })
  ])

  const investigations = investigationsRes.data
  const visits = visitsRes.data

  const latestInv: Record<string, { hba1c: number | null; hb: number | null }> = {}
  for (const inv of investigations ?? []) {
    if (!latestInv[inv.patient_id]) latestInv[inv.patient_id] = { hba1c: inv.hba1c, hb: inv.hb }
  }

  const latestVisit: Record<string, { date: string; bp_sys: number | null; bp_dia: number | null; pr: number | null; spo2: number | null; temp: number | null }> = {}
  for (const v of visits ?? []) {
    if (!latestVisit[v.patient_id]) {
      latestVisit[v.patient_id] = { date: v.visit_date, bp_sys: v.bp_sys ?? null, bp_dia: v.bp_dia ?? null, pr: v.pr ?? null, spo2: v.spo2 ?? null, temp: v.temp ?? null }
    }
  }

  return patients.map((p: any) => ({
    id: p.id, name: p.name, age: getDynamicAge(p.age, p.created_at), room_number: p.room_number,
    chronic_diseases: p.chronic_diseases, category: p.category,
    lastHba1c: latestInv[p.id]?.hba1c ?? null, lastHb: latestInv[p.id]?.hb ?? null,
    lastVisit: latestVisit[p.id]?.date ?? null,
    lastBpSys: latestVisit[p.id]?.bp_sys ?? null, lastBpDia: latestVisit[p.id]?.bp_dia ?? null,
    lastPr: latestVisit[p.id]?.pr ?? null, lastSpo2: latestVisit[p.id]?.spo2 ?? null,
    lastTemp: latestVisit[p.id]?.temp ?? null,
    date_of_death: p.date_of_death, cause_of_death: p.cause_of_death, previous_category: p.previous_category,
  }))
}

async function fetchRowsOffline(ps: any, categoryDbValue: string | null, wardName: string | null): Promise<PatientRow[]> {
  try {
    let whereClause = ''
    const params: any[] = []
    
    const conditions: string[] = []
    if (categoryDbValue && categoryDbValue !== 'ALL') {
      conditions.push('category = ?')
      params.push(categoryDbValue)
    }
    if (categoryDbValue !== 'Deceased/Archive') {
      conditions.push('is_in_er = 0')
    }
    if (wardName) {
      conditions.push('ward_name = ?')
      params.push(wardName)
    }
    if (conditions.length > 0) whereClause = 'WHERE ' + conditions.join(' AND ')

    const patients = await ps.getAll(
      `SELECT id, name, age, room_number, chronic_diseases, category, is_in_er, created_at FROM patients ${whereClause} ORDER BY created_at DESC`,
      params
    ) as any[]

    if (!patients || patients.length === 0) return []

    return patients.map((p: any) => ({
      id: p.id, name: p.name, age: getDynamicAge(p.age, p.created_at),
      room_number: p.room_number, chronic_diseases: typeof p.chronic_diseases === 'string' ? JSON.parse(p.chronic_diseases || '[]') : p.chronic_diseases || [],
      category: p.category, lastHba1c: null, lastHb: null, lastVisit: null,
      lastBpSys: null, lastBpDia: null, lastPr: null, lastSpo2: null, lastTemp: null,
    }))
  } catch (e) {
    console.error('Offline fetch failed:', e)
    return []
  }
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const category = CATEGORY_MAP[slug]
  const ps = usePowerSync()
  const [rows, setRows] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!category) return
    
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        let targetWard: string | null = null
        let isAdmin = false
        
        if (navigator.onLine) {
          const userId = user?.id || ''
          const { data: profile } = await supabase.from('user_profiles').select('role, ward_name').eq('user_id', userId).maybeSingle()
          isAdmin = (profile as any)?.role === 'admin'
          targetWard = isAdmin ? null : ((profile as any)?.ward_name || null)
          const data = await fetchRowsOnline(supabase, category.dbValue, targetWard, isAdmin)
          setRows(data)
        } else if (ps) {
          // In offline mode, get ward from PS
          const userId = user?.id || ''
          const profilePs = await ps.get('SELECT ward_name, role FROM user_profiles WHERE user_id = ?', [userId]) as any
          targetWard = profilePs?.role === 'admin' ? null : (profilePs?.ward_name || null)
          const data = await fetchRowsOffline(ps, category.dbValue, targetWard)
          setRows(data)
        }
      } catch (e) {
        console.error('Category page load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, ps, category])

  if (!category) { notFound(); return null }

  const Icon = category.icon
  const isPending = slug === 'pending-follow-up'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`relative rounded-2xl border ${category.border} ${category.lightBg} p-6 overflow-hidden`}>
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${category.gradient}`} />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${category.iconBg}`}>
              <Icon className={`h-6 w-6 ${category.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.dot}</span>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{category.label}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loading ? (
                  <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
                ) : (
                  category.description ? category.description : `${rows.length} patient${rows.length !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
          {!isPending && <AddPatientModal />}
        </div>
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-t-3 border-r-3 border-teal-500 animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading patients...</p>
        </div>
      ) : (
        <PatientList patients={rows} defaultSort={isPending ? 'overdue' : 'name'} />
      )}
    </div>
  )
}
