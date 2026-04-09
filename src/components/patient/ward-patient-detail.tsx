"use client"

import Link from "next/link"
import { 
  AlertTriangle, Activity, FileText, User, 
  Heart, Database, Layers, FlaskConical as Flask, 
  Clipboard as ClipboardIcon, Ambulance 
} from "lucide-react"
import { ReferralModal } from "@/components/patient/referral-modal"
import { DeletePatientButton } from "@/components/patient/delete-button"
import { EditPatientModal } from "@/components/patient/edit-patient-modal"
import { DeclareDeathModal } from "@/components/patient/declare-death-modal"
import { MoveToErModal } from "@/components/patient/move-to-er-modal"
import { CategorySwitcher } from "@/components/patient/category-switcher"
import { ExportPatientButton } from "@/components/patient/export-button"
import { AIAdviceSection } from "@/components/patient/ai-advice-section"
import { NavigationButtons } from "@/components/layout/navigation-buttons"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { RestorePatientButton } from "@/components/patient/restore-patient-button"
import { ShareAIPromptModal } from "@/components/patient/share-ai-prompt-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { isLabAbnormal, safeJsonParse } from "@/lib/utils"
import { AddReminderModal } from "@/components/reminders/add-reminder-modal"

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

export function WardPatientDetail({ 
  patient, 
  visits, 
  investigations, 
  aiEnabled, 
  wardName 
}: { 
  patient: any, 
  visits: any[], 
  investigations: any[], 
  aiEnabled: boolean,
  wardName?: string
}) {
  const lastVisit = visits?.[0] ?? null
  const lastInv = investigations?.[0] ?? null
  const catStyle = CATEGORY_STYLES[patient.category] ?? CATEGORY_STYLES['Normal']
  const isDeceased = patient.category === 'Deceased/Archive';

  const displayPatient = {
    ...patient,
    lastHba1c: lastInv?.hba1c,
    lastHb: lastInv?.hb,
    lastVisit: lastVisit?.visit_date,
    investigations: investigations || [],
    visits: visits || []
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto overflow-x-hidden px-1">
      
      {/* ── Deceased Banner ── */}
      {isDeceased && (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-lg animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-xl">
              <Activity className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Classification</p>
              <h2 className="font-bold text-sm leading-tight text-white">Patient Deceased</h2>
            </div>
          </div>
          <div className="shrink-0 scale-90">
             <RestorePatientButton patientId={patient.id} previousCategory={patient.previous_category} />
          </div>
        </div>
      )}

      {/* ── Referral Banner ── */}
      {!isDeceased && patient.is_referred && (
        <div className="bg-orange-50 border border-orange-200 dark:bg-orange-950/40 dark:border-orange-900/50 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/60 p-2 rounded-xl shrink-0">
              <Ambulance className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 dark:text-orange-400">Current Status</p>
              <h2 className="font-bold text-sm leading-tight text-orange-800 dark:text-orange-100">
                Referred to {patient.referral_hospital || 'Other Hospital'}
                {patient.referral_date && <span className="ml-1 opacity-60 font-medium">({format(parseISO(patient.referral_date), "dd MMM")})</span>}
              </h2>
            </div>
          </div>
          <ReferralModal 
            patientId={patient.id} 
            isReferred={true} 
            referralHospital={patient.referral_hospital}
            referralDate={patient.referral_date}
          />
        </div>
      )}

      {/* ── ER Banner ── */}
      {!isDeceased && patient.is_in_er && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 p-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 dark:bg-rose-900/60 p-2 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400">Current Status</p>
              <h2 className="font-bold text-sm leading-tight text-rose-800 dark:text-rose-100">Currently in ER Ward</h2>
            </div>
          </div>
          <Link href={`/patient/${patient.id}?view=er`}>
            <Button variant="outline" size="sm" className="bg-white hover:bg-rose-100 text-rose-600 border-rose-200 font-bold text-xs">
              Go to ER View
            </Button>
          </Link>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <NavigationButtons />
            <div className="min-w-0">
              <h1 className={`text-lg sm:text-xl font-black leading-tight truncate ${isDeceased ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`} dir="auto">
                {patient.name}
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {patient.age}y · {patient.gender} · Room {patient.room_number}
              </p>
            </div>
          </div>
          {!isDeceased && (
            <div className="shrink-0 scale-90 sm:scale-100 origin-right">
              <CategorySwitcher patientId={patient.id} currentCategory={patient.category} />
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 px-1 py-1 overflow-visible">
          {!isDeceased ? (
            <>
              <AddVisitModal patientId={patient.id} variant="icon" disabled={patient.is_referred} />
              <AddInvestigationModal patientId={patient.id} variant="icon" disabled={patient.is_referred} />
              {!patient.is_referred && <ReferralModal patientId={patient.id} isReferred={false} />}
              <ExportPatientButton patient={displayPatient} />
              <ShareAIPromptModal patient={displayPatient} />
              <AddReminderModal patientId={patient.id} patientName={patient.name} />
              <EditPatientModal patient={patient} disabled={patient.is_referred} />
              <DeclareDeathModal patientId={patient.id} currentCategory={patient.category} disabled={patient.is_referred} />
              <MoveToErModal patientId={patient.id} isEr={patient.is_in_er} disabled={patient.is_referred} />
              <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
            </>
          ) : (
            <>
              <ExportPatientButton patient={displayPatient} />
              <ShareAIPromptModal patient={displayPatient} />
              <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
            </>
          )}
        </div>
      </div>

      {/* ── Demographics + Medical Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden glass-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Patient Info</h2>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Ward / Room" value={`${wardName || patient.ward_name || 'General Ward'} / Room ${patient.room_number}`} />
            <InfoRow label="MRN" value={patient.medical_record_number} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Age" value={`${patient.age} years`} />
            <InfoRow label="Mother Name" value={patient.mother_name} />
            <InfoRow label="Category" value={`${catStyle.dot} ${patient.category}`} />
            <InfoRow label="Province" value={patient.province} />
            <InfoRow label="Date of Admission" value={patient.admission_date ? format(parseISO(patient.admission_date), "dd MMM yyyy") : "Unknown"} />
            <InfoRow label="Education" value={patient.education_level} />
            <div className="col-span-2 border-t pt-2 mt-1">
              <InfoRow label="Psychological Diagnosis" value={patient.psychological_diagnosis} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col glass-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40">
              <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Medical History</h2>
          </div>
          <div className="p-4 sm:p-5 overflow-auto max-h-[300px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Chronic Diseases</p>
            {safeJsonParse(patient.chronic_diseases).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {safeJsonParse(patient.chronic_diseases).map((d: any, i: number) => (
                  <Badge key={i} variant="default">{d.name || d}</Badge>
                ))}
              </div>
            ) : <p className="text-sm italic text-muted-foreground">None</p>}
          </div>
        </div>
      </div>

       {/* ── Medications ── */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-fade-in" style={{ animationDelay: '0.4s' }}>
        {/* Psych Drugs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glass-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-violet-50/60 dark:bg-violet-900/10 shrink-0">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Psychiatric Medications</h2>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[300px]">
             {safeJsonParse(patient.psych_drugs).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {safeJsonParse(patient.psych_drugs).map((drug: any, i: number) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{drug.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase">{drug.frequency}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{drug.dosage}</p>
                    </div>
                  ))}
                </div>
             ) : <p className="p-5 text-sm italic text-muted-foreground">None</p>}
          </div>
        </div>

        {/* Medical Drugs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glass-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/60 dark:bg-teal-900/10 shrink-0">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Internal Medical Drugs</h2>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[300px]">
             {safeJsonParse(patient.medical_drugs).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {safeJsonParse(patient.medical_drugs).map((drug: any, i: number) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{drug.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase">{drug.frequency}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{drug.dosage}</p>
                    </div>
                  ))}
                </div>
             ) : <p className="p-5 text-sm italic text-muted-foreground">None</p>}
          </div>
        </div>
      </div>

      {/* ── Last Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-900/10">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Flask className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Last Investigation</h2>
          </div>
          {lastInv ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
              {[
                { key: 'wbc', label: 'WBC', value: lastInv.wbc },
                { key: 'hb', label: 'Hb', value: lastInv.hb },
                { key: 's_urea', label: 'Urea', value: lastInv.s_urea },
                { key: 's_creatinine', label: 'Creat', value: lastInv.s_creatinine },
                { key: 'ast', label: 'AST', value: lastInv.ast },
                { key: 'alt', label: 'ALT', value: lastInv.alt },
                { key: 'tsb', label: 'TSB', value: lastInv.tsb },
                { key: 'hba1c', label: 'HbA1c', value: lastInv.hba1c },
                { key: 'rbs', label: 'RBS', value: lastInv.rbs },
                { key: 'esr', label: 'ESR', value: lastInv.esr },
                { key: 'crp', label: 'CRP', value: lastInv.crp },
                ...(Array.isArray(lastInv.other_labs) ? lastInv.other_labs.map((l: any) => ({ 
                  key: 'other', 
                  label: l.name, 
                  value: l.value 
                })) : [])
              ]
              .filter(item => item.value !== null && item.value !== undefined && item.value !== '')
              .map(item => (
                <div key={item.label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl py-2 px-1.5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center min-h-[52px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5 leading-none">{item.label}</p>
                  <p className={`text-sm font-black tabular-nums transition-colors ${isLabAbnormal(item.key === 'other' ? item.label : item.key, item.value) ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {item.value ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 flex flex-col items-center justify-center opacity-40">
               <Flask className="h-8 w-8 text-slate-300 mb-2" />
               <p className="text-xs italic font-medium">No Investigations Recorded</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-900/10">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Last Visit</h2>
          </div>
          {lastVisit ? (
            <div className="p-5 text-sm text-slate-700 dark:text-slate-300 italic">{lastVisit.exam_notes || 'No notes'}</div>
          ) : <p className="p-8 text-center text-sm italic text-muted-foreground">No visits</p>}
        </div>
      </div>

       {/* ── Sub-pages Link Cards ── */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link href={`/patient/${patient.id}/investigations`}>
          <div className="bg-white dark:bg-slate-900 border border-blue-100 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group">
             <div className="flex items-center gap-4">
                <Activity className="text-blue-500" />
                <span className="font-bold">Investigation History</span>
             </div>
             <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
        <Link href={`/patient/${patient.id}/visits`}>
          <div className="bg-white dark:bg-slate-900 border border-emerald-100 p-6 rounded-2xl hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group">
             <div className="flex items-center gap-4">
                <FileText className="text-emerald-500" />
                <span className="font-bold">Clinical Visit History</span>
             </div>
             <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>

      {!isDeceased && <AIAdviceSection patientData={displayPatient} aiEnabled={aiEnabled} />}
    </div>
  )
}
