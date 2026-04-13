"use client"

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { differenceInHours, parseISO } from 'date-fns'
import { EditInvestigationModal } from './edit-investigation-modal'

interface InvestigationActionsProps {
  investigation: any;
  currentUserId: string;
  currentUserRole?: string;
}

export function InvestigationActions({ 
  investigation, 
  currentUserId,
  currentUserRole
}: InvestigationActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const hoursSinceCreation = differenceInHours(new Date(), parseISO(investigation.created_at));
  const isAdmin = currentUserRole?.toLowerCase() === 'admin';
  const isCreator = investigation.doctor_id === currentUserId;
  
  // Logic: 48 hours for creator, or unlimited for Admin
  const canEditOrDelete = isAdmin || (isCreator && hoursSinceCreation < 48);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canEditOrDelete) {
      toast.error("Only the creator can delete records within 48 hours. Admins can delete any record.")
      return
    }

    if (!confirm(`Are you sure you want to delete this investigation? This clinical record will be permanently removed.`)) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('investigations').delete().eq('id', investigation.id)
      if (error) throw error
      toast.success("Record deleted successfully")
      
      router.refresh()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error?.message || "Failed to delete record")
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5 shrink-0">
      <EditInvestigationModal 
        investigation={investigation} 
        disabled={!canEditOrDelete}
      />

      <Button 
        variant="ghost" 
        size="icon"
        onClick={handleDelete}
        disabled={isDeleting}
        className={`h-7 w-7 shrink-0 transition-opacity ${canEditOrDelete ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'}`}
        title={canEditOrDelete ? "Delete Record" : "Edit/Delete restricted (48h/Creator only)"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
