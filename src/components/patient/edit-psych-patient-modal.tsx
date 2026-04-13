"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { MedicalDrugParams } from "@/types/database.types"
import { DrugListInput } from "../dashboard/medical-inputs"
import { safeJsonParse } from "@/lib/utils"
import { updatePsychPatientAction } from "@/app/actions/patient-actions"

export function EditPsychPatientModal({ patient, disabled = false }: { patient: any, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [psychDrugs, setPsychDrugs] = useState<MedicalDrugParams[]>(safeJsonParse(patient.psych_drugs))
  const [psychDiagnosis, setPsychDiagnosis] = useState(patient.psychological_diagnosis || '')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const actingDoctorName = localStorage.getItem('wardManager_lastDoctorName') || undefined
      const res = await updatePsychPatientAction(patient.id, {
        psychological_diagnosis: psychDiagnosis,
        psych_drugs: psychDrugs,
        actingDoctorName
      })
      
      if (res.error) throw new Error(res.error)
      
      toast.success("Psychiatric records updated successfully")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to update records")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        disabled={disabled}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 h-9 w-9 text-indigo-700 dark:text-indigo-400 shadow-sm active:scale-95"
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto p-4 sm:p-6 mx-auto rounded-2xl border-indigo-100 dark:border-indigo-900/50">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl text-indigo-600 dark:text-indigo-400 font-bold">Edit Psychology Profile</DialogTitle>
          <DialogDescription>
            Update psychological diagnosis and psychiatric medications for {patient.name}. General medical information can only be edited by Internal Medicine workflow.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="psych_diagnosis">Psychological Diagnosis</Label>
              <Input
                id="psych_diagnosis"
                value={psychDiagnosis}
                onChange={(e) => setPsychDiagnosis(e.target.value)}
                placeholder="e.g. Schizophrenia, Bipolar Disorder..."
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Chronic Psychiatric Medications</Label>
              <DrugListInput 
                label="Psychiatric Medications"
                category="Psych"
                drugs={psychDrugs} 
                onChange={setPsychDrugs} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200">
              {isSubmitting ? "Saving..." : "Save Psychiatric Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
