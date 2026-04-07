"use client"

import { useState, useEffect } from "react"
import { Settings, User, Check, LogOut, ChevronRight, Save, UserCircle } from "lucide-react"
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
import { getUserProfileAction, updateUserProfileAction } from "@/app/actions/user-actions"
import { toast } from "sonner"

export function UserSettingsModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [name, setName] = useState("")
  const [gender, setGender] = useState<'Male' | 'Female' | 'Both'>('Both')
  const [userRole, setUserRole] = useState('')
  const [userSpecialty, setUserSpecialty] = useState('')

  const fetchProfile = async () => {
    setLoading(true)
    const result = await getUserProfileAction()
    if (result.data) {
      setName(result.data.doctor_name || "")
      setGender(result.data.gender || "Both")
      setUserRole(result.data.role || "user")
      setUserSpecialty(result.data.specialty || "")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) fetchProfile()
  }, [open])

  // handleSave is now removed as Name and Gender are managed via the session-based initialization modal.

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-10 w-10 text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded-xl transition-all"
        title="Settings & Profile"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem] animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg shadow-black/5">
                   <UserCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black italic tracking-widest uppercase">My Profile</DialogTitle>
                   <DialogDescription className="text-teal-50/80 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                      Account Settings & Identity
                   </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Profile Details */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Current Identity</Label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                     <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 italic leading-none">Dr. {name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                           <span className={`h-1.5 w-1.5 rounded-full ${gender === 'Male' ? 'bg-blue-400' : 'bg-rose-400'}`} />
                           {gender} Identity
                        </p>
                     </div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 italic mt-2 ml-1 leading-relaxed">
                    * Identity and gender for the current session are set during sign-in.
                  </p>
                </div>
              </div>

              {/* Utility Section */}
              <div className="pt-2">
                {/* Save Changes removed as Name/Gender are set per-session */}

                <form action="/auth/signout" method="post">
                   <Button 
                      type="submit"
                      variant="ghost" 
                      className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all"
                   >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                   </Button>
                </form>
              </div>
            </div>

            {/* Footer Status */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-8">
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Role: <span className="text-slate-600 dark:text-slate-200">{userRole}</span></span>
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm" />
            </div>

          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
