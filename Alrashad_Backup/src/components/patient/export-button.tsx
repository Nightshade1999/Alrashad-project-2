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
  const [isExporting, setIsExporting] = useState<false | 'word' | 'pdf'>(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = async (format: 'word' | 'pdf') => {
    setIsExporting(format)
    setShowMenu(false)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let doctorName = ""
      let wardName = ""
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('user_profiles')
          .select('doctor_name, ward_name')
          .eq('user_id', user.id)
          .single()
        doctorName = profile?.doctor_name || localStorage.getItem('wardManager_doctorName') || user.email?.split('@')[0] || "Ward Clinician"
        wardName = profile?.ward_name || localStorage.getItem('wardManager_wardName') || "Medical Ward"
      }

      const { data: investigations } = await supabase
        .from('investigations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date', { ascending: false })

      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false })

      const fullData = {
        ...patient,
        investigations: investigations || [],
        visits: visits || []
      }

      if (format === 'word') {
        const { exportToWord } = await import("@/lib/export-utils")
        await exportToWord([fullData], doctorName, wardName)
        toast.success("Clinical summary exported to Word")
      } else {
        const { exportToPdf } = await import("@/lib/export-utils")
        await exportToPdf([fullData], doctorName, wardName)
        toast.success("Clinical summary exported to PDF")
      }
    } catch (err: any) {
      console.error("PDF/Word export error:", err)
      toast.error(`Failed to export: ${err?.message || "Unknown error"}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Button 
        variant="outline" 
        size="sm" 
        className="h-9 px-3 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 rounded-xl font-bold uppercase tracking-wider text-[10px]"
        onClick={() => setShowMenu(!showMenu)}
        disabled={!!isExporting}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Export
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
            <button
              onClick={() => handleExport('word')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shadow-sm">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="uppercase tracking-wider">Word Doc</span>
                <span className="text-[10px] font-medium text-slate-400">High-Fid Editable</span>
              </div>
            </button>
            <div className="mx-2 my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 shadow-sm">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="uppercase tracking-wider">PDF Summary</span>
                <span className="text-[10px] font-medium text-slate-400">Print Optimized</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
