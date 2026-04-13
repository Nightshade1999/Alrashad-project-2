"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Pencil, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { convertArabicNumbers } from '@/lib/utils'
import { updateInvestigationAction } from '@/app/actions/patient-actions'
import { ModalPortal } from '@/components/ui/modal-portal'

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
  { key: 'ldl',          label: 'LDL',       placeholder: 'e.g. 100' },
  { key: 'hdl',          label: 'HDL',       placeholder: 'e.g. 45' },
  { key: 'tg',           label: 'TG',        placeholder: 'e.g. 150' },
  { key: 'esr',          label: 'ESR',       placeholder: 'e.g. 15' },
  { key: 'crp',          label: 'CRP',       placeholder: 'e.g. 5' },
]

export function EditInvestigationModal({ 
  investigation,
  disabled = false
}: { 
  investigation: any;
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Initialize from existing investigation
  const initialDate = investigation.date ? investigation.date.split('T')[0] : ''
  const initialTime = investigation.date ? investigation.date.split('T')[1]?.substring(0, 5) : ''
  
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  
  const [values, setValues] = useState<Record<string, string>>({})
  const [otherLabs, setOtherLabs] = useState<{name: string, value: string}[]>([])
  
  const router = useRouter()

  useEffect(() => {
    if (open) {
      const vals: Record<string, string> = {}
      LAB_FIELDS.forEach(f => {
        const v = investigation[f.key]
        if (v !== null && v !== undefined) vals[f.key] = String(v)
      })
      setValues(vals)
      setOtherLabs(Array.isArray(investigation.other_labs) ? investigation.other_labs : [])
    }
  }, [open, investigation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: Record<string, any> = { 
      patient_id: investigation.patient_id, 
      date,
      time
    }
    
    for (const f of LAB_FIELDS) {
      const v = values[f.key]
      if (v !== undefined && v !== '') {
        const sanitized = convertArabicNumbers(v)
        payload[f.key] = parseFloat(sanitized)
      } else {
        payload[f.key] = null
      }
    }
    
    payload.other_labs = otherLabs.filter(l => l.name && l.value)

    try {
      const response = await updateInvestigationAction(investigation.id, payload)
      if (response.error) throw new Error(response.error)
      toast.success('Lab results updated')
      
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update labs')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button 
        onClick={() => setOpen(true)} 
        variant="ghost" 
        size="icon" 
        disabled={disabled}
        className="h-7 w-7 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
        title="Edit Record"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl flex flex-col max-h-[95dvh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Edit Lab Results</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 modal-scroll flex-1 shrink min-h-0 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="edit-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</Label>
              <Input id="edit-time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {LAB_FIELDS.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`edit-${f.key}`} className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">{f.label}</Label>
                <Input
                  id={`edit-${f.key}`}
                  placeholder={f.placeholder}
                  inputMode="decimal"
                  value={values[f.key] ?? ''}
                  onChange={e => {
                    const val = convertArabicNumbers(e.target.value)
                    setValues(v => ({ ...v, [f.key]: val }))
                  }}
                  className="h-11 sm:h-9 text-base sm:text-sm bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Other Investigations</Label>
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
              {loading ? 'Updating...' : 'Update Labs'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  )
}
