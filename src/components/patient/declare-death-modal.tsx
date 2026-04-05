"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

export function DeclareDeathModal({ patientId, currentCategory }: { patientId: string, currentCategory: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Get current time in 12h format for defaults
  const now = new Date()
  const currentHour12 = now.getHours() % 12 || 12
  const currentMinute = now.getMinutes()
  const currentAmPm = now.getHours() >= 12 ? 'PM' : 'AM'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const dateVal = formData.get('dateOfDeath') as string
    const hour = parseInt(formData.get('hour') as string) || 12
    const minute = parseInt(formData.get('minute') as string) || 0
    const ampm = formData.get('ampm') as string
    const causeOfDeath = formData.get('causeOfDeath') as string

    if (!dateVal || !patientId) {
      toast.error(`System Logic Error: ${!dateVal ? "Date missing" : "PatientID missing"}`)
      setIsSubmitting(false)
      return
    }

    // Convert 12h to 24h
    let hour24 = hour
    if (ampm === 'AM' && hour === 12) hour24 = 0
    else if (ampm === 'PM' && hour !== 12) hour24 = hour + 12
    const fullDateTime = `${dateVal}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    const updatePayload = {
      category: 'Deceased/Archive',
      previous_category: currentCategory, // Save for restoration
      date_of_death: fullDateTime,
      cause_of_death: causeOfDeath || null
    }

    console.log("SENDING UPDATE PAYLOAD:", { patientId, updatePayload })

    try {
      const supabase = createClient()
      const { data, error, status, statusText } = await (supabase as any)
        .from('patients')
        .update(updatePayload)
        .eq('id', patientId)
        .select()

      if (error) {
        console.error("FULL SUPABASE ERROR:", error)
        // Extracting properties manually because JSON.stringify(PostgrestError) can be "{}"
        const msg = error.message || "Unknown DB Error"
        const code = error.code || "No Code"
        const details = error.details || ""
        throw new Error(`[${code}] ${msg} ${details}`)
      }

      if (!data || data.length === 0) {
        throw new Error(`NOT_FOUND: No patient matches ID ${patientId}`)
      }

      toast.success("Clinical status updated: Patient archived.")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      // Robust error extraction
      let displayMsg = "Unknown Error"
      if (typeof err === 'string') displayMsg = err
      else if (err.message) displayMsg = err.message
      else {
        try { displayMsg = JSON.stringify(err) } catch { displayMsg = String(err) }
      }
      
      console.error("DIAGNOSTIC ERROR:", err)
      toast.error(`Update Failed: ${displayMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-9 px-3 gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900" />}>
        <Skull className="h-3.5 w-3.5" />
        Declare Death
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Skull className="h-5 w-5" /> Declare Death
            </DialogTitle>
            <DialogDescription>
              This will move the patient to the Archive category. Please provide details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfDeath">Date of Death *</Label>
              <Input 
                id="dateOfDeath" 
                name="dateOfDeath" 
                type="date" 
                defaultValue={now.toISOString().split('T')[0]}
                required 
              />
            </div>

            {/* Time Picker: Hour / Minute / AM-PM */}
            <div className="space-y-2">
              <Label>Time of Death</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <select
                    name="hour"
                    defaultValue={currentHour12}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <span className="text-lg font-bold text-muted-foreground">:</span>
                <div className="flex-1">
                  <select
                    name="minute"
                    defaultValue={currentMinute}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <select
                    name="ampm"
                    defaultValue={currentAmPm}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="causeOfDeath">Cause of Death (Possible)</Label>
              <Textarea 
                id="causeOfDeath" 
                name="causeOfDeath" 
                placeholder="e.g. Cardiac Arrest secondary to massive MI"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Confirming..." : "Confirm & Archive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

