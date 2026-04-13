"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GueReportView } from "./GueReportView"

interface GueHistoryIconProps {
  investigation: any;
}

export function GueHistoryIcon({ investigation }: GueHistoryIconProps) {
  const [showGUE, setShowGUE] = useState(false)

  if (!investigation.gue || Object.keys(investigation.gue).length <= 2) {
    return null
  }

  if (showGUE) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto">
        <GueReportView data={investigation} onBack={() => setShowGUE(false)} />
      </div>
    )
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="h-8 w-8 rounded-full border-teal-200 text-teal-600 hover:bg-teal-50 shadow-sm transition-all active:scale-90" 
      onClick={() => setShowGUE(true)}
      title="View GUE Report"
    >
      <FileText className="h-4 w-4" />
    </Button>
  )
}
