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
import { useDatabase } from "@/hooks/useDatabase"

export function DoctorNameModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [gender, setGender] = useState<'Male' | 'Female'>('Male')
  const [isSaving, setIsSaving] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const { isReady, profile } = useDatabase()

  useEffect(() => {
    if (isReady && profile) {
      checkDoctorName()
    } else if (isReady && !profile) {
      setOpen(false)
      setName("") 
    }
  }, [isReady, profile])

  const checkDoctorName = async () => {
    // 0. ROLE CHECK: This modal is only for Doctors and Admins.
    // Pharmacists, Nurses, and Lab Techs have their own specialized modals.
    if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
      setOpen(false)
      return
    }

    // 1. Detect User Switch: If the logged in user is different from the one who set the session flag, clear it.
    const lastUserId = localStorage.getItem('wardManager_lastUserId')
    const currentUserId = profile?.user_id
    
    if (currentUserId && lastUserId && currentUserId !== lastUserId) {
      sessionStorage.removeItem('wardManager_sessionActive')
    }

    // 1. If we already identified for this SESSION (tab instance), stay closed.
    const sessionFlag = sessionStorage.getItem('wardManager_sessionActive')
    const savedName = localStorage.getItem('wardManager_lastDoctorName')
    
    if (sessionFlag === 'true' && savedName) {
      setOpen(false)
      return
    }

    // 2. NEW BYPASS: If Admin set the name in the DB, or if user is an Admin, treat it as verified!
    const isFixed = profile?.is_name_fixed === true
    const isAdmin = profile?.role === 'admin'
    const nameToUse = profile?.doctor_name || profile?.full_name

    if ((isFixed || isAdmin) && nameToUse) {
      sessionStorage.setItem('wardManager_sessionActive', 'true')
      localStorage.setItem('wardManager_lastDoctorName', nameToUse)
      localStorage.setItem('wardManager_lastDoctorGender', profile.gender || 'Male')
      localStorage.setItem('wardManager_lastUserId', profile.user_id)
      setOpen(false)
      return
    }

    // 3. Load from LOCAL STORAGE (Last used name on THIS device)
    const savedGender = localStorage.getItem('wardManager_lastDoctorGender')
    
    if (savedName) setName(savedName)
    if (savedGender === 'Male' || savedGender === 'Female') setGender(savedGender as any)

    // 4. Force the modal to open on a fresh session OR if name is missing
    setOpen(true)
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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error("Not authenticated")

      // Update the profile with the current acting doctor
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

      // Set session flag (Persistence for this browsing session/refreshes)
      sessionStorage.setItem('wardManager_sessionActive', 'true')
      
      // Set local flag (Persistence for this browser identity)
      localStorage.setItem('wardManager_lastDoctorName', trimmed)
      localStorage.setItem('wardManager_lastDoctorGender', gender)
      localStorage.setItem('wardManager_lastUserId', user.id)
      
      toast.success(`Session started as Dr. ${trimmed}!`)
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to save identity.")
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
