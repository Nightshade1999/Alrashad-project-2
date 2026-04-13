"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface RestorePatientButtonProps {
  patientId: string
  previousCategory?: string | null
}

export function RestorePatientButton({ patientId, previousCategory }: RestorePatientButtonProps) {
  const [open, setOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const router = useRouter()

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const supabase = createClient()
      const destinationCategory = previousCategory || 'Normal'
      
      const { error } = await (supabase as any)
        .from('patients')
        .update({
          category: destinationCategory,
          date_of_death: null,
          cause_of_death: null,
          previous_category: null
        })
        .eq('id', patientId)

      if (error) throw error

      toast.success(`Patient restored to ${destinationCategory} status.`)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to restore patient: ${err.message || "Unknown error"}`)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 transition-all hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restore Record</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
            <AlertCircle className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <DialogTitle className="text-center">Restore Patient Record?</DialogTitle>
          <DialogDescription className="text-center">
            This will return the patient to the <strong>{previousCategory || 'Normal'}</strong> follow-up category and clear all death-related information from their file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isRestoring}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRestore}
            disabled={isRestoring}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isRestoring ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : "Yes, Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
