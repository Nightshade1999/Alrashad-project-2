"use client"

import Link from "next/link"
import { 
  AlertCircle, Activity, FileText, User, 
  Heart, Database, Layers, FlaskConical as Flask, 
  Clipboard as ClipboardIcon, ArrowLeft,
  Syringe, LogOut, BrainCircuit, PlusCircle, 
  Stethoscope, Thermometer, Droplets, Home, Ambulance
} from "lucide-react"
import { ReferralModal } from "@/components/patient/referral-modal"
import { DeletePatientButton } from "@/components/patient/delete-button"
import { DeclareDeathModal } from "@/components/patient/declare-death-modal"
import { MoveToErModal } from "@/components/patient/move-to-er-modal"
import { ExportPatientButton } from "@/components/patient/export-button"
import { AIAdviceSection } from "@/components/patient/ai-advice-section"
import { NavigationButtons } from "@/components/layout/navigation-buttons"
import { AddInvestigationModal } from "@/components/patient/add-investigation-modal"
import { AddVisitModal } from "@/components/patient/add-visit-modal"
import { ErTreatmentEditor } from "@/components/patient/er-treatment-editor"
import { ShareAIPromptModal } from "@/components/patient/share-ai-prompt-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { Pill } from "lucide-react"
import { isLabAbnormal, safeJsonParse } from "@/lib/utils"
import { AddReminderModal } from "@/components/reminders/add-reminder-modal"

export function ErPatientDetail({ 
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
  const erVisits = visits.filter(v => v.is_er)
  const erLabs = investigations.filter(i => i.is_er)
  
  const lastErVisit = erVisits[0] ?? null
  const lastErLab = erLabs[0] ?? null

  const displayPatient = {
    ...patient,
    lastHba1c: lastErLab?.hba1c,
    lastHb: lastErLab?.hb,
    lastVisit: lastErVisit?.visit_date,
    investigations: erLabs,
    visits: erVisits
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto overflow-x-hidden px-1">
      {/* ── Top Bar with Actions ── */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <NavigationButtons />
             <div>
               <h1 className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100 flex items-center gap-2">
                 <AlertCircle className="h-6 w-6 text-rose-600" />
                 {patient.name}
               </h1>
               <div className="flex items-center gap-2 mt-0.5">
                 <Badge className="bg-rose-600 text-white font-black text-[10px] h-4">ER ADMISSION</Badge>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    {patient.age}y · {patient.gender} · {wardName}
                 </p>
               </div>
             </div>
           </div>
        </div>

        {/* ── Referral Banner ── */}
        {patient.is_referred && (
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

        {/* ── ER Action Bar Icons ── */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm overflow-visible">
           {/* Add Lab */}
           <AddInvestigationModal patientId={patient.id} isEr={true} disabled={patient.is_referred} />
           
           {/* Add Visit */}
           <AddVisitModal patientId={patient.id} isEr={true} disabled={patient.is_referred} />
           
           {/* Add Treatment (Tx Icon) */}
           <ErTreatmentEditor 
             patientId={patient.id} 
             initialTreatments={safeJsonParse(patient.er_treatment)} 
             disabled={patient.is_referred}
             trigger={
               <Button variant="outline" size="icon" className="h-10 w-10 border-indigo-200 dark:border-indigo-900 bg-white" title="Edit Treatment">
                 <Pill className="h-5 w-5 text-indigo-600" />
               </Button>
             } 
           />

           {/* Add Reminder */}
           <AddReminderModal patientId={patient.id} patientName={patient.name} />

           {/* Refer */}
           {!patient.is_referred && <ReferralModal patientId={patient.id} isReferred={false} />}

           {/* Export Doc */}
           <ExportPatientButton patient={displayPatient} />
           
           {/* AI Consult */}
           <ShareAIPromptModal patient={displayPatient} />

           {/* Move back to Ward (as ER return) */}
           <MoveToErModal patientId={patient.id} isEr={true} disabled={patient.is_referred} />
           <DeclareDeathModal patientId={patient.id} currentCategory={patient.category} disabled={patient.is_referred} />
           <DeletePatientButton patientId={patient.id} variant="outline" redirectOnDelete={true} />
        </div>
      </div>

      {/* ── Patient Demographics & Chronic History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
         <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <User className="h-4 w-4 text-rose-600" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Demographics</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Ward</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{wardName}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{patient.age}y / {patient.gender}</p>
               </div>
               <div className="col-span-2 border-t border-rose-100 dark:border-rose-900/30 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Psychological Diagnosis</p>
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{patient.psychological_diagnosis || 'None recorded'}</p>
               </div>
               <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chronic Diseases</p>
                  <div className="flex flex-wrap gap-1">
                     {safeJsonParse(patient.chronic_diseases).length > 0 ? (
                       safeJsonParse(patient.chronic_diseases).map((d: any, i: number) => (
                         <Badge key={i} variant="outline" className="bg-white text-[10px] px-1.5 h-5">{d.name || d}</Badge>
                       ))
                     ) : <span className="text-xs italic text-slate-400">None</span>}
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Heart className="h-4 w-4 text-teal-600" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Chronic Medications</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Internal Meds</p>
                  <ul className="space-y-1">
                    {safeJsonParse(patient.medical_drugs).length > 0 ? (
                      safeJsonParse(patient.medical_drugs).map((m: any, i: number) => (
                        <li key={i} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Droplets className="h-2.5 w-2.5 text-teal-500" /> {m.name}
                        </li>
                      ))
                    ) : <li className="text-xs italic text-slate-400">None</li>}
                  </ul>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Psychiatric Meds</p>
                  <ul className="space-y-1">
                    {safeJsonParse(patient.psych_drugs).length > 0 ? (
                      safeJsonParse(patient.psych_drugs).map((p: any, i: number) => (
                        <li key={i} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <BrainCircuit className="h-2.5 w-2.5 text-violet-500" /> {p.name}
                        </li>
                      ))
                    ) : <li className="text-xs italic text-slate-400">None</li>}
                  </ul>
               </div>
            </div>
         </div>
      </div>

      {/* ── ER Admission Note ── */}
      <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6 shadow-sm">
         <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
               <div className="p-1.5 bg-rose-600 rounded-lg">
                 <ClipboardIcon className="h-4 w-4 text-white" />
               </div>
               <h2 className="text-sm font-black uppercase tracking-widest text-rose-900 dark:text-rose-100">ER Admission Note</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-rose-500">
                 {patient.er_admission_date ? format(parseISO(patient.er_admission_date), 'dd MMM yyyy, HH:mm') : 'Unknown Date'}
              </span>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">Chief Complaint</p>
                  <p className="text-lg font-black italic text-rose-900 dark:text-rose-100 leading-tight">
                    "{patient.er_chief_complaint || 'No complaint recorded'}"
                  </p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">Admission Doctor Note</p>
                  <p className="text-sm text-rose-800/80 dark:text-rose-100/70 whitespace-pre-line leading-relaxed">
                    {patient.er_admission_notes || 'No notes provided at admission.'}
                  </p>
                  {patient.er_admission_notes && (
                    <div className="flex items-center justify-end gap-2 mt-4 opacity-20 hover:opacity-100 transition-opacity cursor-default select-none group">
                      <span className="h-[0.5px] w-8 bg-rose-900/30 dark:bg-rose-100/30"></span>
                      <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-rose-900/80 dark:text-rose-100/80">
                        Physician Signed:
                      </span>
                      <span className="text-[10px] font-black uppercase text-rose-950 dark:text-rose-50">
                        Dr. {patient.er_admission_doctor || 'Unknown'}
                      </span>
                    </div>
                  )}
               </div>
            </div>

          <div className="bg-white/60 dark:bg-rose-900/20 rounded-2xl p-5 border border-rose-100 dark:border-rose-800/50 flex flex-col justify-center">
               <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-2">Admission Vitals</p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-rose-500" />
                    <div>
                       <p className="text-[9px] text-slate-400 uppercase leading-none">BP / HR</p>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-200">120/80 · 72</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Thermometer className="h-4 w-4 text-rose-500" />
                    <div>
                       <p className="text-[9px] text-slate-400 uppercase leading-none">Temp / SpO2</p>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-200">37.2°C · 98%</p>
                    </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* ── Live ER Status ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
         <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
               <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                 <ClipboardIcon className="h-4 w-4 text-emerald-600" />
               </div>
               <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Last Visit (ER)</h3>
            </div>
            {lastErVisit ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{lastErVisit.exam_notes}"</p>
                
                {/* Vitals Summary */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 py-2 border-y border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="h-3 w-3 text-rose-500" />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                      {lastErVisit.bp_sys || '?'}/{lastErVisit.bp_dia || '?'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                      {lastErVisit.pr ? `${lastErVisit.pr} bpm` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                      {lastErVisit.spo2 ? `${lastErVisit.spo2}%` : '--'}
                    </span>
                  </div>
                </div>

                {/* Status Flags Summary */}
                <div className="flex flex-wrap gap-1">
                  {[
                    lastErVisit.is_conscious ? 'Conscious' : 'Unconscious',
                    lastErVisit.is_oriented ? 'Oriented' : 'Disoriented',
                    lastErVisit.is_ambulatory ? 'Ambulatory' : 'Bed-bound',
                    lastErVisit.is_dyspnic ? 'Dyspnic' : null,
                    lastErVisit.is_soft_abdomen ? 'Soft Abdomen' : 'Abdomen Not Soft'
                  ].filter(Boolean).map((flag) => (
                    <span key={flag} className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {flag}
                    </span>
                  ))}
                </div>

                <p className="text-[10px] font-bold text-emerald-600 pt-1">
                  {format(parseISO(lastErVisit.visit_date), 'dd MMM, HH:mm')}
                </p>
              </div>
            ) : <p className="text-xs italic text-slate-400 py-2">No follow-up visits in ER yet.</p>}
         </div>

         <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
               <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                 <Flask className="h-4 w-4 text-blue-600" />
               </div>
               <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Last Labs (ER)</h3>
            </div>
            {lastErLab ? (
               <div className="p-1 grid grid-cols-3 gap-2 text-center">
                  {[
                    { key: 'wbc', label: 'WBC', value: lastErLab.wbc },
                    { key: 'hb', label: 'Hb', value: lastErLab.hb },
                    { key: 'urea', label: 'Urea', value: lastErLab.s_urea },
                    { key: 'creat', label: 'Creat', value: lastErLab.s_creatinine },
                    { key: 'ast', label: 'AST', value: lastErLab.ast },
                    { key: 'alt', label: 'ALT', value: lastErLab.alt },
                    { key: 'tsb', label: 'TSB', value: lastErLab.tsb },
                    { key: 'hba1c', label: 'HbA1c', value: lastErLab.hba1c },
                    { key: 'rbs', label: 'RBS', value: lastErLab.rbs },
                    { key: 'esr', label: 'ESR', value: lastErLab.esr },
                    { key: 'crp', label: 'CRP', value: lastErLab.crp },
                    ...(Array.isArray(lastErLab.other_labs) ? lastErLab.other_labs.map((l: any) => ({ 
                         key: 'other', 
                         label: l.name, 
                         value: l.value 
                    })) : [])
                  ]
                  .filter(item => item.value !== null && item.value !== undefined && item.value !== '')
                  .map(item => (
                    <div key={item.label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl py-2 px-1">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{item.label}</p>
                      <p className={`text-sm font-bold ${isLabAbnormal(item.key === 'other' ? item.label : item.key, item.value) ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.value ?? '—'}
                      </p>
                    </div>
                  ))}
               </div>
            ) : <p className="text-xs italic text-slate-400 py-2">No lab results in ER yet.</p>}
         </div>

         <ErTreatmentEditor patientId={patient.id} initialTreatments={safeJsonParse(patient.er_treatment)} />
      </div>

      {/* ── History Cards & Navigation ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
         <Link href={`/patient/${patient.id}/visits?filter=er`} className="block">
           <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-colors group cursor-pointer h-full">
              <div className="flex items-center gap-3">
                 <FileText className="h-6 w-6 text-indigo-400" />
                 <div className="flex-1">
                    <h4 className="font-bold text-white group-hover:text-indigo-300">Doctor Visits</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{erVisits.length} ER Records</p>
                 </div>
              </div>
           </div>
         </Link>

         <Link href={`/patient/${patient.id}/investigations?filter=er`} className="block">
           <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-colors group cursor-pointer h-full">
              <div className="flex items-center gap-3">
                 <Flask className="h-6 w-6 text-blue-400" />
                 <div className="flex-1">
                    <h4 className="font-bold text-white group-hover:text-blue-300">Lab Values</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{erLabs.length} ER Records</p>
                 </div>
              </div>
           </div>
         </Link>

         <Link href={`/patient/${patient.id}?view=ward`} className="block">
           <div className="bg-emerald-950 p-5 rounded-2xl border border-emerald-900 hover:bg-emerald-900 transition-colors group cursor-pointer h-full shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                 <Home className="h-6 w-6 text-emerald-400" />
                 <div className="flex-1">
                    <h4 className="font-bold text-white">Ward Info</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Permanent Record</p>
                 </div>
              </div>
           </div>
         </Link>
      </div>

      {/* ── AI System ── */}
      {aiEnabled && (
         <div className="mt-4 pt-10 border-t border-rose-100 dark:border-rose-900/30">
            <AIAdviceSection patientData={displayPatient} aiEnabled={aiEnabled} />
         </div>
      )}
    </div>
  )
}
