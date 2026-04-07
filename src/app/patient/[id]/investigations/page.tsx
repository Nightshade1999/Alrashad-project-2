import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { format, parseISO } from "date-fns"

export const dynamic = 'force-dynamic'

const LAB_FIELDS = [
  { key: 'wbc', label: 'WBC', alertLow: 4, alertHigh: 11 },
  { key: 'hb', label: 'Hb', alertLow: 10 },
  { key: 's_urea', label: 'S.Urea', alertHigh: 40 },
  { key: 's_creatinine', label: 'S.Creat', alertHigh: 1.2 },
  { key: 'ast', label: 'AST', alertHigh: 40 },
  { key: 'alt', label: 'ALT', alertHigh: 40 },
  { key: 'tsb', label: 'TSB', alertHigh: 1.2 },
  { key: 'hba1c', label: 'HbA1c', unit: '%', alertHigh: 6.5 },
  { key: 'rbs', label: 'RBS', alertHigh: 200 },
  { key: 'esr', label: 'ESR', alertHigh: 20 },
  { key: 'crp', label: 'CRP', alertHigh: 10 },
] as const

export default async function InvestigationsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ filter?: string }>
}) {
  const { id } = await params
  const { filter } = await searchParams
  const isErFilter = (await searchParams).filter === 'er'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: patient } = await supabase.from("patients").select("id, name, room_number").eq("id", id).single()
  if (!patient) notFound()

  let query = supabase
    .from("investigations")
    .select("*")
    .eq("patient_id", id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })

  if (isErFilter) {
    query = query.eq('is_er', true)
  }
  // Remove the 'else' part so it shows everything in ward view (Ward + ER)

  const { data: investigations } = await query

  const visitIds = investigations?.map(i => i.visit_id).filter(Boolean) || []
  const { data: visits } = visitIds.length > 0 ? await supabase.from('visits').select('id, doctor_id').in('id', visitIds) : { data: [] }
  const { data: profiles } = await supabase.from('user_profiles').select('user_id, doctor_name')
  
  const visitToDoctorMap: Record<string, string> = {}
  visits?.forEach(v => {
    const prof = profiles?.find(p => p.user_id === v.doctor_id)
    if (prof) visitToDoctorMap[v.id] = prof.doctor_name || 'Unknown'
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={isErFilter ? `/patient/${id}?view=er` : `/patient/${id}?view=ward`}>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white dark:bg-slate-900">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isErFilter ? 'ER Investigations History' : 'Ward Investigations History'}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">{patient.name} · {patient.room_number}</p>
          </div>
        </div>
        <AddInvestigationModal patientId={id} isEr={isErFilter} />
      </div>

      {investigations && investigations.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Scrollable Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32 sticky left-0 bg-slate-50 dark:bg-slate-800/60">Date</th>
                  {LAB_FIELDS.map(f => (
                    <th key={f.key} className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">Other & Custom</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administered By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {investigations.map((inv, i) => (
                  <tr key={inv.id} className={`hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors ${i === 0 ? 'font-medium' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-1.5">
                        {i === 0 && <span className="h-1.5 w-1.5 rounded-full bg-teal-500 inline-block" />}
                        {format(parseISO(inv.date), 'dd MMM yyyy, HH:mm')}
                        {inv.is_er && (
                          <span className="text-[8px] bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1 rounded-sm font-black uppercase tracking-tighter">
                            ER
                          </span>
                        )}
                      </div>
                    </td>
                    {LAB_FIELDS.map(f => {
                      const val = inv[f.key as keyof typeof inv]
                      const isHigh = 'alertHigh' in f && val != null && (val as number) > (f.alertHigh as number)
                      const isLow = 'alertLow' in f && val != null && (val as number) < (f.alertLow as number)
                      return (
                        <td key={f.key} className={`px-4 py-3.5 text-center tabular-nums ${isHigh || isLow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {val != null ? `${val}${'unit' in f ? f.unit : ''}` : <span className="text-muted-foreground/50">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5 justify-start">
                        {Array.isArray(inv.other_labs) && inv.other_labs.map((l: any, idx: number) => (
                           <div key={idx} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-slate-500 uppercase">{l.name}:</span>
                              <span className="text-blue-600 dark:text-blue-400">{l.value}</span>
                           </div>
                        ))}
                        {(!inv.other_labs || inv.other_labs.length === 0) && (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap text-[9px] text-muted-foreground/40 italic font-serif">
                      <div className="flex items-center justify-end gap-1.5 mt-2 opacity-20 hover:opacity-100 transition-opacity cursor-default select-none group">
                        <span className="h-[0.5px] w-6 bg-slate-400 group-hover:bg-slate-600 transition-colors"></span>
                        <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-slate-500">
                          Verified By:
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                          Dr. {inv.doctor_name || (inv.visit_id && visitToDoctorMap[inv.visit_id]) || 'Unknown Clinician'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <FlaskConical className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Investigations Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add lab results using the button above.</p>
        </div>
      )}
    </div>
  )
}
