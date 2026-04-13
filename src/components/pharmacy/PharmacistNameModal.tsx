"use client"

import { useState, useEffect } from "react"
import { Pill, Check } from "lucide-react"
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

export function PharmacistNameModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { profile, isReady } = useDatabase()
  const supabase = createClient()

  useEffect(() => {
    if (isReady && profile) {
      checkPharmacistName()
    }
  }, [isReady, profile?.role]) // Only re-run if role changes or system ready

  const checkPharmacistName = async () => {
    // 0. Only trigger for roles that work in the pharmacy
    if (profile?.role !== 'pharmacist' && profile?.role !== 'admin') {
      setOpen(false)
      return
    }

    // 1. Check session storage (current active tab session)
    const sessionFlag = sessionStorage.getItem('pharmacist_sessionActive')
    if (sessionFlag === 'true') {
      setOpen(false)
      return
    }

    // 2. NEW BYPASS: If Admin set the name in the DB, or if user is an Admin, treat it as verified!
    const isFixed = profile?.is_name_fixed === true
    const isAdmin = profile?.role === 'admin'
    const nameToUse = profile?.pharmacist_name

    if ((isFixed || isAdmin) && nameToUse) {
      sessionStorage.setItem('pharmacist_sessionActive', 'true')
      localStorage.setItem('pharmacist_lastPharmacistName', nameToUse)
      setOpen(false)
      return
    }

    // 2. Load from local storage (last used name)
    const savedName = localStorage.getItem('pharmacist_lastPharmacistName')
    if (savedName) setName(savedName)

    // 3. Force identification modal for fresh session
    // Small timeout to ensure no clashing re-renders
    setTimeout(() => {
      setOpen(true)
    }, 100)
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

      // Update the profile with the current acting pharmacist
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          pharmacist_name: trimmed,
          is_name_fixed: false
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Set session flag
      sessionStorage.setItem('pharmacist_sessionActive', 'true')
      
      // Set local storage for convenience next time
      localStorage.setItem('pharmacist_lastPharmacistName', trimmed)
      
      toast.success(`Identity confirmed: Pharmacist ${trimmed}`)
      setOpen(false)
      
      // Force refresh of any components listening to this profile
      window.dispatchEvent(new Event('pharmacy_identity_updated'))
      
      // Full reload to clear any stale useDatabase caches
      window.location.reload()
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
      <DialogContent 
        className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-[2.5rem] p-6 sm:p-8 border-teal-100 dark:border-teal-900 shadow-2xl" 
        showCloseButton={false}
      >
        <DialogHeader className="items-center text-center">
          <div className="mb-6 h-20 w-20 rounded-3xl bg-linear-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-teal-500/20 rotate-3">
            <Pill className="h-10 w-10 text-white -rotate-3" />
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Pharmacy Access
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Please confirm your identity. Your name will be used as a <strong>Clinical Signature</strong> on all inventory modifications today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="pharmacistName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Pharmacist Name
            </Label>
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-linear-to-r from-teal-500 to-indigo-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
               <Input
                 id="pharmacistName"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="e.g. Dr. Ahmed Ali"
                 className="relative h-14 text-base rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold focus-visible:ring-teal-500"
                 autoFocus
               />
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
             <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">
               * Since multiple pharmacists may share this workstation, please update this name whenever you start your shift to maintain accurate audit trails.
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
              VERIFY & ENTER PHARMACY
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
