"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, X, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "sonner"
import { convertArabicNumbers } from '@/lib/utils'
import { addVisitAction } from '@/app/actions/patient-actions'
import { useDatabase } from '@/hooks/useDatabase'
import { createClient } from '@/lib/supabase'

export function AddVisitModal({ 
  patientId, 
  variant = "button", 
  isEr = false,
  disabled = false
}: { 
  patientId: string; 
  variant?: "button" | "icon"; 
  isEr?: boolean;
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
  const [notes, setNotes] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [pr, setPr] = useState('')
  const [spo2, setSpo2] = useState('')
  const [temp, setTemp] = useState('')
  const router = useRouter()
  const { isOfflineMode, visits: dbVisits } = useDatabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) { toast.error('Please enter visit notes'); return }
    setLoading(true)

    const payload = {
      patient_id: patientId,
      visit_date: date,
      visit_time: time,
      exam_notes: notes.trim(),
      bp_sys: bpSys ? parseInt(convertArabicNumbers(bpSys)) : null,
      bp_dia: bpDia ? parseInt(convertArabicNumbers(bpDia)) : null,
      pr: pr ? parseInt(convertArabicNumbers(pr)) : null,
      spo2: spo2 ? parseInt(convertArabicNumbers(spo2)) : null,
      temp: temp ? parseFloat(convertArabicNumbers(temp)) : null,
      is_er: isEr
    }

    // ── Database Path ─────────────────────────────────────────
    try {
      if (isOfflineMode) {
        const { data: { user } } = await createClient().auth.getUser()
        await dbVisits.insert({
          ...payload,
          doctor_id: user?.id,
          visit_date: `${payload.visit_date}T${payload.visit_time}:00`
        })
        toast.success('Saved to local database — syncing...')
      } else {
        const response = await addVisitAction(payload)
        if (response.error) throw new Error(response.error)
        toast.success('Visit note saved')
      }
      
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
    if (variant === "icon") {
      return (
        <Button 
          onClick={() => setOpen(true)} 
          variant="outline" 
          size="icon" 
          disabled={disabled}
          className="h-10 w-10 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          title="Add Visit Note"
        >
          <ClipboardList className="h-5 w-5" />
        </Button>
      )
    }
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10">
        <Plus className="h-4 w-4 mr-2" /> Add Visit
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg flex flex-col max-h-[95dvh] animate-scale-in">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 shrink min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit Date</Label>
              <Input id="visit-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="visit-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visit Time</Label>
              <Input id="visit-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="mt-1.5" />
            </div>
          </div>
          {/* Vital Parameters Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Vital Parameters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="bp-sys" className="text-xs font-semibold text-muted-foreground">BP (S/D)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input id="bp-sys" placeholder="120" value={bpSys} onChange={e => setBpSys(e.target.value)} className="h-10 text-sm px-2" />
                  <span className="text-slate-300">/</span>
                  <Input id="bp-dia" placeholder="80" value={bpDia} onChange={e => setBpDia(e.target.value)} className="h-10 text-sm px-2" />
                </div>
              </div>
              <div>
                <Label htmlFor="pr" className="text-xs font-semibold text-muted-foreground">PR (BPM)</Label>
                <Input id="pr" placeholder="72" value={pr} onChange={e => setPr(e.target.value)} className="h-10 text-sm mt-1" />
              </div>
              <div>
                <Label htmlFor="spo2" className="text-xs font-semibold text-muted-foreground">SpO2 (%)</Label>
                <Input id="spo2" placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} className="h-10 text-sm mt-1" />
              </div>
              <div>
                <Label htmlFor="temp" className="text-xs font-semibold text-muted-foreground">Temp (°C)</Label>
                <Input id="temp" placeholder="37.0" value={temp} onChange={e => setTemp(e.target.value)} className="h-10 text-sm mt-1" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="visit-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Notes</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write clinical findings, patient status, medication changes..."
              rows={4}
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
