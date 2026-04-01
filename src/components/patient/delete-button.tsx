"use client"

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function DeletePatientButton({ patientId, variant = "outline", redirectOnDelete = false }: { patientId: string, variant?: "outline" | "ghost" | "destructive", redirectOnDelete?: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm("Are you sure you want to remove this patient? This action cannot be undone.")) return

    setIsDeleting(true)
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error("Cannot delete patient while offline.")
        setIsDeleting(false)
        return
      }

      const supabase = createClient()
      
      // Delete child records first to avoid foreign key constraint violations
      // This is a manual cascade in case 'ON DELETE CASCADE' is not set
      await supabase.from('investigations').delete().eq('patient_id', patientId)
      await supabase.from('visits').delete().eq('patient_id', patientId)
      
      const { error } = await supabase.from('patients').delete().eq('id', patientId)
      
      if (error) throw error
      
      toast.success("Patient removed successfully")
      
      if (redirectOnDelete) {
        router.push('/dashboard')
      } else {
        router.refresh()
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error?.message || "Failed to remove patient")
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant={variant} 
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className={variant === "ghost" ? "text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" : "shrink-0"}
      title="Remove Patient"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
