"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeftCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

export function ErWardButton({ patientId, isEr }: { patientId: string, isEr: boolean }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('patients')
        .update({ is_in_er: !isEr })
        .eq('id', patientId)

      if (error) throw error

      toast.success(!isEr ? "Patient moved to ER Ward." : "Patient returned to standard Ward.")
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Update Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEr) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleToggle}
        disabled={isSubmitting}
        className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowLeftCircle className="h-3.5 w-3.5 text-indigo-600" />
        Return to Ward
      </Button>
    )
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleToggle}
      disabled={isSubmitting}
      className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
      Move to ER
    </Button>
  )
}
