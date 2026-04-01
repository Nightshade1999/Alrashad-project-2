import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ClipboardList, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { format, parseISO, formatDistanceToNow } from "date-fns"

export const dynamic = 'force-dynamic'

export default async function VisitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: patient } = await supabase.from("patients").select("id, name, ward_number").eq("id", id).single()
  if (!patient) notFound()

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/patient/${id}`}>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white dark:bg-slate-900">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Visit Notes</h1>
            <p className="text-sm text-muted-foreground" dir="auto">{patient.name} · {patient.ward_number}</p>
          </div>
        </div>
        <AddVisitModal patientId={id} />
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
                    {format(parseISO(visit.visit_date), 'dd MMMM yyyy')}
                  </span>
                  {i === 0 && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                      Latest
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(visit.visit_date), { addSuffix: true })}
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {visit.exam_notes || <span className="italic text-muted-foreground">No notes recorded</span>}
                </p>
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
