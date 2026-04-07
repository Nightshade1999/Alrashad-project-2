"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pill, Plus, X, ListPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { DrugListInput } from "@/components/dashboard/medical-inputs"
import { MedicalDrugParams } from "@/types/database.types"

export function AddErTreatmentModal({ 
  patientId, 
  currentTreatment = [],
  variant = "button"
}: { 
  patientId: string; 
  currentTreatment?: MedicalDrugParams[];
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [treatment, setTreatment] = useState<MedicalDrugParams[]>(currentTreatment)
  const router = useRouter()

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('patients') as any)
        .update({ er_treatment: treatment })
        .eq('id', patientId)

      if (error) throw error
      toast.success("ER Treatment updated successfully")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Update Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) {
    if (variant === "icon") {
      return (
        <Button 
          onClick={() => setOpen(true)} 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          title="Update ER Treatment"
        >
          <ListPlus className="h-5 w-5" />
        </Button>
      )
    }
    return (
      <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-2 px-4 shadow-sm">
        <Pill className="h-4 w-4" />
        Manage ER Treatment
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl flex flex-col max-h-[90dvh] animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Ongoing ER Treatment</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-muted-foreground">
            Maintaining a precise list of active ER medications. These are stored separately from the patient's chronic ward medications.
          </p>
          
          <DrugListInput 
            label="ER Medications" 
            category="Internal" 
            drugs={treatment} 
            onChange={setTreatment} 
          />
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? 'Saving...' : 'Save treatment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
