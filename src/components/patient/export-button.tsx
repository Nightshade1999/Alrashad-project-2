"use client"

import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportToWord } from "@/lib/export-utils"

interface ExportPatientButtonProps {
  patient: any
}

export function ExportPatientButton({ patient }: ExportPatientButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="h-9 px-3 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      onClick={() => exportToWord([patient])}
    >
      <FileText className="h-3.5 w-3.5" />
      Download Doc
    </Button>
  )
}
