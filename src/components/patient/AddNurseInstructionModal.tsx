"use client"

import { useState } from "react"
import { UserRoundCog, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createNurseInstructionAction } from "@/app/actions/nurse-actions"
import { toast } from "sonner"
import { useDatabase } from "@/hooks/useDatabase"

export function AddNurseInstructionModal({ 
  patientId, 
  patientName, 
  wardName,
  variant = "icon",
  initialInstruction,
  instructionId
}: { 
  patientId: string, 
  patientName: string, 
  wardName: string,
  variant?: "icon" | "button",
  initialInstruction?: string,
  instructionId?: string
}) {
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState(initialInstruction || "")
  const [type, setType] = useState<'single' | 'repetitive'>('single')
  const [duration, setDuration] = useState("1")
  const [isSaving, setIsSaving] = useState(false)
  
  const { profile } = useDatabase()
  const role = profile?.role

  const handleSave = async () => {
    const trimmed = instruction.trim()
    if (!trimmed) {
      toast.error("Please enter an instruction")
      return
    }

    // Capture doctor signature from the existing system
    const doctorName = localStorage.getItem('wardManager_lastDoctorName') || "Staff Physician"

    setIsSaving(true)
    try {
      if (instructionId) {
        // Edit mode
        const res = await (import("@/app/actions/nurse-actions").then(m => m.updateNurseInstructionAction({
          instructionId,
          newText: trimmed
        })))

        if (res.error) throw new Error(res.error)
        toast.success("Instruction updated")
      } else {
        // Create mode
        const res = await createNurseInstructionAction({
          patientId,
          wardName,
          instruction: trimmed,
          doctorName,
          type,
          durationDays: type === 'repetitive' ? parseInt(duration) : undefined
        })

        if (res.error) throw new Error(res.error)
        toast.success("Instruction sent to nursing staff")
      }
      
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to save instruction")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          variant === "icon" ? (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-xl border-blue-200 hover:bg-blue-50 text-blue-600 shadow-sm"
              title="Send Instruction to Nurse"
            />
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2" />
          )
        }
      >
        {variant === "icon" ? (
          <UserRoundCog className="h-5 w-5" />
        ) : (
          <>
            <UserRoundCog className="h-4 w-4" />
            Nurse Instruction
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-[2.5rem] p-6 sm:p-8 border-blue-100 dark:border-blue-900 shadow-2xl">
        <DialogHeader>
          <div className="mb-4 h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
            <UserRoundCog className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Nurse Instruction
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Issue a specific clinical order for <strong>{patientName}</strong>'s nursing care in the {wardName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instruction Type</Label>
             <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl h-12">
                   <TabsTrigger value="single" className="rounded-xl font-bold uppercase text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                      Single Time
                   </TabsTrigger>
                   <TabsTrigger value="repetitive" className="rounded-xl font-bold uppercase text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                      Repetitive
                   </TabsTrigger>
                </TabsList>
             </Tabs>
          </div>

          {type === 'repetitive' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Days)</Label>
               <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-center w-24"
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Days in notification hub</span>
               </div>
               {parseInt(duration) > 0 && (
                 <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Active until:</span>
                   <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                     {new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                   </span>
                 </div>
               )}
            </div>
          )}

          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Instruction</Label>
             <Textarea
               value={instruction}
               onChange={(e) => setInstruction(e.target.value)}
               placeholder="e.g. Check vitals every 4 hours, or Administer oxygen if SpO2 < 92%..."
               className="min-h-[120px] rounded-2xl border-slate-200 dark:border-slate-800 focus:ring-blue-500 font-medium bg-slate-50 dark:bg-slate-950"
             />
          </div>
          
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
             <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest leading-relaxed">
               Signature Stamped: {(role === 'doctor' || role === 'admin' || !role) ? 'Dr. ' : ''}{profile?.doctor_name || 'Clinical Staff'}
             </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="rounded-xl font-bold text-slate-500"
          >
            Cancel
          </Button>
          <button
            onClick={handleSave}
            disabled={isSaving || !instruction.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            SEND TO WARD
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
