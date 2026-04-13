"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Clock, UserRoundCog, History, Loader2, Repeat, Info } from "lucide-react"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { acknowledgeNurseInstructionAction } from "@/app/actions/nurse-actions"
import { toast } from "sonner"
import { getBaghdadShiftStart } from "@/lib/utils"

export function NurseInstructionHub({ 
  wardName,
  initialInstructions = [] 
}: { 
  wardName: string,
  initialInstructions: any[]
}) {
  const [instructions, setInstructions] = useState(initialInstructions)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  
  const shiftStart = getBaghdadShiftStart();

  // Logic to determine if an instruction needs attention this shift
  const needsAttention = (inst: any) => {
    if (inst.instruction_type === 'single') return !inst.is_read;
    
    // Repetitive: Needs signature if no acknowledgment in current shift
    const lastAck = inst.acknowledgments && inst.acknowledgments.length > 0 
      ? new Date(inst.acknowledgments[inst.acknowledgments.length - 1].at)
      : null;
    
    return !lastAck || lastAck < shiftStart;
  };

  // Filter for active instructions: unread single OR unexpired repetitive
  const activeInstructions = instructions.filter(inst => {
    if (inst.instruction_type === 'single') return !inst.is_read;
    if (inst.instruction_type === 'repetitive') {
      const now = new Date();
      return !inst.expires_at || new Date(inst.expires_at) > now;
    }
    return true;
  });

  const unreadCount = activeInstructions.filter(needsAttention).length

  useEffect(() => {
    setInstructions(initialInstructions)
  }, [initialInstructions])

  useEffect(() => {
    const { createClient } = require("@/lib/supabase")
    const supabase = createClient()

    const channel = supabase
      .channel(`nurse-hub-${wardName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nurse_instructions',
          filter: `ward_name=eq.${wardName}`
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the patient name for the new instruction
            const { data: newInst } = await supabase
              .from('nurse_instructions')
              .select('*, patient:patients(name)')
              .eq('id', payload.new.id)
              .single()
            
            if (newInst) {
              setInstructions(prev => [newInst, ...prev])
              toast.info("New physician instruction received", {
                description: newInst.instruction.substring(0, 50) + "..."
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            setInstructions(prev => prev.map(inst => 
              inst.id === payload.new.id ? { ...inst, ...payload.new } : inst
            ))
          } else if (payload.eventType === 'DELETE') {
            setInstructions(prev => prev.filter(inst => inst.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [wardName])

  const handleAcknowledge = async (id: string) => {
    const nurseName = localStorage.getItem('nurse_lastNurseName')
    if (!nurseName) {
      toast.error("Please set your Clinical Signature first")
      // The identity modal should handle this, but we can trigger it or just wait
      return
    }

    setIsProcessing(id)
    try {
      const res = await acknowledgeNurseInstructionAction({
        instructionId: id,
        nurseName
      })

      if (res.error) throw new Error(res.error)

      toast.success("Instruction acknowledged")
      // Optimistic update
      setInstructions(prev => prev.map(i => 
        i.id === id ? { ...i, is_read: true, read_at: new Date().toISOString(), read_by_nurse_name: nurseName } : i
      ))
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge")
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Popover>
      <PopoverTrigger 
        render={
          <Button 
            variant="outline" 
            size="icon" 
            className={`relative h-12 w-12 rounded-2xl border-2 transition-all ${
              unreadCount > 0 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 animate-pulse shadow-lg shadow-blue-500/20" 
                : "border-slate-200 dark:border-slate-800"
            }`}
          />
        }
      >
        <Bell className={`h-6 w-6 ${unreadCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
            {unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 rounded-[2rem] p-0 overflow-hidden shadow-2xl border-slate-100 dark:border-slate-800" align="end">
        <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <UserRoundCog className="h-4 w-4" />
              Instruction Hub
           </h3>
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-black uppercase text-blue-600 border-blue-200">
                {wardName} Ward
              </Badge>
              <button 
                onClick={() => window.location.href = `/nurse/ward/${encodeURIComponent(wardName)}/notifications`}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                title="Clinical Record History"
              >
                <History className="h-4 w-4" />
              </button>
           </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {activeInstructions.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-2 opacity-30">
               <History className="h-8 w-8" />
               <p className="text-[10px] font-black uppercase tracking-widest">No Active Instructions</p>
            </div>
          ) : activeInstructions.map((inst) => (
            <div key={inst.id} className={`p-5 transition-colors ${!inst.is_read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
               <div className="flex justify-between items-start mb-2">
                   <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {inst.patient?.name || 'Unknown Patient'}
                   </span>
                   <div className="flex gap-1">
                      {inst.instruction_type === 'repetitive' && (
                        <Badge variant="outline" className="text-[8px] font-black border-blue-200 text-blue-600 gap-1 pr-2">
                           <Repeat className="h-2 w-2" />
                           Repetitive
                        </Badge>
                      )}
                      {needsAttention(inst) && (
                        <Badge className="bg-blue-600 text-[8px] font-black tracking-widest uppercase">Action Req.</Badge>
                      )}
                   </div>
               </div>
               
               <p className="text-xs font-bold text-slate-700 dark:text-slate-300 italic mb-4 leading-relaxed line-clamp-3">
                 "{inst.instruction}"
               </p>

                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                      <div className="flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         Started: {format(parseISO(inst.created_at), 'dd MMM, HH:mm')}
                      </div>
                      <span className="text-blue-600 dark:text-blue-400 font-black">Dr. {inst.doctor_name || 'Staff'}</span>
                   </div>

                   {inst.instruction_type === 'repetitive' && inst.expires_at && (
                     <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <Info className="h-3 w-3" />
                        Expires: {format(parseISO(inst.expires_at), 'dd MMM')}
                     </div>
                   )}

                   {!needsAttention(inst) ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                         <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            <span className="text-[9px] font-black uppercase">
                               Signed {inst.instruction_type === 'repetitive' ? 'for this shift' : ''} by {inst.acknowledgments?.[inst.acknowledgments.length-1]?.nurse_name || inst.read_by_nurse_name}
                            </span>
                         </div>
                         <span className="text-[8px] font-bold text-emerald-600/60">
                            {format(parseISO(inst.acknowledgments?.[inst.acknowledgments.length-1]?.at || inst.read_at), 'HH:mm')}
                         </span>
                      </div>
                   ) : (
                     <button
                       onClick={() => handleAcknowledge(inst.id)}
                       disabled={isProcessing === inst.id}
                       className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]"
                     >
                       {isProcessing === inst.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                       {inst.instruction_type === 'repetitive' ? 'Sign for Shift' : 'Acknowledge & Sign'}
                     </button>
                   )}
                </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Showing last 30 days of instructions</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
