"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Ambulance, X, Building2, Calendar, RotateCcw, FileText, CheckCircle2, Loader2, ClipboardList, Activity, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { ModalPortal } from '@/components/ui/modal-portal'
import { ReferralDocumentView } from "./referral-document-view"
import { createReferralLetterAction, getLatestReferralLetterAction } from "@/app/actions/referral-actions"
import { safeJsonParse } from "@/lib/utils"

interface ReferralModalProps {
  patientId: string
  isReferred: boolean
  referralHospital?: string | null
  referralDate?: string | null
  patient?: any // Full patient object for autofill
  latestVisit?: any
  latestInvestigation?: any
}

export function ReferralModal({ 
  patientId, 
  isReferred, 
  referralHospital, 
  referralDate,
  patient,
  latestVisit,
  latestInvestigation 
}: ReferralModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'choice' | 'accepted' | 'letter' | 'view'>('choice')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false)
  
  // Choice 2: Accepted Elsewhere State
  const [hospital, setHospital] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Choice 1: Referral Letter State
  const [letterData, setLetterData] = useState({
    destination: '',
    department: '',
    companion_name: '',
    indications: '',
    chief_complaint: '',
    history_of_present_illness: '',
    vitals_bp: '',
    vitals_pulse: '',
    vitals_temp: '',
    vitals_rr: '',
    relevant_examination: '',
    treatment_taken: '',
    investigations_text: ''
  })
  
  const [savedReferral, setSavedReferral] = useState<any>(null)
  const router = useRouter()

  // --- Suggestion Logic ---
  const fetchSuggestion = async () => {
    setIsFetchingSuggestion(true)
    try {
      const latest = await getLatestReferralLetterAction(patientId)
      if (latest?.destination) {
        setHospital(latest.destination)
      }
    } catch (err) {
      console.error("Suggestion fetch error:", err)
    } finally {
      setIsFetchingSuggestion(false)
    }
  }

  // --- Autofill Logic (User Instructions 1, 3, 4) ---
  // We sync when these props change to ensure fields aren't empty
  useEffect(() => {
    if (step === 'letter') {
      const invSummary = latestInvestigation ? [
        latestInvestigation.hb && `Hb: ${latestInvestigation.hb}`,
        latestInvestigation.wbc && `WBC: ${latestInvestigation.wbc}`,
        latestInvestigation.s_urea && `Urea: ${latestInvestigation.s_urea}`,
        latestInvestigation.s_creatinine && `Creat: ${latestInvestigation.s_creatinine}`
      ].filter(Boolean).join(", ") : ""

      setLetterData(prev => ({
        ...prev,
        chief_complaint: prev.chief_complaint || patient?.er_chief_complaint || '',
        vitals_bp: prev.vitals_bp || (latestVisit ? `${latestVisit.bp_sys}/${latestVisit.bp_dia}` : ''),
        vitals_pulse: prev.vitals_pulse || (latestVisit?.pr?.toString() || ''),
        vitals_temp: prev.vitals_temp || (latestVisit?.temp?.toString() || ''),
        investigations_text: prev.investigations_text || invSummary,
        treatment_taken: prev.treatment_taken || (patient?.er_treatment ? `${safeJsonParse(patient.er_treatment).map((t:any)=>`${t.name} ${t.dosage}`).join(', ')}` : '')
      }))
    }
  }, [step, latestVisit, latestInvestigation, patient])

  const handleStartLetter = () => {
    // 1. Initial snapshot of static data
    const erTr = safeJsonParse(patient?.er_treatment)
    const chronicMedsData = [
      ...safeJsonParse(patient?.medical_drugs),
      ...safeJsonParse(patient?.psych_drugs)
    ]
    const chronicMeds = chronicMedsData.map((m: any) => m.name || m).filter(Boolean).join(", ")
    
    const chronicDiseases = safeJsonParse(patient?.chronic_diseases).map((d: any) => d.name || d).join(", ") || "No significant chronic diseases"

    const invSummary = latestInvestigation ? [
      latestInvestigation.hb && `Hb: ${latestInvestigation.hb}`,
      latestInvestigation.wbc && `WBC: ${latestInvestigation.wbc}`,
      latestInvestigation.s_urea && `Urea: ${latestInvestigation.s_urea}`,
      latestInvestigation.s_creatinine && `Creat: ${latestInvestigation.s_creatinine}`
    ].filter(Boolean).join(", ") : ""

    // 2. Structured HPI Template
    const hpiTemplate = `A ${patient?.age || '---'} year old with hx of ${chronicDiseases}, known case of ${patient?.psychological_diagnosis || '---'} presented with `

    setLetterData(prev => ({
      ...prev,
      indications: '', 
      chief_complaint: patient?.er_chief_complaint || '',
      history_of_present_illness: hpiTemplate,
      vitals_bp: latestVisit ? `${latestVisit.bp_sys}/${latestVisit.bp_dia}` : '',
      vitals_pulse: latestVisit?.pr?.toString() || '',
      vitals_temp: latestVisit?.temp?.toString() || '',
      investigations_text: invSummary,
      treatment_taken: patient?.is_in_er && erTr.length > 0 
        ? erTr.map((t: any) => `${t.name} ${t.dosage}`).join(", ") 
        : (chronicMeds || 'No regular medications')
    }))
    
    setStep('letter')
  }

  const handleAcceptedElsewhere = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospital.trim()) {
      toast.error("Hospital name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('patients') as any)
        .update({
          is_referred: true,
          referral_hospital: hospital.trim(),
          referral_date: date,
        })
        .eq('id', patientId)

      if (error) throw error
      toast.success(`Patient referred to ${hospital.trim()}`)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(`Referral failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      // Package snapshots
      const snapshots = {
        vitals: {
          bp: letterData.vitals_bp,
          pulse: letterData.vitals_pulse,
          temp: letterData.vitals_temp,
          rr: letterData.vitals_rr
        },
        chronic_hx: {
          diseases: safeJsonParse(patient?.chronic_diseases),
          meds: safeJsonParse(patient?.medical_drugs),
          psychMeds: safeJsonParse(patient?.psych_drugs)
        },
        investigations: latestInvestigation || {},
        er_treatment: patient?.is_in_er ? safeJsonParse(patient.er_treatment) : null
      }

      const referral = await createReferralLetterAction({
        patient_id: patientId,
        doctor_id: user.id,
        destination: letterData.destination,
        department: letterData.department,
        companion_name: letterData.companion_name,
        indications: letterData.indications,
        chief_complaint: letterData.chief_complaint,
        history_of_present_illness: letterData.history_of_present_illness,
        relevant_examination: letterData.relevant_examination,
        treatment_taken: letterData.treatment_taken,
        investigations_text: letterData.investigations_text,
        vitals_snapshot: snapshots.vitals,
        chronic_hx_snapshot: snapshots.chronic_hx,
        investigations_snapshot: snapshots.investigations,
        er_treatment_snapshot: snapshots.er_treatment
      })

      setSavedReferral({ ...referral, patients: patient })
      setStep('view')
      toast.success("Referral letter saved successfully")
      router.refresh()
    } catch (err: any) {
      toast.error(`Failed to save letter: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReAccept = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('patients') as any)
        .update({
          is_referred: false,
          referral_hospital: null,
          referral_date: null,
        })
        .eq('id', patientId)

      if (error) throw error
      toast.success("Patient re-accepted successfully")
      router.refresh()
    } catch (err: any) {
      toast.error(`Re-accept failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isReferred) {
    return (
      <Button variant="outline" size="sm" onClick={handleReAccept} disabled={isSubmitting} className="h-9 px-3 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl">
        <RotateCcw className="h-3.5 w-3.5" />
        {isSubmitting ? 'Accepting...' : 'Re-accept Patient'}
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-orange-50 hover:text-orange-700 rounded-xl border-dashed" title="Refer to another hospital">
        <Ambulance className="h-3.5 w-3.5 text-orange-500" />
        Refer
      </Button>

      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => step !== 'view' && setOpen(false)} />

            <div className={`relative bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 w-full animate-scale-in flex flex-col ${step === 'view' ? 'fixed inset-0 z-[60] overflow-y-auto rounded-none bg-slate-100 dark:bg-slate-950' : 'max-w-xl max-h-[90vh] rounded-2xl'}`}>
              
              {/* Conditional Header */}
              {step !== 'view' && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-orange-50/60 dark:bg-orange-950/20 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                      <Ambulance className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">Referral System</h2>
                        {step !== 'choice' && <p className="text-[10px] uppercase font-bold text-orange-600/60">{step === 'accepted' ? 'Report Acceptance' : 'Draft Official Letter'}</p>}
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Step Content */}
              <div className={step === 'view' ? 'flex-1 overflow-visible' : 'flex-1 overflow-auto p-6'}>
                {step === 'choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={handleStartLetter}
                      className="group p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left flex flex-col h-full"
                    >
                      <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="font-bold text-lg mb-1 leading-tight">Write Referral Letter</h3>
                      <p className="text-xs text-muted-foreground">Draft a formal clinical letter in official MOH format (Bilingual).</p>
                    </button>

                    <button 
                      onClick={() => { setStep('accepted'); fetchSuggestion(); }}
                      className="group p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all text-left flex flex-col h-full"
                    >
                      <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="font-bold text-lg mb-1 leading-tight">Accepted Elsewhere</h3>
                      <p className="text-xs text-muted-foreground">Mark patient as successfully accepted at another facility.</p>
                    </button>
                  </div>
                )}

                {step === 'accepted' && (
                  <form onSubmit={handleAcceptedElsewhere} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hospital Name</Label>
                      <div className="relative">
                        <Input
                          placeholder="e.g. Al-Kindi Hospital"
                          value={hospital}
                          onChange={e => setHospital(e.target.value)}
                          required
                          className="pl-9 border-orange-200 focus-visible:ring-orange-500 font-bold"
                        />
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-orange-400" />
                        {isFetchingSuggestion && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-orange-300" />}
                      </div>
                      {hospital && !isFetchingSuggestion && (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                           <CheckCircle2 className="h-3 w-3" /> Suggested from latest draft
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acceptance Date</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-orange-200 focus-visible:ring-orange-500" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('choice')}>Back</Button>
                      <Button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                        {isSubmitting ? 'Updating...' : 'Confirm Acceptance'}
                      </Button>
                    </div>
                  </form>
                )}

                {step === 'letter' && (
                  <form onSubmit={handleSaveLetter} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400">Destination / الجهة المحال اليها</Label>
                          <Input value={letterData.destination} onChange={e => setLetterData({...letterData, destination: e.target.value})} placeholder="e.g. Specialty Center" required />
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400">Department / القسم</Label>
                          <Input value={letterData.department} onChange={e => setLetterData({...letterData, department: e.target.value})} placeholder="e.g. Cardiology" />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <Label className="text-[10px] font-bold text-slate-400">Name of companion / اسم المرافق</Label>
                       <Input value={letterData.companion_name} onChange={e => setLetterData({...letterData, companion_name: e.target.value})} placeholder="Person accompanying patient" />
                    </div>

                    {/* Clinical Summary Block */}
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                       <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className="h-4 w-4 text-indigo-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referring Summary</h4>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold text-slate-400">Indications for Referring / سبب الإحالة</Label>
                             <Textarea value={letterData.indications} onChange={e => setLetterData({...letterData, indications: e.target.value})} placeholder="Specify diagnosis, management, or second opinion..." className="min-h-[60px]" />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold text-slate-400">Chief Complaint / الشكوى الرئيسية</Label>
                             <Input value={letterData.chief_complaint} onChange={e => setLetterData({...letterData, chief_complaint: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold text-slate-400">History of present illness / تاريخ الحالة الحالي</Label>
                             <Textarea value={letterData.history_of_present_illness} onChange={e => setLetterData({...letterData, history_of_present_illness: e.target.value})} placeholder="Describe progression..." className="min-h-[80px]" />
                          </div>
                          <div className="grid grid-cols-4 gap-2 col-span-2">
                             <div className="space-y-1"><Label className="text-[9px] font-bold">BP</Label><Input value={letterData.vitals_bp} onChange={e => setLetterData({...letterData, vitals_bp: e.target.value})} className="h-8 text-xs" /></div>
                             <div className="space-y-1"><Label className="text-[9px] font-bold">Pulse</Label><Input value={letterData.vitals_pulse} onChange={e => setLetterData({...letterData, vitals_pulse: e.target.value})} className="h-8 text-xs" /></div>
                             <div className="space-y-1"><Label className="text-[9px] font-bold">Temp</Label><Input value={letterData.vitals_temp} onChange={e => setLetterData({...letterData, vitals_temp: e.target.value})} className="h-8 text-xs" /></div>
                             <div className="space-y-1"><Label className="text-[9px] font-bold">RR</Label><Input value={letterData.vitals_rr} onChange={e => setLetterData({...letterData, vitals_rr: e.target.value})} className="h-8 text-xs" /></div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400">Relevant Examination Findings / الفحوصات والنتائج</Label>
                          <Textarea value={letterData.relevant_examination} onChange={e => setLetterData({...letterData, relevant_examination: e.target.value})} placeholder="Vitals parameter, physical findings..." className="min-h-[80px]" />
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold text-slate-400">Investigations (Latest Summary)</Label>
                             <Input value={letterData.investigations_text} onChange={e => setLetterData({...letterData, investigations_text: e.target.value})} className="h-9 text-xs" />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold text-slate-400">Treatment Taken (Latest Summary)</Label>
                             <Textarea value={letterData.treatment_taken} onChange={e => setLetterData({...letterData, treatment_taken: e.target.value})} className="min-h-[60px] text-xs" />
                          </div>
                       </div>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('choice')}>Back</Button>
                      <Button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                        Save Referral Letter
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* View Step - Rendered as a Direct Portal Child to avoid parent transforms */}
            {step === 'view' && savedReferral && (
              <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-950 overflow-y-auto min-h-screen">
                <ReferralDocumentView 
                  referral={savedReferral} 
                  onBack={() => {
                    setSavedReferral(null)
                    setStep('choice')
                    setOpen(false)
                  }} 
                />
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </>
  )
}
