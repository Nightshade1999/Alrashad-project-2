"use client"

import Link from "next/link"
import { 
  AlertTriangle, Activity, FileText, User, 
  Heart, Database, Layers, FlaskConical as Flask, 
  Clipboard as ClipboardIcon, Ambulance, Stethoscope,
  Droplets, Thermometer, Brain
} from "lucide-react"
import { ReferralModal } from "@/components/patient/referral-modal"
import { CategorySwitcher } from "@/components/patient/category-switcher"
import { AIAdviceSection } from "@/components/patient/ai-advice-section"
import { NavigationButtons } from "@/components/layout/navigation-buttons"
import { AddReminderModal } from "@/components/reminders/add-reminder-modal"
import { GueHistoryIcon } from "@/components/laboratory/GueHistoryIcon"
import { AddNurseInstructionModal } from "@/components/patient/AddNurseInstructionModal"
import { AddPsychVisitModal } from "@/components/patient/add-psych-visit-modal"
import { EditPsychPatientModal } from "@/components/patient/edit-psych-patient-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { isLabAbnormal, safeJsonParse } from "@/lib/utils"
import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { Clock, Check, UserRoundCog, ClipboardList } from "lucide-react"
import { RestorePatientButton } from "@/components/patient/restore-patient-button"

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

export function PsychPatientDetail({ 
  patient, 
  visits, 
  investigations, 
  aiEnabled, 
  wardName,
  profile: initialProfile
}: { 
  patient: any, 
  visits: any[], 
  investigations: any[], 
  aiEnabled: boolean,
  wardName?: string,
  profile?: any
}) {
  const psychVisits = visits?.filter(v => v.is_psych_note) || [];
  const medVisits = visits?.filter(v => !v.is_psych_note) || [];

  const lastVisit = medVisits[0] ?? null;
  const lastPsychVisit = psychVisits[0] ?? null;
  const lastInv = investigations?.[0] ?? null;

  const catStyle = CATEGORY_STYLES[patient.category] ?? CATEGORY_STYLES['Normal']
  const isDeceased = patient.category === 'Deceased/Archive';
  const [instructions, setInstructions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(initialProfile || null)
  const [showAllInstructions, setShowAllInstructions] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchInstructions()
    if (!initialProfile) fetchProfile()
  }, [patient.id])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      setProfile(data)
    }
  }

  async function fetchInstructions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('nurse_instructions')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    
    if (data) setInstructions(data)
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`patient-instructions-${patient.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nurse_instructions',
          filter: `patient_id=eq.${patient.id}`
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setInstructions(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setInstructions(prev => prev.map(inst => 
              inst.id === payload.new.id ? { ...inst, ...payload.new } : inst
            ))
          } else if (payload.eventType === 'DELETE') {
            setInstructions(prev => prev.filter(inst => inst.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patient.id])

  const handleDeleteInstruction = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this instruction?")) return
    setIsDeleting(id)
    try {
      const { deleteNurseInstructionAction } = await import("@/app/actions/nurse-actions")
      const res = await deleteNurseInstructionAction(id)
      if (res.error) throw new Error(res.error)
      setInstructions(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      alert(err.message || "Failed to delete")
    } finally {
      setIsDeleting(null)
    }
  }

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
            <div className="bg-slate-800 p-2.5 rounded-xl">
              <Activity className="h-5 w-5 text-red-400" />
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
            <div className="bg-orange-100 dark:bg-orange-900/60 p-2.5 rounded-xl shrink-0">
              <Ambulance className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
            <div className="bg-rose-100 dark:bg-rose-900/60 p-2.5 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
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
        <div className="flex flex-col xs:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2.5 w-full min-w-0">
            <NavigationButtons />
            <div className="min-w-0 flex-1">
              <h1 className={`text-xl sm:text-2xl font-black leading-tight truncate ${isDeceased ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`} dir="auto">
                {patient.name}
              </h1>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                N/A · {patient.gender} · {patient.ward_name || 'General Ward'} · Room {patient.room_number}
              </p>
            </div>
          </div>
          {/* Category Switcher removed for Psych Resident */}
        </div>
        
        {/* Actions - specific to Psych residents */}
        {profile?.role?.toLowerCase() !== 'nurse' && (
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 px-1 py-1 overflow-visible">
            {!isDeceased && (
              <>
                <AddPsychVisitModal patientId={patient.id} variant="icon" disabled={patient.is_referred} />
                {!patient.is_referred && (
                  <ReferralModal 
                    patientId={patient.id} 
                    isReferred={false} 
                    patient={patient}
                    latestVisit={lastVisit}
                    latestInvestigation={lastInv}
                  />
                )}
                <AddReminderModal patientId={patient.id} patientName={patient.name} />
                <AddNurseInstructionModal 
                    patientId={patient.id} 
                    patientName={patient.name} 
                    wardName={patient.ward_name || wardName || "General Ward"} 
                    variant="icon"
                  />
              </>
            )}
          </div>
        )}
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
            <InfoRow label="Ward / Room" value={`${patient.ward_name || 'General Ward'} / Room ${patient.room_number}`} />
            <InfoRow label="MRN" value={patient.medical_record_number} />
            <InfoRow label="Gender" value={patient.gender} />
             <InfoRow label="Mother Name" value={patient.mother_name} />
            <InfoRow label="Category" value={`${catStyle.dot} ${patient.category}`} />
            <InfoRow label="Province" value={patient.province} />
             <InfoRow label="Date of Admission" value={patient.admission_date ? format(parseISO(patient.admission_date), "dd MMM yyyy") : "Unknown"} />
            <InfoRow label="Education" value={patient.education_level} />
            <div className="col-span-2 border-t pt-2 mt-1 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl p-2">
              <InfoRow label="Psychological Diagnosis" value={<span className="text-indigo-700 dark:text-indigo-400 font-bold">{patient.psychological_diagnosis || 'Unspecified'}</span>} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col glass-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-900/40">
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-xl overflow-hidden flex flex-col glass-card ring-1 ring-indigo-500/10">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm">Psychiatric Medications</h2>
            </div>
            {!patient.is_referred && !isDeceased && profile?.role?.toLowerCase() !== 'nurse' && (
                <EditPsychPatientModal patient={patient} disabled={patient.is_referred} />
            )}
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[300px]">
             {safeJsonParse(patient.psych_drugs).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {safeJsonParse(patient.psych_drugs).map((drug: any, i: number) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{drug.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase border-indigo-200 text-indigo-600 bg-indigo-50">{drug.frequency}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{drug.dosage}</p>
                    </div>
                  ))}
                </div>
             ) : <p className="p-5 text-sm italic text-muted-foreground">None</p>}
          </div>
          {(patient.psych_last_edit_by || patient.psych_last_edit_at) && (
            <div className="px-5 py-2.5 bg-indigo-50/30 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Audit Trail</p>
              <p className="text-[9px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase">
                {patient.psych_last_edit_by ? `Updated By ${patient.psych_last_edit_by}` : 'System Updated'} 
                {patient.psych_last_edit_at && ` · ${format(parseISO(patient.psych_last_edit_at), 'dd MMM HH:mm')}`}
              </p>
            </div>
          )}
        </div>

        {/* Medical Drugs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glass-card opacity-80">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-teal-50/60 dark:bg-teal-900/10 shrink-0">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Internal Medical Drugs (Read-only)</h2>
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

      {/* ── Last Snapshots (Internal Med & Psych) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Psych Visit Box */}
        <div className="bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-indigo-100 dark:border-indigo-800 bg-indigo-100/50 dark:bg-indigo-900/30">
            <div className="p-1.5 rounded-lg bg-indigo-200 dark:bg-indigo-900/60">
              <Brain className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
            </div>
            <h2 className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm">Last Psychology Note</h2>
          </div>
          {lastPsychVisit ? (
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-sm text-indigo-950 dark:text-indigo-100 font-medium italic">
                "{lastPsychVisit.exam_notes || 'No notes'}"
              </p>
              
              <div className="flex justify-between items-end border-t border-indigo-100 dark:border-indigo-800/50 pt-3">
                 <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                   {format(parseISO(lastPsychVisit.visit_date), 'dd MMM yyyy, HH:mm')}
                 </p>
                 <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                    By {lastPsychVisit.doctor_name || 'Dr.'}
                 </p>
              </div>
            </div>
          ) : <div className="p-8 text-center"><p className="text-sm italic text-indigo-400/60 font-medium">No psychology notes recorded yet.</p></div>}
        </div>

        {/* IM Visit Box (Read Only) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden opacity-80">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-900/10">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Last Internal Medicine Visit</h2>
          </div>
          {lastVisit ? (
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                "{lastVisit.exam_notes || 'No notes'}"
              </p>
              
              {/* Vitals Summary */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-t border-slate-50 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {lastVisit.bp_sys || '?'}/{lastVisit.bp_dia || '?'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {lastVisit.pr ? `${lastVisit.pr} bpm` : '--'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {lastVisit.rr ? `${lastVisit.rr} bpm` : '--'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {lastVisit.spo2 ? `${lastVisit.spo2}%` : '--'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {lastVisit.temp ? `${lastVisit.temp}°C` : '--'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold text-emerald-600">
                  {format(parseISO(lastVisit.visit_date), 'dd MMM yyyy, HH:mm')}
                </p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">
                    By {lastVisit.doctor_name || 'Dr.'}
                 </p>
              </div>
            </div>
          ) : <p className="p-8 text-center text-sm italic text-muted-foreground">No visits recorded</p>}
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
                <span className="font-bold">Combined Clinical History</span>
              </div>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>

       {!isDeceased && (
         <AIAdviceSection patientData={displayPatient} aiEnabled={aiEnabled} />
       )}

       {/* ── Nurse Instruction History ── */}
       <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden glass-card">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                   <UserRoundCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                   <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Nurse Instruction Record</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Coordination Log</p>
                </div>
             </div>
             <AddNurseInstructionModal 
               patientId={patient.id} 
               patientName={patient.name} 
               wardName={patient.ward_name || wardName || "General Ward"} 
               variant="button" 
             />
          </div>
          
          <div className="p-6">
             {instructions.length === 0 ? (
               <div className="py-12 flex flex-col items-center gap-3 opacity-30">
                  <ClipboardList className="h-10 w-10" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">No instructions recorded for this patient</p>
               </div>
             ) : (
                <div className="space-y-4">
                  {(showAllInstructions ? instructions : instructions.slice(0, 1)).map((inst) => {
                    const createdDate = new Date(inst.created_at)
                    const isEditable = profile?.user_id === inst.doctor_id && (Date.now() - createdDate.getTime() < 24 * 60 * 60 * 1000)

                    return (
                      <div key={inst.id} className={`p-4 rounded-3xl border-2 transition-all ${
                        inst.is_read 
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
                          : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/10'
                      }`}>
                         <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                               <p className="text-sm font-bold text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                  "{inst.instruction}"
                               </p>
                               <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-tight text-slate-500">
                                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                     <Stethoscope className="h-3 w-3" /> Dr. {inst.doctor_name || 'Staff Physician'}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                     <Clock className="h-3 w-3" /> Issued: {format(parseISO(inst.created_at), 'dd MMM yyyy, HH:mm')}
                                  </span>
                               </div>
                            </div>
                            
                            <div className="shrink-0 flex flex-col items-end gap-2">
                               {inst.is_read ? (
                                 <div className="flex flex-col items-end gap-1">
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 gap-1.5 px-3 py-1 text-[9px] font-black tracking-widest">
                                       <Check className="h-3 w-3" /> ACKNOWLEDGED
                                    </Badge>
                                    <p className="text-[10px] font-bold text-slate-400">
                                       By Nurse {inst.read_by_nurse_name}
                                    </p>
                                 </div>
                               ) : (
                                 <div className="flex flex-col items-end gap-2">
                                   <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 gap-1.5 px-3 py-1 text-[9px] font-black tracking-widest animate-pulse">
                                      <Clock className="h-3 w-3" /> PENDING
                                   </Badge>
                                   
                                   {isEditable && (
                                     <div className="flex items-center gap-2">
                                       <AddNurseInstructionModal 
                                         patientId={patient.id} 
                                         patientName={patient.name} 
                                         wardName={patient.ward_name} 
                                         variant="icon"
                                         initialInstruction={inst.instruction}
                                         instructionId={inst.id}
                                       />
                                       <Button 
                                         variant="ghost" 
                                         size="icon" 
                                         className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                         onClick={() => handleDeleteInstruction(inst.id)}
                                         disabled={isDeleting === inst.id}
                                       >
                                         <AlertTriangle className="h-4 w-4" />
                                       </Button>
                                     </div>
                                   )}
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    )
                  })}

                  {instructions.length > 1 && (
                    <div className="flex justify-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                        onClick={() => setShowAllInstructions(!showAllInstructions)}
                      >
                        {showAllInstructions ? "Show Less" : `Show All (${instructions.length})`}
                      </Button>
                    </div>
                  )}
               </div>
             )}
          </div>
       </div>
    </div>
  )
}
