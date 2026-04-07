"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Search, Calendar, User, Filter, CheckCircle2, RotateCcw, AlertCircle, Trash2, ArrowUpDown, Pencil, Check, X as XIcon, UserCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getRemindersArchiveAction, deleteReminderAction, updateReminderAction } from "@/app/actions/reminder-actions"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

export function ReminderArchive() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'rescheduled'>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState<'all' | 'internal_medicine' | 'psychiatry'>('all')
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [userProfile, setUserProfile] = useState<{role: string, specialty?: string, gender?: string} | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Edit State
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    async function load() {
      const res = await getRemindersArchiveAction()
      if (res.data) setReminders(res.data)
      
      // Get auth and role for personalized UI using proper browser client
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
         setUserId(user.id)
         const { data: profile } = await (supabase.from('user_profiles') as any).select('role, specialty, gender').eq('user_id', user.id).single()
         setUserProfile(profile)
      }
      
      setLoading(false)
    }
    load()
  }, [])

  const isAdmin = userProfile?.role === 'admin'

  const handleEdit = async (id: string) => {
    const result = await updateReminderAction(id, {
      notes: editNotes,
      reminder_date: editDate
    })
    if (result.success) {
      toast.success("Reminder updated successfully")
      setReminders(prev => prev.map(r => r.id === id ? { ...r, notes: editNotes, reminder_date: editDate } : r))
      setActiveEdit(null)
    } else {
      toast.error(result.error || "Failed to update")
    }
  }

  const filtered = useMemo(() => {
    return reminders.filter(r => {
      const matchSearch = 
        r.patients?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.notes?.toLowerCase().includes(search.toLowerCase()) ||
        r.created_by_name?.toLowerCase().includes(search.toLowerCase())
      
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSpecialty = specialtyFilter === 'all' || r.target_specialty === specialtyFilter
      const matchMine = !showOnlyMine || r.created_by === userId
      
      return matchSearch && matchStatus && matchSpecialty && matchMine
    })
  }, [reminders, search, statusFilter, specialtyFilter, showOnlyMine, userId])

  const stats = {
    pending: reminders.filter(r => r.status === 'pending').length,
    resolved: reminders.filter(r => r.status === 'resolved').length,
    rescheduled: reminders.filter(r => r.status === 'rescheduled').length
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin border-4 border-indigo-500 border-t-transparent rounded-full h-8 w-8 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Reminder Archive...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: isAdmin ? 'Today Pending' : 'My Pending', count: stats.pending, color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
          { label: isAdmin ? 'Successfully Resolved' : 'My Resolved', count: stats.resolved, color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
          { label: isAdmin ? 'Rescheduled/Modified' : 'My Rescheduled', count: stats.rescheduled, color: 'bg-indigo-100 text-indigo-700', icon: RotateCcw }
        ].map(s => (
          <div key={s.label} className={`${s.color} p-4 rounded-2xl flex items-center justify-between border border-transparent hover:border-current/10 transition-all`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{s.label}</p>
              <h4 className="text-2xl font-black">{s.count}</h4>
            </div>
            <s.icon className="h-8 w-8 opacity-20" />
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search notes, patients, or doctors..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`h-11 rounded-xl px-4 border-slate-200 dark:border-slate-700 font-bold transition-all ${
              showOnlyMine 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30" 
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <UserCircle className={`h-4 w-4 mr-2 ${showOnlyMine ? "fill-indigo-100 dark:fill-indigo-900" : ""}`} />
            My Reminders
          </Button>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 h-11 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="rescheduled">Rescheduled</option>
          </select>

          {isAdmin && (
            <select 
              value={specialtyFilter} 
              onChange={e => setSpecialtyFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 h-11 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Specialties</option>
              <option value="internal_medicine">Internal Medicine</option>
              <option value="psychiatry">Psychiatry</option>
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Target Date</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Patient</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Clinical Task / Notes</th>
              {isAdmin && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Target Ward/Role</th>}
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">From Doctor</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Resolution</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((r) => {
              const canEdit = r.status === 'pending' && (r.created_by === userId || isAdmin)
              const isEditing = activeEdit === r.id

              return (
                <React.Fragment key={r.id}>
                  <tr className={`group transition-colors ${isEditing ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {format(parseISO(r.reminder_date), "dd MMM yyyy")}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${
                          r.patient_id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {r.patient_id ? (r.patients?.name?.charAt(0) || '?') : '✓'}
                        </div>
                        <div>
                            <p className={`text-sm font-bold italic ${
                              r.patient_id ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {r.patient_id ? (r.patients?.name || 'Unknown Patient') : 'General Task'}
                            </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs align-top">
                      <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {expandedNotes.has(r.id) || r.notes.length <= 80 
                          ? r.notes
                          : `${r.notes.substring(0, 80)}...`}
                        
                        {r.notes.length > 80 && (
                          <button
                            onClick={() => setExpandedNotes(prev => {
                              const next = new Set(prev)
                              if (next.has(r.id)) next.delete(r.id)
                              else next.add(r.id)
                              return next
                            })}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 ml-2 uppercase tracking-wide inline-block"
                          >
                            {expandedNotes.has(r.id) ? "Show Less" : "Read More"}
                          </button>
                        )}
                      </div>
                        <div className="flex items-center justify-end gap-1.5 mt-2 opacity-20 group-hover:opacity-100 transition-opacity cursor-default select-none">
                          <span className="h-[0.5px] w-4 bg-slate-400"></span>
                          <span className="text-[8px] font-serif italic uppercase tracking-[0.2em] text-slate-500">
                            Signed:
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-100">
                            Dr. {r.created_by_name}
                          </span>
                        </div>
                    </td>
                    {isAdmin && (
                      <td className="p-4">
                        <Badge variant="outline" className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                          r.target_specialty === 'psychiatry' ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {r.target_specialty === 'psychiatry' ? 'Psychiatry' : 'Internal Med'}
                          <span className="ml-1 opacity-60">({r.target_gender || 'Both'})</span>
                        </Badge>
                      </td>
                    )}
                    <td className="p-4 font-bold text-xs text-slate-600 dark:text-slate-400">
                       {r.created_by_name}
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          r.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                          r.status === 'resolved' ? 'bg-emerald-500' :
                          'bg-indigo-500'
                        }`} />
                        {r.status}
                      </div>
                    </td>
                    <td className="p-4">
                      {r.status !== 'pending' ? (
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 italic">By {r.resolved_by_name}</p>
                           <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{r.resolve_notes || "No notes"}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Awaiting Action</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setActiveEdit(null)
                              } else {
                                setActiveEdit(r.id)
                                setEditNotes(r.notes)
                                setEditDate(r.reminder_date)
                              }
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              isEditing 
                                ? 'bg-indigo-600 text-white shadow-lg' 
                                : 'text-indigo-400 hover:text-white hover:bg-indigo-600'
                            }`}
                            title="Edit Reminder"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this reminder permanently?')) return
                              setDeletingId(r.id)
                              const result = await deleteReminderAction(r.id)
                              if (result.success) {
                                setReminders(prev => prev.filter(rem => rem.id !== r.id))
                                toast.success('Reminder deleted')
                              } else {
                                toast.error(result.error || 'Failed to delete')
                              }
                              setDeletingId(null)
                            }}
                            disabled={deletingId === r.id}
                            className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-600 transition-all disabled:opacity-30"
                            title="Delete Reminder"
                          >
                            <Trash2 className={`h-4 w-4 ${deletingId === r.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit form */}
                  {isEditing && (
                    <tr className="bg-indigo-50/50 dark:bg-indigo-950/20">
                      <td colSpan={isAdmin ? 8 : 7} className="p-5">
                        <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-top-1">
                          <div className="flex-1 space-y-3">
                             <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Clinical Instructions</label>
                                <textarea
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  className="w-full h-24 p-3 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                  placeholder="Update clinical task details..."
                                />
                             </div>
                          </div>
                          <div className="w-full sm:w-64 space-y-4">
                             <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">New Target Date</label>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm h-11"
                                />
                             </div>
                             <div className="flex gap-2">
                                <Button 
                                  onClick={() => handleEdit(r.id)}
                                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Update
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => setActiveEdit(null)}
                                  className="h-11 px-4 border-slate-200 dark:border-slate-800 font-black text-xs uppercase tracking-widest rounded-xl"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                             </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 italic tracking-wide">No reminders found matching your search</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}
