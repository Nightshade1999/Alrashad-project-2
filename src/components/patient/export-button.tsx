"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportToWord } from "@/lib/export-utils"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

interface ExportPatientButtonProps {
  patient: any
}

export function ExportPatientButton({ patient }: ExportPatientButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const doctorEmail = user?.email || ""

      // Fetch ALL history for this specific patient
      const { data: investigations } = await supabase
        .from('investigations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('test_date', { ascending: false })

      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false })

      // Merge into a single object for the exporter
      const fullData = {
        ...patient,
        investigations: investigations || [],
        visits: visits || []
      }

      await exportToWord([fullData], doctorEmail)
      toast.success("Clinical summary exported to Word")
    } catch (err) {
      console.error(err)
      toast.error("Failed to export clinical summary")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="h-9 px-3 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      Download Doc
    </Button>
  )
}
