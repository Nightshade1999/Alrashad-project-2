"use client"

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import Papa from 'papaparse'
import { toast } from 'sonner'

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast.info("No patients found to export")
        return
      }

      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `patients-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
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
