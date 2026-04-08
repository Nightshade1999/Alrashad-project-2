"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ambulance, X, Building2, Calendar, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { ModalPortal } from '@/components/ui/modal-portal'

export function ReferralModal({ patientId, isReferred, referralHospital, referralDate }: { 
  patientId: string
  isReferred: boolean
  referralHospital?: string | null
  referralDate?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hospital, setHospital] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const router = useRouter()

  const handleRefer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospital.trim()) {
      toast.error("Hospital name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('patients') as any)
        .update({
          is_referred: true,
          referral_hospital: hospital.trim(),
          referral_date: date,
        })
        .eq('id', patientId)

      if (error) throw error

      toast.success(`Patient referred to ${hospital.trim()}`)
      setOpen(false)
      setHospital('')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Referral failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReAccept = async () => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('patients') as any)
        .update({
          is_referred: false,
          referral_hospital: null,
          referral_date: null,
        })
        .eq('id', patientId)

      if (error) throw error

      toast.success("Patient re-accepted successfully")
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(`Re-accept failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If already referred, show the re-accept button
  if (isReferred) {
    return (
      <Button 
        variant="outline"
        size="sm"
        onClick={handleReAccept}
        disabled={isSubmitting}
        className="h-9 px-3 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isSubmitting ? 'Accepting...' : 'Re-accept Patient'}
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-950 dark:hover:text-orange-400"
        title="Refer to another hospital"
      >
        <Ambulance className="h-3.5 w-3.5 text-orange-500" />
        Refer
      </Button>

      {open && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{touchAction:'none'}} onClick={() => setOpen(false)} />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-orange-50/60 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                  <Ambulance className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">Refer to Hospital</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleRefer} className="p-6 space-y-5">
              {/* Hospital Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-orange-500" />
                  Hospital Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Al-Yarmouk Teaching Hospital"
                  value={hospital}
                  onChange={e => setHospital(e.target.value)}
                  required
                  className="border-orange-200 focus-visible:ring-orange-500"
                  dir="auto"
                />
              </div>

              {/* Referral Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  Referral Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="border-orange-200 focus-visible:ring-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                  {isSubmitting ? 'Referring...' : 'Confirm Referral'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  )
}
