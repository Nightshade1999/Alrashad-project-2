"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Calendar, CheckCircle2, RotateCcw, MessageSquareCode, UserPlus, ChevronRight, LayoutList, History } from "lucide-react"
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
import { createClient } from "@/lib/supabase"
import { NavigationButtons } from "@/components/layout/navigation-buttons"

export default function WardTasksPage() {
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
    
    const supabase = createClient()
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

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <NavigationButtons />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm shadow-amber-500/10">
                <LayoutList className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 italic">
                Ward Tasks
              </h1>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
              Manage clinical reminders and pending patient tasks for today.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <AddReminderModal isGlobal={true} />
          <Link href={userRole === 'admin' ? "/admin/manage?tab=reminders" : "/dashboard/archive"}>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 dark:border-slate-800 gap-2 font-bold text-xs uppercase tracking-widest">
              <History className="h-4 w-4" />
              Archive
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin border-4 border-amber-500 border-t-transparent rounded-full h-10 w-10 mb-4" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Syncing Clinical Tasks...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-slate-400 italic">All tasks completed! Your ward is clean.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reminders.map((r) => (
              <div 
                key={r.id} 
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-all hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-900/50 animate-in fade-in zoom-in-95 duration-300"
              >
                {/* Task Context */}
                <div className="flex items-center justify-between mb-4">
                  {r.patient_id ? (
                    <Link 
                      href={`/patient/${r.patient_id}`}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full"
                    >
                      <UserPlus className="h-3 w-3" />
                      {r.patients?.name || "Patient Information"}
                      <ChevronRight className="h-2.5 w-2.5" />
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-full leading-none">
                        <CheckCircle2 className="h-3 w-3" />
                        General Ward Task
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                    <Calendar className="h-3 w-3" />
                    {r.reminder_date}
                  </div>
                </div>

                {/* Content */}
                <div className="text-base font-medium text-slate-700 dark:text-slate-200 mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {expandedNotes.has(r.id) || r.notes.length <= 200 
                    ? r.notes
                    : `${r.notes.substring(0, 200)}...`}
                  
                  {r.notes.length > 200 && (
                    <button
                      onClick={() => setExpandedNotes(prev => {
                        const next = new Set(prev)
                        if (next.has(r.id)) next.delete(r.id)
                        else next.add(r.id)
                        return next
                      })}
                      className="text-[10px] font-black text-amber-600 hover:underline ml-2 uppercase tracking-wide"
                    >
                      {expandedNotes.has(r.id) ? "Show Less" : "Read More"}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between gap-6 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <div className="flex items-center gap-2 opacity-60">
                    <span className="text-[10px] font-serif italic uppercase tracking-widest text-slate-500">Signed:</span>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                      Dr. {r.created_by_name}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setActiveResolve(r.id); setActiveReschedule(null); setActiveEdit(null); setResolveNotes(''); }}
                      className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                      Resolve
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setActiveReschedule(r.id); setActiveResolve(null); setActiveEdit(null); setUpdatedNotes(r.notes); }}
                      className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      Reschedule
                    </Button>
                    
                    {(r.created_by === userId || userRole === 'admin') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setActiveEdit(r.id); setActiveResolve(null); setActiveReschedule(null); setEditNotes(r.notes); setEditDate(r.reminder_date); }}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl"
                      >
                        <MessageSquareCode className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline Forms */}
                {(activeResolve === r.id || activeEdit === r.id || activeReschedule === r.id) && (
                  <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {activeResolve === r.id && (
                      <>
                        <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Resolve Success Report</Label>
                        <Textarea 
                          placeholder="What was the outcome? (Optional)"
                          value={resolveNotes}
                          onChange={e => setResolveNotes(e.target.value)}
                          className="h-24 bg-white dark:bg-slate-900 rounded-xl text-sm"
                        />
                        <div className="flex gap-2">
                          <Button className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest text-white rounded-xl" onClick={() => handleResolve(r.id)}>Confirm Resolution</Button>
                          <Button variant="outline" className="h-10 rounded-xl font-bold text-xs" onClick={() => setActiveResolve(null)}>Cancel</Button>
                        </div>
                      </>
                    )}
                    
                    {activeEdit === r.id && (
                      <>
                        <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Edit Task Details</Label>
                        <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-10 bg-white dark:bg-slate-900 rounded-xl" />
                        <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="h-32 bg-white dark:bg-slate-900 rounded-xl text-sm" />
                        <div className="flex gap-2">
                          <Button className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest text-white rounded-xl" onClick={() => handleEdit(r.id)}>Save Changes</Button>
                          <Button variant="outline" className="h-10 rounded-xl font-bold text-xs" onClick={() => setActiveEdit(null)}>Cancel</Button>
                        </div>
                      </>
                    )}

                    {activeReschedule === r.id && (
                      <>
                         <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                           <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Reschedule Task</Label>
                           <div className="flex gap-1.5">
                              <button 
                                onClick={() => setIsPartial(false)}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${!isPartial ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                              >
                                NOT RESOLVED
                              </button>
                              <button 
                                onClick={() => setIsPartial(true)}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${isPartial ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                              >
                                PARTIAL RESOLVE
                              </button>
                           </div>
                        </div>
                        <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-10 bg-white dark:bg-slate-900 rounded-xl" />
                        <Textarea value={updatedNotes} onChange={e => setUpdatedNotes(e.target.value)} className="h-32 bg-white dark:bg-slate-900 rounded-xl text-sm" />
                        <div className="flex gap-2">
                          <Button className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 font-black uppercase text-[10px] tracking-widest text-white rounded-xl" onClick={() => handleReschedule(r.id)}>Reschedule Task</Button>
                          <Button variant="outline" className="h-10 rounded-xl font-bold text-xs" onClick={() => setActiveReschedule(null)}>Cancel</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
