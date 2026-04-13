"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "sonner"
import { addVisitAction } from '@/app/actions/patient-actions'
import { ModalPortal } from '@/components/ui/modal-portal'

export function AddPsychVisitModal({ 
  patientId, 
  variant = "button", 
  disabled = false,
  isEr = false
}: { 
  patientId: string; 
  variant?: "button" | "icon"; 
  disabled?: boolean;
  isEr?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const getMinDate = () => {
    const d = new Date()
    d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  }

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
  const [notes, setNotes] = useState('')

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) { toast.error('Please enter psychology notes'); return }
    setLoading(true)

    const payload = {
      patient_id: patientId,
      visit_date: date,
      visit_time: time,
      exam_notes: notes.trim(),
      is_psych_note: true,
      is_er: isEr,
      actingDoctorName: localStorage.getItem('wardManager_lastDoctorName') || undefined
    }

    if (payload.visit_date < getMinDate()) {
      toast.error('Visit date cannot be earlier than 2 days ago')
      setLoading(false)
      return
    }

    try {
      const response = await addVisitAction(payload)
      if (response.error) throw new Error(response.error)
      toast.success('Psychology note saved')
      
      setOpen(false)
      setNotes('')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save note')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    if (variant === "icon") {
      return (
        <Button 
          onClick={() => setOpen(true)} 
          variant="outline" 
          size="icon" 
          disabled={disabled}
          className="h-10 w-10 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
          title="Add Psychology Note"
        >
          <ClipboardList className="h-5 w-5" />
        </Button>
      )
    }
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} className="bg-indigo-600 hover:bg-indigo-700 text-white h-10">
        <Plus className="h-4 w-4 mr-2" /> Add Psychology Note
      </Button>
    )
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{touchAction:'none'}} onClick={() => setOpen(false)} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg flex flex-col max-h-[95dvh] animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/60 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Add Psychology Note</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 modal-scroll flex-1 shrink min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit Date</Label>
              <Input id="visit-date" type="date" value={date} min={getMinDate()} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="visit-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit Time</Label>
              <Input id="visit-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="visit-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Psychology Notes</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write psychological assessment and progress..."
              rows={6}
              className="mt-1.5 resize-none text-sm leading-relaxed"
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  )
}
