"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Stethoscope, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

export function DoctorNameModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [gender, setGender] = useState<'Male' | 'Female'>('Male')
  const [isSaving, setIsSaving] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    checkDoctorName()
  }, [])

  const checkDoctorName = async () => {
    // Force the modal if the current session doesn't have a name yet
    const sessionFlag = sessionStorage.getItem('wardManager_sessionActive')
    if (sessionFlag === 'true') {
      setOpen(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // We still fetch the name from the DB as a default suggestion
      const { data } = await (supabase as any)
        .from('user_profiles')
        .select('doctor_name')
        .eq('user_id', user.id)
        .single()

      if (data?.doctor_name) {
        setName(data.doctor_name)
        if (data?.gender && (data.gender === 'Male' || data.gender === 'Female')) {
          setGender(data.gender)
        }
        
        // If we found a name, consider this session "pre-authed" and don't show the modal
        sessionStorage.setItem('wardManager_sessionActive', 'true')
        setOpen(false)
        return
      }
      
      // If no name found in DB, we MUST show the modal
      setOpen(true)
    } catch {
      // On error (e.g. offline and no local profile yet), show modal to capture name
      setOpen(true)
    }
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Please enter your name")
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      await (supabase as any)
        .from('user_profiles')
        .upsert(
          { 
            user_id: user.id, 
            doctor_name: trimmed,
            gender: gender 
          },
          { onConflict: 'user_id' }
        )

      // Set session flag so it doesn't pop up again until the browser is closed or refreshed
      sessionStorage.setItem('wardManager_sessionActive', 'true')
      
      toast.success(`Session started as Dr. ${trimmed}!`)
      setOpen(false)
      // Force a refresh to update layout header
      window.location.reload()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save name. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to Ward Manager
          </DialogTitle>
          <DialogDescription className="text-center">
            Please enter your full name. This will be visible on all patient records
            and exported documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="doctorName" className="text-sm font-semibold">
              Doctor Full Name
            </Label>
            <Input
              id="doctorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Ahmed Safaa"
              className="h-12 text-base rounded-xl"
              autoFocus
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Your Gender
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              {['Male', 'Female'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g as any)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    gender === g 
                      ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                   {gender === g && <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />}
                   {g}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1">
              * This settings ensures your clinical identity is correctly stamped.
            </p>
          </div>
        </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
          >
            {isSaving ? "Saving..." : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm & Start
              </>
            )}
          </Button>
      </DialogContent>
    </Dialog>
  )
}
