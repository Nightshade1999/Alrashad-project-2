"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X, Calendar, CheckCircle2, RotateCcw, AlertCircle, ExternalLink, ChevronRight, MessageSquareCode, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getTodayRemindersAction,
  resolveReminderAction,
  rescheduleReminderAction,
  updateReminderAction
} from "@/app/actions/reminder-actions"
import { toast } from "sonner"
import Link from "next/link"
import { AddReminderModal } from "@/components/reminders/add-reminder-modal"

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReschedule, setActiveReschedule] = useState<string | null>(null)
  const [activeResolve, setActiveResolve] = useState<string | null>(null)
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('doctor')
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  
  // Reschedule Form State
  const [newDate, setNewDate] = useState(() => {
    const tomorrow = new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [updatedNotes, setUpdatedNotes] = useState('')
  const [isPartial, setIsPartial] = useState(false)

  // Resolve Form State
  const [resolveNotes, setResolveNotes] = useState('')

  // Edit Form State
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    const result = await getTodayRemindersAction()
    if (result.data) {
      setReminders(result.data)
    }
    
    // Also fetch role to decide archive link
    const { createServerClient } = await import('@supabase/ssr')
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [] } } // Simple check
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
       setUserId(user.id)
       const { data: profile } = await (supabase.from('user_profiles') as any).select('role').eq('user_id', user.id).single()
       if (profile?.role) setUserRole(profile.role)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReminders()
    // Optional: Set up an interval or subtle poll
  }, [fetchReminders])

  const handleResolve = async (id: string) => {
    const result = await resolveReminderAction(id, resolveNotes)
    if (result.success) {
      toast.success("Reminder resolved")
      setResolveNotes('')
      setActiveResolve(null)
      fetchReminders()
    } else {
      toast.error(result.error)
    }
  }

  const handleReschedule = async (id: string) => {
    const result = await rescheduleReminderAction(id, newDate, updatedNotes, isPartial)
    if (result.success) {
      toast.success("Reminder rescheduled")
      setUpdatedNotes('')
      setActiveReschedule(null)
      fetchReminders()
    } else {
      toast.error(result.error)
    }
  }

  const handleEdit = async (id: string) => {
    const result = await updateReminderAction(id, {
      notes: editNotes,
      reminder_date: editDate
    })
    if (result.success) {
      toast.success("Reminder updated")
      setActiveEdit(null)
      fetchReminders()
    } else {
      toast.error(result.error)
    }
  }

  const pendingCount = reminders.length

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className={`relative h-10 w-10 rounded-xl transition-all ${
          pendingCount > 0 
            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40" 
            : "text-muted-foreground"
        }`}
      >
        <Bell className={`h-5 w-5 ${pendingCount > 0 ? "animate-wiggle" : ""}`} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white border-2 border-white dark:border-slate-900 shadow-md">
            {pendingCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setActiveReschedule(null); setActiveResolve(null); setActiveEdit(null); }} />
          <div className="absolute right-0 mt-2 w-[90vw] sm:w-[400px] max-h-[85vh] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-top-2 zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 italic tracking-tight flex items-center gap-2">
                  Today's Tasks
                  <span className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest hidden sm:inline-block">
                    {pendingCount} Pending
                  </span>
                </h3>
              </div>
              <AddReminderModal isGlobal={true} />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin border-2 border-amber-500 border-t-transparent rounded-full h-5 w-5 mb-2" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Syncing Reminders...</p>
                </div>
              ) : pendingCount === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800">
                    <CheckCircle2 className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">All tasks completed for today!</p>
                </div>
              ) : (
                reminders.map((r) => (
                  <div key={r.id} className="group relative bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900/50">
                    
                    {/* Patient / Context */}
                    <div className="flex items-center justify-between mb-3">
                      {r.patient_id ? (
                        <Link 
                          href={`/patient/${r.patient_id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          <UserPlus className="h-3 w-3" />
                          {r.patients?.name || "Patient Information"}
                          <ChevronRight className="h-2 w-2" />
                        </Link>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 leading-none">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            General Task
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">
                            Target: {r.target_gender || 'Both'}
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-400">
                        8:00 AM
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                      {expandedNotes.has(r.id) || r.notes.length <= 100 
                        ? r.notes
                        : `${r.notes.substring(0, 100)}...`}
                      
                      {r.notes.length > 100 && (
                        <button
                          onClick={() => setExpandedNotes(prev => {
                            const next = new Set(prev)
                            if (next.has(r.id)) next.delete(r.id)
                            else next.add(r.id)
                            return next
                          })}
                          className="text-[10px] font-bold text-amber-600 hover:underline ml-2 uppercase tracking-wide"
                        >
                          {expandedNotes.has(r.id) ? "Show Less" : "Read More"}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end gap-1.5 mt-2 opacity-20 hover:opacity-100 transition-opacity cursor-default select-none group">
                      <span className="h-[0.5px] w-4 bg-slate-400 group-hover:bg-slate-600 transition-colors"></span>
                      <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-slate-500">
                        Signed:
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                        Dr. {r.created_by_name}
                      </span>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setActiveResolve(r.id); setActiveReschedule(null); setResolveNotes(''); }}
                        className="h-8 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Resolved
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setActiveReschedule(r.id); setActiveResolve(null); setActiveEdit(null); setUpdatedNotes(r.notes); }}
                        className="h-8 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                      >
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                        Reschedule
                      </Button>
                      
                      {(r.created_by === userId || userRole === 'admin') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setActiveEdit(r.id); setActiveResolve(null); setActiveReschedule(null); setEditNotes(r.notes); setEditDate(r.reminder_date); }}
                          className="h-8 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 col-span-2 mt-1"
                        >
                          <MessageSquareCode className="h-3 w-3 mr-1.5" />
                          Edit Details
                        </Button>
                      )}
                    </div>

                    {/* Inline Resolve Form */}
                    {activeResolve === r.id && (
                      <div className="mt-4 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase mb-1">
                          <MessageSquareCode className="h-3 w-3" />
                          Success Report / Resolve Notes
                        </div>
                        <Textarea 
                          placeholder="What was done? (Optional)"
                          value={resolveNotes}
                          onChange={e => setResolveNotes(e.target.value)}
                          className="h-20 text-xs border-emerald-200 focus-visible:ring-emerald-500 bg-white"
                        />
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 h-8 text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleResolve(r.id)}
                          >
                            Confirm Done
                          </Button>
                          <Button 
                            variant="outline"
                            className="h-8 text-[10px] font-black uppercase border-emerald-200"
                            onClick={() => setActiveResolve(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Inline Edit Form */}
                    {activeEdit === r.id && (
                      <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase mb-1">
                          <MessageSquareCode className="h-3 w-3" />
                          Edit Reminder
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-[9px] font-bold text-slate-400 uppercase">Target Date</Label>
                            <Input 
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-[9px] font-bold text-slate-400 uppercase">Instructions</Label>
                            <Textarea 
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              className="h-24 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 h-8 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleEdit(r.id)}
                          >
                            Save Changes
                          </Button>
                          <Button 
                            variant="outline"
                            className="h-8 text-[10px] font-black uppercase border-indigo-200"
                            onClick={() => setActiveEdit(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Inline Reschedule Form */}
                    {activeReschedule === r.id && (
                      <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-4 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between mb-1">
                           <div className="flex items-center justify-end gap-1.5 mt-2 opacity-20 hover:opacity-100 transition-opacity cursor-default select-none group">
                        <span className="h-[0.5px] w-6 bg-slate-400 group-hover:bg-slate-600 transition-colors"></span>
                        <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-slate-500">
                          Verified By:
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                          Dr. {r.created_by_name}
                        </span>
                      </div>
                           <div className="flex gap-1.5">
                              <button 
                                onClick={() => setIsPartial(false)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${!isPartial ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                              >
                                Not Resolved
                              </button>
                              <button 
                                onClick={() => setIsPartial(true)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${isPartial ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                              >
                                Partial
                              </button>
                           </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-[9px] font-bold text-slate-400 uppercase ml-1">New Target Date</Label>
                            <Input 
                              type="date"
                              value={newDate}
                              onChange={e => setNewDate(e.target.value)}
                              className="h-8 text-xs border-amber-200 bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Update Instructions</Label>
                            <Textarea 
                              value={updatedNotes}
                              onChange={e => setUpdatedNotes(e.target.value)}
                              className="h-24 text-xs border-amber-200 bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 h-9 text-[10px] font-black uppercase bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleReschedule(r.id)}
                          >
                            Reschedule
                          </Button>
                          <Button 
                            variant="outline"
                            className="h-9 text-[10px] font-black uppercase border-amber-200"
                            onClick={() => setActiveReschedule(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <Link 
                href={userRole === 'admin' ? "/admin/manage?tab=reminders" : "/dashboard/archive"} 
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
              >
                <Calendar className="h-3 w-3" />
                View Full History & Archive
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
