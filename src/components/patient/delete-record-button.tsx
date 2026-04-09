"use client"

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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

  if (!canDelete) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
      title="Delete Record (Available for 24h)"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
