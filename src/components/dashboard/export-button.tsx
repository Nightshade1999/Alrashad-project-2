"use client"

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export function ExportButton({ isAdmin = true }: { isAdmin?: boolean }) {
  const [isExporting, setIsExporting] = useState(false)

  if (!isAdmin) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('patients')
        .select('*, investigations(*)')
        .limit(5000)
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast.info("No patients found to export")
        return
      }

      const { exportPatientsToCSV } = await import('@/lib/export-excel')
      await exportPatientsToCSV(data)
      toast.success("Export successful!")
    } catch (error) {
      console.error('Export error:', error)
      toast.error("Failed to export patients")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleExport}
      disabled={isExporting}
      className="h-14 bg-background shadow-sm border-primary/20"
    >
      <Download className="h-5 w-5 mr-2" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
