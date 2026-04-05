import Link from "next/link"
import { notFound } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  ArrowLeft, AlertTriangle, Activity, FileText, Home,
  User, Database, Layers, Heart, FlaskConical as Flask, Clipboard as ClipboardIcon, Cross
} from "lucide-react"
import { DeletePatientButton } from "@/components/patient/delete-button"
import { EditPatientModal } from "@/components/patient/edit-patient-modal"
import { DeclareDeathModal } from "@/components/patient/declare-death-modal"
import { CategorySwitcher } from "@/components/patient/category-switcher"
import { ExportPatientButton } from "@/components/patient/export-button"
import { AIAdviceSection } from "@/components/patient/ai-advice-section"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { RestorePatientButton } from "@/components/patient/restore-patient-button"
import { ShareAIPromptModal } from "@/components/patient/share-ai-prompt-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'High Risk':       { label: 'High Risk',       color: 'text-red-700 dark:text-red-300',    bg: 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800',    dot: '🔴' },
  'Close Follow-up': { label: 'Close Follow-up', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800', dot: '🟡' },
  'Normal':          { label: 'Normal',          color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800', dot: '🟢' },
  'Deceased/Archive':{ label: 'Deceased/Archive',color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700', dot: '⚫' },
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:space-y-0.5">
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{value ? value : <span className="italic text-muted-foreground opacity-50">None</span>}</div>
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

  // Safely normalize all JSONB arrays that might be returned as strings from Supabase text columns
  function safeParse(val: any) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }
  
  patient.allergies = safeParse(patient.allergies);
  patient.past_surgeries = safeParse(patient.past_surgeries);
  patient.chronic_diseases = safeParse(patient.chronic_diseases);
  patient.psych_drugs = safeParse(patient.psych_drugs);
  patient.medical_drugs = safeParse(patient.medical_drugs);

  const { data: visits } = await supabase
    .from("visits").select("*").eq("patient_id", id)
    .order("visit_date", { ascending: false })

  const { data: investigations } = await supabase
    .from("investigations").select("*").eq("patient_id", id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })

  const { count: visitCount } = await supabase
    .from("visits").select("id", { count: "exact", head: true }).eq("patient_id", id)

  const { count: invCount } = await supabase
    .from("investigations").select("id", { count: "exact", head: true }).eq("patient_id", id)

  const lastVisit = visits?.[0] ?? null
  const lastInv = investigations?.[0] ?? null
  const catStyle = CATEGORY_STYLES[patient.category] ?? CATEGORY_STYLES['Normal']

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

  // Ensure data is serializable for Client Components (JSON-safe)
  const displayPatient = JSON.parse(JSON.stringify({
    ...patient,
    age: getDynamicAge(patient.age, patient.created_at),
    lastHba1c: lastInv?.hba1c,
    lastHb: lastInv?.hb,
    lastVisit: lastVisit?.visit_date,
    investigations: investigations || [],
    visits: visits || []
  }))

  const isDeceased = patient.category === 'Deceased/Archive';

  // Fetch current user profile for AI permission check
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('ai_enabled')
    .eq('user_id', authUser?.id)
    .single()

  const aiEnabled = userProfile?.ai_enabled ?? true

  return (
    <div className="space-y-6 max-w-5xl mx-auto overflow-x-hidden px-1">
      
      {/* ── Deceased Banner ── */}
      {isDeceased && (
        <div className="bg-slate-800 text-slate-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-lg">
              <Cross className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight text-white">Patient Archived (Deceased)</h2>
              <p className="text-sm text-slate-300">
                Date of Death: {patient.date_of_death ? format(parseISO(patient.date_of_death), 'dd MMM yyyy') : 'Unknown'}
              </p>
            </div>
          </div>
          {patient.cause_of_death && (
            <div className="text-right hidden sm:block">
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider">Cause of Death</p>
              <p className="text-sm font-medium max-w-xs truncate">{patient.cause_of_death}</p>
            </div>
          )}
          <div className="ml-4 shrink-0">
             <RestorePatientButton patientId={patient.id} previousCategory={patient.previous_category} />
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/category/${
            patient.category === 'High Risk' ? 'high-risk'
            : patient.category === 'Close Follow-up' ? 'close-follow-up'
            : patient.category === 'Deceased/Archive' ? 'archive'
            : 'normal'
          }`}>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-white dark:bg-slate-900" title="Back to Category">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-white dark:bg-slate-900 text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Dashboard">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className={`text-xl sm:text-2xl font-bold leading-tight truncate ${isDeceased ? 'text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-800 dark:text-slate-100'}`} dir="auto">
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground whitespace-nowrap">{patient.age}y · {patient.gender}</p>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <p className="text-xs font-bold text-teal-600 uppercase tracking-tighter">Room {patient.room_number}</p>
            </div>
          </div>
        </div>
        
        {/* Actions - Structured Grid on Mobile for Better Arrangement */}
        <div className="w-full sm:w-auto">
          {!isDeceased ? (
            <div className="grid grid-cols-4 sm:flex sm:items-center gap-2 items-center">
              <div className="col-span-4 sm:col-span-1">
                <CategorySwitcher patientId={patient.id} currentCategory={patient.category} />
              </div>
              <AddVisitModal patientId={patient.id} variant="icon" />
              <AddInvestigationModal patientId={patient.id} variant="icon" />
              <ExportPatientButton patient={displayPatient} />
              <ShareAIPromptModal patient={displayPatient} />
              <EditPatientModal patient={patient} />
              <DeclareDeathModal patientId={patient.id} currentCategory={patient.category} />
              <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
              <ExportPatientButton patient={displayPatient} />
              <ShareAIPromptModal patient={displayPatient} />
              <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
            </div>
          )}
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
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-3 sm:gap-4">
            <InfoRow label="Ward / Room" value={`${patient.doctor_ward || 'N/A'} / ${patient.room_number}`} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Age" value={`${patient.age} years`} />
            <InfoRow label="Category" value={`${catStyle.dot} ${patient.category}`} />
            <InfoRow label="Province" value={patient.province} />
            <InfoRow label="Education" value={patient.education_level} />
            <div className="col-span-2">
               <InfoRow label="Relative Status" value={
                  patient.relative_status === 'Known' 
                  ? <span className="text-emerald-600 font-bold">Known ({patient.relative_visits || '0'} visits / 3mo)</span> 
                  : <span className="text-slate-400 italic font-medium">Unknown</span>
                } 
              />
            </div>
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="col-span-2 flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-2.5 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-0.5">Alert: Allergies</p>
                  <p className="text-xs text-red-800 dark:text-red-200 font-bold leading-tight">{patient.allergies.join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40">
              <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Medical History</h2>
          </div>
          <div className="p-4 sm:p-5 flex-1 relative flex flex-col gap-4 overflow-auto max-h-[300px]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Chronic Diseases</p>
              {patient.chronic_diseases && patient.chronic_diseases.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(patient.chronic_diseases as any[]).map((d: any, i: number) => (
                    <Badge key={i} variant={d.type === 'preset' ? "default" : "secondary"}>
                      {d.name}
                    </Badge>
                  ))}
                </div>
              ) : <p className="text-sm italic text-muted-foreground">None</p>}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Past Surgeries</p>
              {patient.past_surgeries && patient.past_surgeries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(patient.past_surgeries as string[]).map((s: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-slate-50">{s}</Badge>
                  ))}
                </div>
              ) : <p className="text-sm italic text-muted-foreground">None</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Medications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Psych Drugs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-violet-50/60 dark:bg-violet-900/10 shrink-0">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Psychiatric Medications</h2>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[300px]">
             {patient.psych_drugs && patient.psych_drugs.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(patient.psych_drugs as any[]).map((drug: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{drug.name}</p>
                        <Badge variant="secondary" className="h-4 px-1.5 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 font-mono text-[9px] uppercase tracking-tighter">{drug.frequency}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Dose: {drug.dosage}</p>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="p-5">
                  <p className="text-sm italic text-muted-foreground">None prescribed</p>
                </div>
             )}
          </div>
        </div>

        {/* Medical Drugs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/60 dark:bg-teal-900/10 shrink-0">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Internal Medical Drugs</h2>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[300px]">
             {patient.medical_drugs && patient.medical_drugs.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(patient.medical_drugs as any[]).map((drug: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{drug.name}</p>
                        <Badge variant="secondary" className="h-4 px-1.5 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 font-mono text-[9px] uppercase tracking-tighter">{drug.frequency}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Dose: {drug.dosage}</p>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="p-5">
                  <p className="text-sm italic text-muted-foreground">None prescribed</p>
                </div>
             )}
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
                { label: 'HbA1c', value: lastInv.hba1c, unit: '%', alert: lastInv.hba1c != null && lastInv.hba1c > 6.5 },
                { label: 'Hb', value: lastInv.hb, unit: '', alert: lastInv.hb != null && lastInv.hb < 10 },
                { label: 'WBC', value: lastInv.wbc, unit: '', alert: lastInv.wbc != null && (lastInv.wbc > 11 || lastInv.wbc < 4) },
                { label: 'S.Creat', value: lastInv.s_creatinine, unit: '', alert: lastInv.s_creatinine != null && lastInv.s_creatinine > 1.2 },
                { label: 'S.Urea', value: lastInv.s_urea, unit: '', alert: lastInv.s_urea != null && lastInv.s_urea > 40 },
                { label: 'RBS', value: lastInv.rbs, unit: '', alert: lastInv.rbs != null && lastInv.rbs > 200 },
                { label: 'TSB', value: lastInv.tsb, unit: '', alert: lastInv.tsb != null && lastInv.tsb > 1.2 },
                { label: 'AST', value: lastInv.ast, unit: '', alert: lastInv.ast != null && lastInv.ast > 40 },
                { label: 'ALT', value: lastInv.alt, unit: '', alert: lastInv.alt != null && lastInv.alt > 40 },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-lg font-bold tabular-nums truncate ${item.alert ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
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
            <div className="p-5 space-y-4">
              {(lastVisit.bp_sys || lastVisit.pr || lastVisit.spo2 || lastVisit.temp) && (
                <div className="grid grid-cols-4 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">BP</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {lastVisit.bp_sys ? `${lastVisit.bp_sys}/${lastVisit.bp_dia || '?'}` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">PR</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{lastVisit.pr || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">SpO2</p>
                    <p className={`text-sm font-bold ${lastVisit.spo2 && lastVisit.spo2 < 94 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {lastVisit.spo2 ? `${lastVisit.spo2}%` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Temp</p>
                    <p className={`text-sm font-bold ${lastVisit.temp && lastVisit.temp > 37.5 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {lastVisit.temp ? `${lastVisit.temp}°C` : '—'}
                    </p>
                  </div>
                </div>
              )}
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

      {!isDeceased && <AIAdviceSection patientData={displayPatient} aiEnabled={aiEnabled} />}
    </div>
  )
}
