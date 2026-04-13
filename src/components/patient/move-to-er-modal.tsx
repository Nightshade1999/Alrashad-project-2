"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeftCircle, Activity, FlaskConical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { convertArabicNumbers } from "@/lib/utils"
import { 
  movePatientToErAction, 
  returnPatientToWardAction, 
  addVisitAction, 
  addInvestigationAction 
} from "@/app/actions/patient-actions"
import { ModalPortal } from '@/components/ui/modal-portal'

export function MoveToErModal({ patientId, isEr, disabled = false }: { patientId: string, isEr: boolean, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Form State
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [examNotes, setExamNotes] = useState('')
  
  // Vitals
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [pr, setPr] = useState('')
  const [spo2, setSpo2] = useState('')
  const [temp, setTemp] = useState('')
  const [rr, setRr] = useState('')

  // Labs (subset)
  const [wbc, setWbc] = useState('')
  const [hb, setHb] = useState('')
  const [sCreatinine, setSCreatinine] = useState('')
  const [rbs, setRbs] = useState('')
  const [alt, setAlt] = useState('')
  const [ast, setAst] = useState('')
  const [alp, setAlp] = useState('')
  const [tsb, setTsb] = useState('')
  const [esr, setEsr] = useState('')
  const [crp, setCrp] = useState('')
  const [sUrea, setSUrea] = useState('')

  const handleChiefComplaintChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Agressive prevention of > 5 words
    const words = val.trim().split(/\s+/)
    if (words.length > 5 && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertText') {
      return // block typing
    }
    // Hard cap the value
    if (words.length > 5) {
      setChiefComplaint(words.slice(0, 5).join(' '))
    } else {
      setChiefComplaint(val)
    }
  }

  const handleReturnToWard = async () => {
    setIsSubmitting(true)
    try {
      const response = await returnPatientToWardAction(patientId)
      if (response.error) throw new Error(response.error)
      
      toast.success("Patient returned to standard Ward.")
      setOpen(false)
      
      // Use router.replace to avoid the 'dead' profile page in history
      if (response.gender) {
        router.replace(`/dashboard/er/${response.gender}`)
      } else {
        router.replace('/dashboard/er')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Return Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveToEr = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chiefComplaint.trim()) { toast.error("Chief complaint is required"); return }

    setIsSubmitting(true)
    try {
      // 1. Update Patient Status via Server Action
      const moveRes = await movePatientToErAction({
        patient_id: patientId,
        chief_complaint: chiefComplaint.trim(),
        admission_notes: examNotes.trim(),
        actingDoctorName: localStorage.getItem('wardManager_lastDoctorName') || undefined
      })
      if (moveRes.error) throw new Error(moveRes.error)

      const nowIso = new Date().toISOString()
      
      // 2. Create Visit Note (if vitals/notes provided)
      if (examNotes.trim() || bpSys || pr || temp || spo2) {
        await addVisitAction({
          patient_id: patientId,
          visit_date: nowIso.split('T')[0],
          visit_time: nowIso.split('T')[1].slice(0, 5),
          exam_notes: examNotes.trim() || "ER Admission Note",
          bp_sys: bpSys ? parseInt(convertArabicNumbers(bpSys)) : null,
          bp_dia: bpDia ? parseInt(convertArabicNumbers(bpDia)) : null,
          pr: pr ? parseInt(convertArabicNumbers(pr)) : null,
          spo2: spo2 ? parseInt(convertArabicNumbers(spo2)) : null,
          temp: temp ? parseFloat(convertArabicNumbers(temp)) : null,
          rr: rr ? parseInt(convertArabicNumbers(rr)) : null,
          is_er: true,
          actingDoctorName: localStorage.getItem('wardManager_lastDoctorName') || undefined
        })
      }

      // 3. Create Investigation if Labs provided
      if (wbc || hb || sCreatinine || rbs) {
        await addInvestigationAction({
          patient_id: patientId,
          date: nowIso.split('T')[0],
          time: nowIso.split('T')[1].slice(0, 5),
          wbc: wbc ? parseFloat(convertArabicNumbers(wbc)) : null,
          hb: hb ? parseFloat(convertArabicNumbers(hb)) : null,
          s_creatinine: sCreatinine ? parseFloat(convertArabicNumbers(sCreatinine)) : null,
          rbs: rbs ? parseFloat(convertArabicNumbers(rbs)) : null,
          alt: alt ? parseFloat(convertArabicNumbers(alt)) : null,
          ast: ast ? parseFloat(convertArabicNumbers(ast)) : null,
          alp: alp ? parseFloat(convertArabicNumbers(alp)) : null,
          tsb: tsb ? parseFloat(convertArabicNumbers(tsb)) : null,
          esr: esr ? parseFloat(convertArabicNumbers(esr)) : null,
          crp: crp.trim() || null,
          s_urea: sUrea ? parseFloat(convertArabicNumbers(sUrea)) : null,
          is_er: true,
          actingDoctorName: localStorage.getItem('wardManager_lastDoctorName') || undefined
        })
      }

      toast.success("Patient moved to ER Ward with details.")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to move: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If already in ER, render the simple return button
  if (isEr) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleReturnToWard}
        disabled={isSubmitting || disabled}
        className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowLeftCircle className="h-3.5 w-3.5 text-indigo-600" />
        Return to Ward
      </Button>
    )
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      >
        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
        Move to ER
      </Button>

      {open && (
         <ModalPortal>
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{touchAction:'none'}} onClick={() => setOpen(false)} />
           
           <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg flex flex-col max-h-[95dvh] animate-scale-in">
             {/* Header */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/20">
               <div className="flex items-center gap-2">
                 <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40">
                   <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                 </div>
                 <h2 className="font-bold text-slate-800 dark:text-slate-100">ER Admission</h2>
               </div>
               <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                 <X className="h-4 w-4 text-muted-foreground" />
               </button>
             </div>

             <form onSubmit={handleMoveToEr} className="p-6 space-y-5 modal-scroll flex-1 shrink min-h-0">
                {/* Chief Complaint */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief Complaint <span className="text-rose-500">*</span></Label>
                  <Input 
                    placeholder="e.g. Severe chest pain (Max 5 words)"
                    value={chiefComplaint}
                    onChange={handleChiefComplaintChange}
                    required
                    className="border-rose-200 focus-visible:ring-rose-500"
                  />
                  <p className="text-[10px] text-right text-slate-500">{chiefComplaint.trim() ? chiefComplaint.trim().split(/\s+/).length : 0}/5 words</p>
                </div>

                {/* Vitals */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" /> Vitals
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div className="col-span-2 sm:col-span-1">
                        <Label className="text-[10px] text-muted-foreground">BP</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input placeholder="120" value={bpSys} onChange={e => setBpSys(e.target.value)} className="h-8 text-xs px-2" />
                          <span className="text-slate-300">/</span>
                          <Input placeholder="80" value={bpDia} onChange={e => setBpDia(e.target.value)} className="h-8 text-xs px-2" />
                        </div>
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">PR</Label>
                        <Input placeholder="72" value={pr} onChange={e => setPr(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">SpO2</Label>
                        <Input placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">Temp</Label>
                        <Input placeholder="37.0" value={temp} onChange={e => setTemp(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">RR</Label>
                        <Input placeholder="18" value={rr} onChange={e => setRr(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                  </div>
                </div>

                {/* Doctor Note */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Clinical Exam Notes</span>
                    <span className="text-[9px] text-slate-400 font-normal normal-case">Optional</span>
                  </Label>
                  <Textarea 
                    placeholder="Enter examination details..."
                    value={examNotes}
                    onChange={e => setExamNotes(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Basic Labs */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <FlaskConical className="h-3.5 w-3.5 text-blue-500" /> ER Screen Labs (Opt)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div>
                        <Label className="text-[10px] text-muted-foreground">WBC</Label>
                        <Input placeholder="wbc" value={wbc} onChange={e => setWbc(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">Hb</Label>
                        <Input placeholder="hb" value={hb} onChange={e => setHb(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                     <div>
                        <Label className="text-[10px] text-muted-foreground">Creatinine</Label>
                        <Input placeholder="creat" value={sCreatinine} onChange={e => setSCreatinine(e.target.value)} className="h-8 text-xs mt-1" />
                     </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">RBS</Label>
                         <Input placeholder="rbs" value={rbs} onChange={e => setRbs(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">Urea</Label>
                         <Input placeholder="urea" value={sUrea} onChange={e => setSUrea(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">ALT</Label>
                         <Input placeholder="alt" value={alt} onChange={e => setAlt(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">AST</Label>
                         <Input placeholder="ast" value={ast} onChange={e => setAst(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">ALP</Label>
                         <Input placeholder="alp" value={alp} onChange={e => setAlp(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">TSB</Label>
                         <Input placeholder="tsb" value={tsb} onChange={e => setTsb(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">ESR</Label>
                         <Input placeholder="esr" value={esr} onChange={e => setEsr(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                         <Label className="text-[10px] text-muted-foreground">CRP</Label>
                         <Input placeholder="crp" value={crp} onChange={e => setCrp(e.target.value)} className="h-8 text-xs mt-1" />
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white">
                    {isSubmitting ? 'Transferring...' : 'Transfer to ER'}
                  </Button>
                </div>
             </form>
           </div>
         </div>
         </ModalPortal>
      )}
    </>
  )
}
