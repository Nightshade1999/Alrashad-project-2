"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Plus, X, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { queueMutation } from '@/lib/offline-sync'
import { toast } from 'sonner'

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
]

export function AddInvestigationModal({ patientId, variant = "button" }: { patientId: string, variant?: "button" | "icon" }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: Record<string, any> = { patient_id: patientId, date }
    for (const f of LAB_FIELDS) {
      const v = values[f.key]
      if (v !== undefined && v !== '') payload[f.key] = parseFloat(v)
    }

    // ── Offline path ──────────────────────────────────────────
    if (!navigator.onLine) {
      await queueMutation('ADD_LABS', payload)
      toast.success('Lab results saved offline — will sync when you reconnect', {
        icon: '📴',
        duration: 4000,
      })
      setOpen(false)
      setValues({})
      setLoading(false)
      return
    }

    // ── Online path ───────────────────────────────────────────
    try {
      const supabase = createClient()
      // @ts-ignore - Supabase type mismatch in this environment
      const { error } = await (supabase.from('investigations') as any).insert(payload)
      if (error) throw error
      toast.success('Lab results saved')
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
          className="h-10 w-10 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          title="Add Lab Results"
        >
          <FlaskConical className="h-5 w-5" />
        </Button>
      )
    }
    return (
      <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-10">
        <Plus className="h-4 w-4 mr-2" /> Add Labs
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <Label htmlFor="inv-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input id="inv-date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1.5" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {LAB_FIELDS.map(f => (
              <div key={f.key}>
                <Label htmlFor={f.key} className="text-xs font-semibold text-muted-foreground">{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step="any"
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="mt-1 h-9 text-sm"
                />
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
