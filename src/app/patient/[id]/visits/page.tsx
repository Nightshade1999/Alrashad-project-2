import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ClipboardList, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { AddPsychVisitModal } from "@/components/patient/add-psych-visit-modal"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { DeleteRecordButton } from "@/components/patient/delete-record-button"

export const dynamic = 'force-dynamic'

export default async function VisitsPage({ 
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

  // Fetch all doctor profiles to map doctor_id to name safely
  const { data: profiles } = await supabase.from("user_profiles").select("user_id, doctor_name")
  const doctorMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.doctor_name || 'Unknown']))

  const { data: currentUserProfile } = await supabase.from("user_profiles").select("specialty").eq("user_id", currentUser?.id).single()
  const isPsych = currentUserProfile?.specialty === 'psychiatry'

  let query = supabase
    .from("visits")
    .select("*, created_at")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (isErFilter) {
    query = query.eq('is_er', true)
  }
  
  if (!isPsych) {
    query = query.not('is_psych_note', 'eq', true)
  }

  const { data: visits } = await query

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
              {isErFilter ? 'ER Visit Notes' : 'Ward Visit Notes'}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">{patient.name} · {patient.room_number}</p>
          </div>
        </div>
        {isPsych ? (
          <AddPsychVisitModal patientId={id} />
        ) : (
          <AddVisitModal patientId={id} isEr={isErFilter} />
        )}
      </div>

      {visits && visits.length > 0 ? (
        <div className="space-y-4">
          {visits.map((visit, i) => (
            <div key={visit.id} className={`relative bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${i === 0 ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'}`}>
              {i === 0 && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500" />}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${i === 0 ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold text-sm ${i === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {format(parseISO(visit.visit_date), 'dd MMM yyyy, HH:mm')}
                  </span>
                  {visit.is_er && (
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                      ER
                    </span>
                  )}
                  {visit.is_psych_note && (
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                      PSYCH
                    </span>
                  )}
                  {i === 0 && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(parseISO(visit.visit_date), { addSuffix: true })}
                  </span>
                  {currentUser && (
                    <DeleteRecordButton 
                      recordId={visit.id}
                      table="visits"
                      creatorId={visit.doctor_id}
                      createdAt={visit.created_at}
                      currentUserId={currentUser.id}
                    />
                  )}
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(visit.bp_sys || visit.pr || visit.spo2 || visit.temp) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    {visit.bp_sys && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">BP:</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{visit.bp_sys}/{visit.bp_dia || '?'}</span>
                      </div>
                    )}
                    {visit.pr && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">PR:</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{visit.pr} <span className="text-[10px] font-normal text-muted-foreground">BPM</span></span>
                      </div>
                    )}
                    {visit.spo2 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">SpO2:</span>
                        <span className={`text-sm font-bold ${visit.spo2 < 94 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{visit.spo2}%</span>
                      </div>
                    )}
                    {visit.temp && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Temp:</span>
                        <span className={`text-sm font-bold ${visit.temp > 37.5 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{visit.temp}°C</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {visit.exam_notes || <span className="italic text-muted-foreground">No notes recorded</span>}
                </p>
                  <div className="flex items-center justify-end gap-1.5 mt-4 opacity-20 hover:opacity-100 transition-opacity cursor-default select-none group">
                    <span className="h-[0.5px] w-6 bg-slate-400 group-hover:bg-slate-600 transition-colors"></span>
                    <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-slate-500">
                      Physician Signed:
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                      Dr. {doctorMap[visit.doctor_id] || 'Unknown'}
                    </span>
                  </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <ClipboardList className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Visits Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add a visit note using the button above.</p>
        </div>
      )}
    </div>
  )
}
