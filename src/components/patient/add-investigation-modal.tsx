"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Plus, X, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { convertArabicNumbers } from '@/lib/utils'
import { addInvestigationAction } from '@/app/actions/patient-actions'
import { useDatabase } from '@/hooks/useDatabase'
import { createClient } from '@/lib/supabase'

const LAB_FIELDS = [
  { key: 'wbc',          label: 'WBC',       placeholder: 'e.g. 8.5' },
  { key: 'hb',           label: 'Hb',        placeholder: 'e.g. 13.2' },
  { key: 's_urea',       label: 'S.Urea',    placeholder: 'e.g. 35' },
  { key: 's_creatinine', label: 'S.Creat',   placeholder: 'e.g. 1.2' },
  { key: 'ast',          label: 'AST',       placeholder: 'e.g. 22' },
  { key: 'alt',          label: 'ALT',       placeholder: 'e.g. 25' },
  { key: 'tsb',          label: 'TSB',       placeholder: 'e.g. 0.8' },
  { key: 'hba1c',        label: 'HbA1c (%)', placeholder: 'e.g. 6.5' },
  { key: 'rbs',          label: 'RBS',       placeholder: 'e.g. 145' },
  { key: 'esr',          label: 'ESR',       placeholder: 'e.g. 15' },
  { key: 'crp',          label: 'CRP',       placeholder: 'e.g. 5' },
]

export function AddInvestigationModal({ 
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
  const [values, setValues] = useState<Record<string, string>>({})
  const [otherLabs, setOtherLabs] = useState<{name: string, value: string}[]>([])
  const router = useRouter()
  const { isOfflineMode, investigations: dbLabs } = useDatabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: Record<string, any> = { 
      patient_id: patientId, 
      date,
      time,
      is_er: isEr 
    }
    for (const f of LAB_FIELDS) {
      const v = values[f.key]
      if (v !== undefined && v !== '') {
        const sanitized = convertArabicNumbers(v)
        payload[f.key] = parseFloat(sanitized)
      }
    }
    
    if (otherLabs.length > 0) {
      payload.other_labs = otherLabs.filter(l => l.name && l.value)
    }

    // ── Database Path ─────────────────────────────────────────
    try {
      if (isOfflineMode) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase.from('user_profiles').select('doctor_name').eq('user_id', user?.id || '').single()
        
        await dbLabs.insert({
          ...payload,
          doctor_id: user?.id,
          doctor_name: (profile as any)?.doctor_name || user?.email?.split('@')[0],
          date: `${payload.date}T${payload.time}:00`
        })
        toast.success('Saved to local database — syncing...')
      } else {
        const response = await addInvestigationAction(payload)
        if (response.error) throw new Error(response.error)
        toast.success('Lab results saved')
      }
      
      setOpen(false)
      setValues({})
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save labs')
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
          className="h-10 w-10 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          title="Add Lab Results"
        >
          <FlaskConical className="h-5 w-5" />
        </Button>
      )
    }
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} className="bg-blue-600 hover:bg-blue-700 text-white h-10">
        <Plus className="h-4 w-4 mr-2" /> Add Labs
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl flex flex-col max-h-[95dvh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Add Lab Results</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 shrink min-h-0 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input id="inv-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="inv-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</Label>
              <Input id="inv-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {LAB_FIELDS.map(f => (
              <div key={f.key}>
                <Label htmlFor={f.key} className="text-xs font-semibold text-muted-foreground">{f.label}</Label>
                <Input
                  id={f.key}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ''}
                  onChange={e => {
                    const val = convertArabicNumbers(e.target.value)
                    setValues(v => ({ ...v, [f.key]: val }))
                  }}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Other Investigations</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setOtherLabs([...otherLabs, { name: '', value: '' }])}
                className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Custom
              </Button>
            </div>
            
            {otherLabs.map((lab, index) => (
              <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                <Input
                  placeholder="Test Name"
                  value={lab.name}
                  onChange={e => {
                    const newLabs = [...otherLabs]
                    newLabs[index].name = e.target.value
                    setOtherLabs(newLabs)
                  }}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder="Value"
                  value={lab.value}
                  onChange={e => {
                    const newLabs = [...otherLabs]
                    newLabs[index].value = convertArabicNumbers(e.target.value)
                    setOtherLabs(newLabs)
                  }}
                  className="w-24 h-9 text-sm"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setOtherLabs(otherLabs.filter((_, i) => i !== index))}
                  className="h-9 w-9 text-slate-400 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Saving...' : 'Save Labs'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
