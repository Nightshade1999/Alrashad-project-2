import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CategoryView } from '@/components/dashboard/category-view'
import type { PatientRow } from '@/components/dashboard/patient-list'

// Minimal server-side mapping to resolve DB values
const SERVER_CATEGORY_DB_MAP: Record<string, string | null> = {
  'high-risk': 'High Risk',
  'close-follow-up': 'Close Follow-up',
  'normal': 'Normal',
  'pending-follow-up': 'ALL',
  'archive': 'Deceased/Archive',
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

async function fetchRowsOnline(supabase: any, categoryDbValue: string | null, targetWard: string | null): Promise<PatientRow[]> {
  let query = supabase
    .from('patients')
    .select('id, name, age, room_number, chronic_diseases, category, is_in_er, created_at, date_of_death, cause_of_death, previous_category, last_activity_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (categoryDbValue !== 'Deceased/Archive') {
    query = query.eq('is_in_er', false)
  }
  if (categoryDbValue && categoryDbValue !== 'ALL') {
    query = query.eq('category', categoryDbValue)
  }
  if (targetWard) {
    query = query.eq('ward_name', targetWard)
  }

  const { data: patients, error: pError } = await query
  if (pError) {
    console.error('Supabase query error (patients):', {
      message: pError.message,
      details: pError.details,
      hint: pError.hint,
      code: pError.code
    })
  }
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

  return patients.map((p: any) => {
    const lVisit = latestVisit[p.id]?.date || null
    const lInv = investigations?.find((inv: any) => inv.patient_id === p.id)?.date || null
    
    // True Reality: Max of master activity, latest visit log, latest inv log, or creation date
    const dates = [p.last_activity_at, lVisit, lInv, p.created_at].filter(Boolean) as string[]
    const trueLastActivity = dates.length > 0 
      ? dates.reduce((a, b) => new Date(a) > new Date(b) ? a : b)
      : null

    return {
      id: p.id, name: p.name, age: getDynamicAge(p.age, p.created_at), room_number: p.room_number,
      chronic_diseases: p.chronic_diseases, category: p.category,
      lastHba1c: latestInv[p.id]?.hba1c ?? null, lastHb: latestInv[p.id]?.hb ?? null,
      lastVisit: trueLastActivity,
      lastBpSys: latestVisit[p.id]?.bp_sys ?? null, lastBpDia: latestVisit[p.id]?.bp_dia ?? null,
      lastPr: latestVisit[p.id]?.pr ?? null, lastSpo2: latestVisit[p.id]?.spo2 ?? null,
      lastTemp: latestVisit[p.id]?.temp ?? null,
      date_of_death: p.date_of_death, cause_of_death: p.cause_of_death, previous_category: p.previous_category,
    }
  })
}

export default async function CategoryPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>, 
  searchParams: Promise<{ ward?: string }> 
}) {
  const { slug } = await params
  const { ward: wardFilter } = await searchParams
  if (!(slug in SERVER_CATEGORY_DB_MAP)) notFound()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || ''
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, ward_name')
    .eq('user_id', userId)
    .maybeSingle() as any

  const userWard = (profile as any)?.ward_name || null
  const isAdmin = (profile as any)?.role === 'admin'
  const isMaster = userWard === 'Master' || userWard === 'Master Ward' || (isAdmin && (!userWard || userWard === 'Unassigned'))
  
  // Visibility Policy: Use URL ward if present, else workstation ward (unless it is Master/Unassigned)
  const targetWard = wardFilter || (isMaster ? null : userWard)
  
  const dbValue = SERVER_CATEGORY_DB_MAP[slug]
  const rows = await fetchRowsOnline(supabase, dbValue, targetWard)
  const isPending = slug === 'pending-follow-up'

  return (
    <CategoryView 
      slug={slug}
      rows={rows}
      isPending={isPending}
    />
  )
}
