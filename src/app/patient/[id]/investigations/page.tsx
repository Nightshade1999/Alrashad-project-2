import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { format, parseISO } from "date-fns"
import { Label } from "@/components/ui/label"
import { InvestigationActions } from "@/components/patient/investigation-actions"
import { GueHistoryIcon } from "@/components/laboratory/GueHistoryIcon"

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
  { key: 'ldl', label: 'LDL', alertHigh: 130 },
  { key: 'hdl', label: 'HDL', alertLow: 40 },
  { key: 'tg', label: 'TG', alertHigh: 150 },
  { key: 'ka', label: 'Ka', alertLow: 3.5, alertHigh: 5.0 },
  { key: 'na', label: 'Na', alertLow: 135, alertHigh: 145 },
  { key: 'cl', label: 'Cl', alertLow: 98, alertHigh: 107 },
  { key: 'ca', label: 'Ca', alertLow: 8.5, alertHigh: 10.5 },
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

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  let query = supabase
    .from("investigations")
    .select("*, created_at")
    .eq("patient_id", id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (isErFilter) {
    query = query.eq('is_er', true)
  }
  // Remove the 'else' part so it shows everything in ward view (Ward + ER)

  const { data: investigations } = await query

  const visitIds = investigations?.map(i => i.visit_id).filter(Boolean) || []
  const { data: visits } = visitIds.length > 0 ? await supabase.from('visits').select('id, doctor_id').in('id', visitIds) : { data: [] }
  const { data: profiles } = await supabase.from('user_profiles').select('user_id, doctor_name, role')
  
  const visitToDoctorMap: Record<string, string> = {}
  visits?.forEach(v => {
    const prof = profiles?.find(p => p.user_id === v.doctor_id)
    if (prof) visitToDoctorMap[v.id] = prof.doctor_name || 'Unknown'
  })

  let userRole = 'doctor'
  if (currentUser) {
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', currentUser.id).single()
    if (profile) userRole = profile.role
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={isErFilter ? `/patient/${id}?view=er` : `/patient/${id}?view=ward`}>
            <Button variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-transform shrink-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
              {isErFilter ? 'ER History' : 'Ward History'}
            </h1>
            <p className="text-[10px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest mt-0.5" dir="auto">
              {patient.name} {patient.room_number ? `· ${patient.room_number}` : ''}
            </p>
          </div>
        </div>
        <div className="flex sm:block shrink-0">
          <AddInvestigationModal patientId={id} isEr={isErFilter} />
        </div>
      </div>

      {investigations && investigations.length > 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-700">
          {/* Draggable Grid Container */}
          <div className="overflow-x-auto w-full custom-scrollbar no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-w-[1240px] flex flex-col">
              
              {/* Header Row - Glass Effect */}
              <div className="flex bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800 items-center sticky top-0 z-40">
                <div className="sticky left-0 z-50 bg-slate-50/90 dark:bg-slate-900/95 backdrop-blur-2xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 w-32 shrink-0 border-r border-slate-200/50 dark:border-slate-700/50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                  Clinical Timeline
                </div>
                
                {LAB_FIELDS.map(f => (
                  <div key={f.key} className="px-1 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap text-center flex-1 min-w-[55px]">
                    {f.label}
                  </div>
                ))}
                
                <div className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-20 shrink-0 text-center">
                  GUE
                </div>
                
                <div className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[160px] shrink-0">
                  Custom Panel
                </div>

                <div className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[140px] shrink-0">
                  Signature
                </div>
                
                <div className="sticky right-0 z-50 bg-slate-50/90 dark:bg-slate-900/95 backdrop-blur-2xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 w-24 shrink-0 text-right border-l border-slate-200/50 dark:border-slate-700/50 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                  Actions
                </div>
              </div>

              {/* Data Rows */}
              <div className="flex flex-col divide-y divide-slate-100/50 dark:divide-slate-800/50">
                {investigations.map((inv, i) => {
                  // Calculate abnormal summary for the sticky column
                  const abnormalResults = LAB_FIELDS.filter(f => {
                    const val = inv[f.key as keyof typeof inv] as number | null
                    return ('alertHigh' in f && val != null && val > (f.alertHigh as number)) || 
                           ('alertLow' in f && val != null && val < (f.alertLow as number))
                  })

                  return (
                    <div key={inv.id} className="flex hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300 items-center group active:bg-slate-100 dark:active:bg-slate-800/40">
                      {/* Sticky Date Column - Glass Pillar */}
                      <div className="sticky left-0 z-20 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl px-4 py-3 w-32 shrink-0 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[64px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {i === 0 && <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] shrink-0" />}
                          <div className="flex flex-col min-w-0">
                             <span className="text-[11px] font-black text-slate-700 dark:text-slate-100 leading-tight">{format(parseISO(inv.date), 'dd MMM yy')}</span>
                             <span className="text-[10px] font-bold text-slate-400 leading-tight">{format(parseISO(inv.date), 'HH:mm')}</span>
                          </div>
                        </div>

                        {/* At-a-Glance Summary Badges */}
                        {abnormalResults.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1.5">
                            {abnormalResults.length > 3 ? (
                              <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm border border-rose-400 opacity-90">
                                {abnormalResults.length}+ Abnormals
                              </span>
                            ) : (
                              abnormalResults.map(f => (
                                <span key={f.key} className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-800/30 leading-none">
                                  {f.label}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Labs Data Section */}
                      {LAB_FIELDS.map(f => {
                        const val = inv[f.key as keyof typeof inv]
                        const isHigh = 'alertHigh' in f && val != null && (val as number) > (f.alertHigh as number)
                        const isLow = 'alertLow' in f && val != null && (val as number) < (f.alertLow as number)
                        return (
                          <div key={f.key} className={`px-1 py-2 text-center tabular-nums text-[12px] flex-1 min-w-[55px] ${isHigh || isLow ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-600 dark:text-slate-300 font-medium'}`}>
                            {val != null ? (
                              <div className="flex flex-col items-center">
                                <span>{val}</span>
                                {'unit' in f && <span className="text-[7px] font-black opacity-40 -mt-1">{f.unit}</span>}
                              </div>
                            ) : <span className="opacity-10">—</span>}
                          </div>
                        )
                      })}

                      {/* GUE Column */}
                      <div className="px-4 py-2 w-20 shrink-0 flex justify-center">
                         <GueHistoryIcon investigation={inv} />
                      </div>

                      <div className="px-4 py-2 w-[160px] shrink-0 min-w-0">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(inv.other_labs) && inv.other_labs.slice(0, 3).map((l: any, idx: number) => (
                             <div key={idx} className="bg-slate-100/50 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-slate-200/30 dark:border-slate-700/30">
                                <span className="text-slate-400 uppercase text-[8px]">{l.name}</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{l.value}</span>
                             </div>
                          ))}
                        </div>
                      </div>

                      {/* Signature Column */}
                      <div className="px-4 py-2 w-[140px] shrink-0 min-w-0">
                        {(() => {
                          const sigName = inv.lab_tech_name || inv.doctor_name
                          const sigId = inv.lab_tech_id || inv.doctor_id
                          const profile = profiles?.find(p => p.user_id === sigId)
                          const isDoctor = profile?.role === 'doctor' || profile?.role === 'admin'
                          
                          if (!sigName) return <span className="opacity-10 text-[10px]">System</span>
                          
                          return (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate">
                                {isDoctor && !sigName.startsWith('Dr.') ? `Dr. ${sigName}` : sigName}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                {profile?.role === 'lab_tech' ? 'Lab Tech' : profile?.role || 'Clinician'}
                              </span>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Sticky Actions Column - Glass Pillar */}
                      <div className="sticky right-0 z-20 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl px-4 py-3 w-24 shrink-0 border-l border-slate-100 dark:border-slate-800 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] h-full flex items-center justify-end">
                         <div className="flex items-center justify-end gap-1 translate-x-1 group-hover:translate-x-0 transition-transform duration-300">
                           {currentUser && (
                              <InvestigationActions 
                                investigation={inv}
                                currentUserId={currentUser.id}
                                currentUserRole={userRole}
                              />
                            )}
                         </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
