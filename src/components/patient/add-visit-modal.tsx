"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export function AddVisitModal({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) { toast.error('Please enter visit notes'); return }
    setLoading(true)
    try {
      const supabase = createClient()

      // Get current user so we can set doctor_id (required by schema)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      // @ts-ignore - Supabase type mismatch in this environment
      const { error } = await (supabase.from('visits') as any).insert({
        patient_id: patientId,
        doctor_id: user.id,
        visit_date: date,
        exam_notes: notes.trim(),
      })
      if (error) throw error
      toast.success('Visit note saved')
      setOpen(false)
      setNotes('')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save visit')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10">
        <Plus className="h-4 w-4 mr-2" /> Add Visit
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Add Visit Note</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="visit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit Date</Label>
            <Input id="visit-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="visit-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Notes</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write clinical findings, patient status, medication changes..."
              rows={6}
              className="mt-1.5 resize-none text-sm leading-relaxed"
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Saving...' : 'Save Visit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
