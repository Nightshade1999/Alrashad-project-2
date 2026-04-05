"use client"

import { useState, useEffect } from "react"
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
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    checkDoctorName()
  }, [])

  const checkDoctorName = async () => {
    // 1. Check Session Storage first (for the "new sign in" requirement)
    const sessionName = sessionStorage.getItem('wardManager_doctorName')
    if (sessionName) {
      setOpen(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. Check Database for a "default" name
      const { data } = await (supabase as any)
        .from('user_profiles')
        .select('doctor_name')
        .eq('user_id', user.id)
        .single()

      // If we are here, there is NO sessionName. 
      // ALWAYS show the modal if no sessionName exists (at new sign in)
      // to handle the "account may be used by more than one doctor" case.
      setOpen(true)
      
      // But pre-fill with the database value if it exists
      if (data?.doctor_name) {
        setName(data.doctor_name)
      }
    } catch {
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
          { user_id: user.id, doctor_name: trimmed },
          { onConflict: 'user_id' }
        )

      // Store in Session Storage (for current session)
      sessionStorage.setItem('wardManager_doctorName', trimmed)
      // Also store in localStorage for persistence across browser restarts if needed, 
      // but the user specifically asked for "every new sign in" 
      // so we rely on sessionStorage primarily.
      localStorage.setItem('wardManager_doctorName', trimmed)

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
              className="h-12 text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This stamps your identity on visits, investigations, and exports.
            </p>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
