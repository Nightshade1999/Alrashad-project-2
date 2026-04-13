"use client"

import { useState, useEffect } from "react"
import { Bell, X, Calendar, UserPlus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createReminderAction } from "@/app/actions/reminder-actions"
import { useDatabase } from "@/hooks/useDatabase"
import { toast } from "sonner"

export function AddReminderModal({ 
  patientId, 
  patientName,
  isGlobal = false
}: { 
  patientId?: string
  patientName?: string
  isGlobal?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Baghdad time (UTC+3) date helpers
  const getBaghdadNow = () => new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
  const toDateStr = (d: Date) => d.toISOString().split('T')[0]
  
  // Between 12AM-8AM Baghdad: allow today. Otherwise: start from tomorrow.
  const getMinDate = () => {
    const now = getBaghdadNow()
    const hour = now.getUTCHours() // already shifted to Baghdad, so UTC hours = Baghdad hours
    if (hour < 8) return toDateStr(now) // 12AM-8AM: allow today
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    return toDateStr(tomorrow)
  }
  
  const [date, setDate] = useState(getMinDate)
  const [specialty, setSpecialty] = useState<'internal_medicine' | 'psychiatry'>('internal_medicine')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Both'>('Both')
  const [notes, setNotes] = useState('')
  const [assignedUserGender, setAssignedUserGender] = useState<string | null>(null)
  const [assignedUserSpecialty, setAssignedUserSpecialty] = useState<string | null>(null)

  // Pull profile from shared context — no extra server round-trip
  const { profile } = useDatabase()
  useEffect(() => {
    if (!profile) return
    if (profile.gender === 'Male' || profile.gender === 'Female') {
      setAssignedUserGender(profile.gender)
      setGender(profile.gender as any)
    }
    if ((profile as any).specialty) {
      setAssignedUserSpecialty((profile as any).specialty)
      setSpecialty((profile as any).specialty as any)
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) {
      toast.error("Please add reminder notes")
      return
    }

    setIsSubmitting(true)
    const result = await createReminderAction({
      patient_id: patientId,
      notes: notes.trim(),
      reminder_date: date,
      target_specialty: specialty,
      target_gender: specialty === 'internal_medicine' && gender !== 'Both' ? gender : null
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Reminder added successfully")
      setOpen(false)
      setNotes('')
    }
    setIsSubmitting(false)
  }

  return (
    <>
      {isGlobal ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 text-[10px] font-black uppercase tracking-widest text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-950/30 ml-auto"
        >
          <Bell className="h-3 w-3 mr-1.5" />
          Add Task
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="h-10 w-10 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          title="Add Clinical Reminder"
        >
          <Bell className="h-5 w-5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl animate-scale-in" showCloseButton={false}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shadow-sm shadow-amber-600/10">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="font-black italic tracking-tight text-slate-800 dark:text-slate-100 leading-none">
                  {isGlobal ? 'Add Global Task' : 'Add Clinical Reminder'}
                </DialogTitle>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">
                  {patientName || 'Unlinked Ward Task'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)} 
              className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3 text-amber-500" />
                Target Completion Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={getMinDate()}
                className="h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-sm font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Specialty Selection */}
              {(!assignedUserSpecialty || assignedUserSpecialty === 'psychiatry') && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                    <UserPlus className="h-3 w-3 text-amber-500" />
                    Specialty
                  </Label>
                  <Select value={specialty} onValueChange={(val: any) => setSpecialty(val)}>
                    <SelectTrigger className="h-12 border-slate-200 dark:border-slate-800 focus:ring-amber-500 rounded-xl bg-slate-50 dark:bg-slate-900/50 font-bold text-xs uppercase tracking-wider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal_medicine" className="text-xs font-bold uppercase tracking-wider">Internal Med</SelectItem>
                      <SelectItem value="psychiatry" className="text-xs font-bold uppercase tracking-wider">Psychiatry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {specialty === 'internal_medicine' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                    Direct To (Gender)
                  </Label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 h-12">
                    {['Male', 'Female', 'Both'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g as any)}
                        className={`flex items-center justify-center rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${
                          gender === g 
                            ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                      >
                        {g === 'Both' ? 'All' : g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                <Info className="h-3 w-3 text-amber-500" />
                Task Description
              </Label>
              <Textarea
                placeholder="e.g. Check spiking SpO2 after morning doses..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm leading-relaxed"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500" onClick={() => setOpen(false)}>
                Discard
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-amber-600/20">
                {isSubmitting ? 'Syncing...' : 'Add Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
