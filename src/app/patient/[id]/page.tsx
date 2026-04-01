import Link from "next/link"
import { notFound } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  ArrowLeft, AlertTriangle, Activity, FileText,
  User, Database, Layers, Heart, FlaskConical as Flask, Clipboard as ClipboardIcon
} from "lucide-react"
import { DeletePatientButton } from "@/components/patient/delete-button"
import { EditPatientModal } from "@/components/patient/edit-patient-modal"
import { CategorySwitcher } from "@/components/patient/category-switcher"
import { ExportPatientButton } from "@/components/patient/export-button"
import { AIAdviceSection } from "@/components/patient/ai-advice-section"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'High Risk':       { label: 'High Risk',       color: 'text-red-700 dark:text-red-300',    bg: 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800',    dot: '🔴' },
  'Close Follow-up': { label: 'Close Follow-up', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800', dot: '🟡' },
  'Normal':          { label: 'Normal',          color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800', dot: '🟢' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-slate-800 dark:text-slate-100">{value || <span className="italic text-muted-foreground">None</span>}</p>
    </div>
  )
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single()
  if (!patient) notFound()

  const { data: visits } = await supabase
    .from("visits").select("*").eq("patient_id", id)
    .order("visit_date", { ascending: false })

  const { data: investigations } = await supabase
    .from("investigations").select("*").eq("patient_id", id)
    .order("date", { ascending: false })

  const { count: visitCount } = await supabase
    .from("visits").select("id", { count: "exact", head: true }).eq("patient_id", id)

  const { count: invCount } = await supabase
    .from("investigations").select("id", { count: "exact", head: true }).eq("patient_id", id)

  const lastVisit = visits?.[0] ?? null
  const lastInv = investigations?.[0] ?? null
  const catStyle = CATEGORY_STYLES[patient.category] ?? CATEGORY_STYLES['Normal']

  // Ensure data is serializable for Client Components (JSON-safe)
  const displayPatient = JSON.parse(JSON.stringify({
    ...patient,
    lastHba1c: lastInv?.hba1c,
    lastHb: lastInv?.hb,
    lastVisit: lastVisit?.visit_date,
    investigations: investigations || [],
    visits: visits || []
  }))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/category/${
            patient.category === 'High Risk' ? 'high-risk'
            : patient.category === 'Close Follow-up' ? 'close-follow-up'
            : 'normal'
          }`}>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white dark:bg-slate-900">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight" dir="auto">
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">{patient.age} years old · {patient.gender}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CategorySwitcher patientId={patient.id} currentCategory={patient.category} />
          <AddVisitModal patientId={patient.id} variant="icon" />
          <AddInvestigationModal patientId={patient.id} variant="icon" />
          <ExportPatientButton patient={displayPatient} />
          <EditPatientModal patient={patient} />
          <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
        </div>
      </div>

      {/* ── Demographics + Medical Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Demographics */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Patient Info</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <InfoRow label="Bed / Ward" value={patient.ward_number} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Age" value={`${patient.age} years`} />
            <InfoRow label="Category" value={`${catStyle.dot} ${patient.category}`} />
            {patient.allergies && (
              <div className="col-span-2 flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">Allergies</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{patient.allergies}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40">
              <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Medical History</h2>
          </div>
          <div className="p-5 space-y-4">
            <InfoRow label="Chronic Diseases" value={patient.chronic_diseases} />
            <InfoRow label="Past Surgeries" value={patient.past_surgeries} />
          </div>
        </div>
      </div>

      {/* ── Medications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-violet-50/60 dark:bg-violet-900/10">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Psychiatric Medications</h2>
          </div>
          <div className="p-5">
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3">
              {patient.psych_drugs || <span className="italic text-muted-foreground not-italic font-sans">None</span>}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/60 dark:bg-teal-900/10">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Internal Medical Drugs</h2>
          </div>
          <div className="p-5">
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3">
              {patient.medical_drugs || <span className="italic text-muted-foreground not-italic font-sans">None</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Last Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Last Investigation Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-900/10">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Flask className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Last Investigation</h2>
            {lastInv?.date && <span className="ml-auto text-xs text-muted-foreground">{format(parseISO(lastInv.date), 'dd MMM yyyy')}</span>}
          </div>
          {lastInv ? (
            <div className="p-5 grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'HbA1c', value: lastInv.hba1c, unit: '%', alert: lastInv.hba1c > 6.5 },
                { label: 'Hb', value: lastInv.hb, unit: '', alert: lastInv.hb < 10 },
                { label: 'WBC', value: lastInv.wbc, unit: '', alert: false },
                { label: 'S.Creat', value: lastInv.s_creatinine, unit: '', alert: false },
                { label: 'RBS', value: lastInv.rbs, unit: '', alert: false },
                { label: 'TSB', value: lastInv.tsb, unit: '', alert: false },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-lg font-bold tabular-nums ${item.alert ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {item.value != null ? `${item.value}${item.unit}` : '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">No investigations recorded</div>
          )}
        </div>

        {/* Last Visit Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-900/10">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Last Visit</h2>
            {lastVisit?.visit_date && <span className="ml-auto text-xs text-muted-foreground">{format(parseISO(lastVisit.visit_date), 'dd MMM yyyy')}</span>}
          </div>
          {lastVisit ? (
            <div className="p-5">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 rounded-lg p-4">
                {lastVisit.exam_notes || <span className="italic text-muted-foreground">No notes recorded</span>}
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">No visits recorded</div>
          )}
        </div>
      </div>

      {/* ── Full History Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Investigations Card */}
        <Link href={`/patient/${id}/investigations`}>
          <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/40 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Investigations History
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {invCount ?? 0} record{(invCount ?? 0) !== 1 ? 's' : ''} · Full lab results &amp; trends
                </p>
              </div>
              <svg className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Visits Card */}
        <Link href={`/patient/${id}/visits`}>
          <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Visit Notes History
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {visitCount ?? 0} visit{(visitCount ?? 0) !== 1 ? 's' : ''} · Clinical notes &amp; exam findings
                </p>
              </div>
              <svg className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <AIAdviceSection patientData={displayPatient} />
    </div>
  )
}
