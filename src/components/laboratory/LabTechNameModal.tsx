"use client"

import { useState, useEffect } from "react"
import { Microscope, Check } from "lucide-react"
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
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { useDatabase } from "@/hooks/useDatabase"

export function LabTechNameModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { profile, isReady } = useDatabase()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (isReady) {
      checkTechName()
    }
  }, [isReady, profile])

  const checkTechName = async () => {
    // 1. Check session storage (current active tab session)
    const sessionFlag = sessionStorage.getItem('labTech_sessionActive')
    if (sessionFlag === 'true') {
      setOpen(false)
      return
    }

    // 2. NEW BYPASS: If Admin set the name in the DB, treat it as verified!
    if (profile?.is_name_fixed && profile?.lab_tech_name) {
      const adminSetName = profile.lab_tech_name
      sessionStorage.setItem('labTech_sessionActive', 'true')
      localStorage.setItem('labTech_lastTechName', adminSetName)
      setOpen(false)
      return
    }

    // 2. Load from local storage (last used name on this specific phone/browser)
    const savedName = localStorage.getItem('labTech_lastTechName')
    if (savedName) setName(savedName)

    // 3. Force identification modal for fresh session
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update the profile with the current acting technician
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({ 
          lab_tech_name: trimmed,
          is_name_fixed: false
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Set session flag
      sessionStorage.setItem('labTech_sessionActive', 'true')
      
      // Set local storage for convenience next time
      localStorage.setItem('labTech_lastTechName', trimmed)
      
      toast.success(`Identity confirmed: Lab Tech ${trimmed}`)
      setOpen(false)
      
      // Force refresh of any components listening to this profile
      window.dispatchEvent(new Event('lab_tech_identity_updated'))
    } catch (err: any) {
      console.error(err)
      toast.error(`Verification failed: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-teal-100 dark:border-teal-900 shadow-2xl" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className="mb-6 h-20 w-20 rounded-3xl bg-linear-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-teal-500/20 rotate-3">
            <Microscope className="h-10 w-10 text-white -rotate-3" />
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Laboratory Access
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Please confirm your identity. Your name will be stamped as the <strong>Performing Technician</strong> on all laboratory records today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="techName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Laboratory Technician Name
            </Label>
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-linear-to-r from-teal-500 to-indigo-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
               <Input
                 id="techName"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="e.g. Salah Mohammed"
                 className="relative h-14 text-base rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold focus-visible:ring-teal-500"
                 autoFocus
               />
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
             <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">
               * Just like doctors, if multiple technicians share this account, please ensure you update this name when you begin your shift to ensure clinical audit accuracy.
             </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="w-full h-14 bg-linear-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white font-black rounded-2xl shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
        >
          {isSaving ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="mr-2 h-6 w-6" />
              VERIFY & ACCESS SYSTEM
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
