"use client"

import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { differenceInHours, parseISO } from 'date-fns'
import { useDatabase } from '@/hooks/useDatabase'

interface DeleteRecordButtonProps {
  recordId: string;
  table: 'visits' | 'investigations';
  creatorId: string;
  createdAt: string;
  currentUserId: string;
}

export function DeleteRecordButton({ 
  recordId, 
  table, 
  creatorId, 
  createdAt, 
  currentUserId 
}: DeleteRecordButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { delete: dbDelete } = useDatabase()

  const hoursSinceCreation = differenceInHours(new Date(), parseISO(createdAt));
  const canDelete = creatorId === currentUserId && hoursSinceCreation < 24;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canDelete) {
      toast.error("Records can only be deleted by their creator within 24 hours")
      return
    }

    if (!confirm(`Are you sure you want to delete this ${table === 'visits' ? 'visit' : 'investigation'}? This clinical record will be permanently removed.`)) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from(table).delete().eq('id', recordId)
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
    <div className="flex items-center gap-1.5 shrink-0">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => toast.info("Editing investigations is coming soon")}
        className="h-7 w-7 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
        title="Edit Record"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon"
        onClick={handleDelete}
        disabled={isDeleting}
        className={`h-7 w-7 shrink-0 transition-opacity ${canDelete ? 'text-destructive hover:bg-destructive/10' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'}`}
        title={canDelete ? "Delete Record (Available for 24h)" : "Delete restricted (24h/Creator only)"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
