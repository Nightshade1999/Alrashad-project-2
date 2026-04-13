"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, ExternalLink, X, FlaskConical, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { format } from "date-fns"
import { markNotificationAsReadAction, markAllNotificationsAsReadAction } from "@/app/actions/notification-actions"
import { toast } from "sonner"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ModalPortal } from "@/components/ui/modal-portal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTodayRemindersCountAction, getTodayRemindersAction } from "@/app/actions/reminder-actions"

export function NotificationCenter({ userId }: { userId: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)
  const [reminders, setReminders] = useState<any[]>([])
  const [prevCount, setPrevCount] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeTab, setActiveTab] = useState("reminders")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // 1. Initial Load
    const fetchNotifications = async () => {
      try {
        console.log("Initializing Clinical Notifications for:", userId)
        const { data, error } = await supabase
          .from("notifications")
          .select(`
            *,
            patients (name, ward_name)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        if (data) {
          setNotifications(data)
          const unread = data.filter(n => !n.is_read).length
          setUnreadCount(unread)
          setPrevCount(unread)
        }

        // 1.2 Fetch Reminders
        const remResult = await getTodayRemindersAction()
        if (remResult.data) {
          setReminders(remResult.data)
          setReminderCount(remResult.data.length)
        }
      } catch (err) {
        console.error("Failed to fetch initial notifications", err)
        toast.error("Alert Connection Failed", {
            description: "Please check your network and refresh."
        })
      }

      // 1.5 Fetch User Role & Set Default Tab for Mobile
      try {
        if (window.innerWidth < 768) {
          setActiveTab("alerts")
        }
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
            setUserRole(profile?.role || null)
        }
      } catch (err) {}
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          if (payload.new.user_id !== userId) return
          
          const { data: newNotif } = await supabase
            .from("notifications")
            .select('*, patients (name, ward_name)')
            .eq('id', payload.new.id)
            .single()

          if (newNotif) {
            setNotifications(prev => [newNotif, ...prev].slice(0, 20))
            setUnreadCount(c => c + 1)
            playChime()
            toast.info(newNotif.message, {
              description: "New clinical data update.",
              action: {
                label: "View",
                onClick: () => window.location.href = `/patient/${newNotif.patient_id}/investigations`
              }
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error("Realtime subscription failed.")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const playChime = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
      }
      // Modern browsers require interaction before audio can play.
      // We catch any NotAllowedError to prevent app crashes.
      audioRef.current.play().catch(e => {
        console.warn("Audio auto-play blocked by browser:", e.message)
      })
    } catch (e) {
      console.warn("Audio playback initialization failed", e)
    }
  }

  const handleMarkRead = async (id: string) => {
    const actingName = localStorage.getItem('wardManager_lastDoctorName') || undefined
    const res = await markNotificationAsReadAction(id, actingName)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
    }
  }

  const handleMarkAllRead = async () => {
    const actingName = localStorage.getItem('wardManager_lastDoctorName') || undefined
    const res = await markAllNotificationsAsReadAction(actingName)
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success("All notifications cleared")
    }
  }

  // HIDE FOR NURSE ON SELECT WARD
  if (userRole === 'nurse' && pathname === '/dashboard/select-ward') {
    return null
  }

  // Combined Badge Count
  const totalDisplayCount = unreadCount + reminderCount

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(!open)}
        className="relative h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <Bell className={`h-5 w-5 ${totalDisplayCount > 0 ? 'text-teal-600 dark:text-teal-400 animate-swing' : 'text-slate-500'}`} />
        {totalDisplayCount > 0 && (
          <span className="absolute top-2 right-2 h-4 w-4 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 animate-bounce">
            {totalDisplayCount}
          </span>
        )}
      </Button>

      {open && (
        <ModalPortal>
          <div 
            className="fixed inset-0 sm:inset-auto sm:top-16 sm:right-8 z-[100] w-screen h-[100dvh] sm:w-[420px] sm:h-auto sm:max-h-[600px] flex flex-col bg-white dark:bg-slate-950 shadow-2xl rounded-none sm:rounded-[2.5rem] border-none sm:border sm:border-slate-200 dark:sm:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden pt-safe"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-50/30 dark:bg-teal-900/10 shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <h3 className="font-black text-xs uppercase tracking-[0.2em] text-teal-800 dark:text-teal-200">System Alerts</h3>
                   {unreadCount > 0 && (
                     <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                   )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {unreadCount} unread laboratory updates
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleMarkAllRead} className="h-10 w-10 rounded-xl text-slate-400 hover:text-teal-600 transition-colors" title="Clear all">
                  <Check className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 transition-colors">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Dual Tabs for Laptop */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
               <div className="px-6 border-b border-slate-100 dark:border-slate-800 bg-teal-50/10">
                  <TabsList className="w-full bg-transparent h-12 gap-6">
                    <TabsTrigger 
                      value="alerts" 
                      className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-widest text-slate-400 data-[state=active]:text-teal-600"
                    >
                      Lab Alerts ({unreadCount})
                    </TabsTrigger>
                    {/* HIDE REMINDERS TAB ON MOBILE HEADERS */}
                    <TabsTrigger 
                      value="reminders" 
                      className="hidden md:flex flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-black text-[10px] uppercase tracking-widest text-slate-400 data-[state=active]:text-amber-600"
                    >
                      Ward Tasks ({reminderCount})
                    </TabsTrigger>
                  </TabsList>
               </div>

              <div className="flex-1 overflow-hidden relative">
                <TabsContent value="alerts" className="absolute inset-0 m-0 overflow-y-auto px-2 py-2 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto opacity-50">
                        <Bell className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Everything Caught Up</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 rounded-2xl transition-all border border-transparent ${notif.is_read ? 'opacity-60 grayscale-[0.5]' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 shadow-sm'}`}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${notif.is_read ? 'bg-slate-200 dark:bg-slate-800' : 'bg-teal-100 dark:bg-teal-900/40'}`}>
                            <FlaskConical className={`h-4 w-4 ${notif.is_read ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                  {format(new Date(notif.created_at), "HH:mm · dd MMM")}
                               </span>
                               {!notif.is_read && (
                                 <div className="h-1.5 w-1.5 bg-rose-600 rounded-full" />
                               )}
                            </div>
                            <p className="text-base font-black text-slate-900 dark:text-slate-100 mb-3 leading-snug">
                              {notif.message}
                            </p>
                             <div className="flex items-center gap-4 mt-1">
                               <Link 
                                 href={`/patient/${notif.patient_id}/investigations`} 
                                 onClick={() => {
                                   handleMarkRead(notif.id)
                                   setOpen(false)
                                 }}
                                 className="text-[10px] font-black uppercase text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1.5"
                               >
                                  <ExternalLink className="h-3 w-3" /> View Results
                               </Link>
                               {!notif.is_read && (
                                 <button 
                                   onClick={() => handleMarkRead(notif.id)}
                                   className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
                                 >
                                   <Check className="h-3 w-3" /> Mark as Read
                                 </button>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="reminders" className="absolute inset-0 m-0 overflow-y-auto px-2 py-2 space-y-1">
                  {reminders.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto opacity-50">
                        <CheckCircle2 className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Tasks Today</p>
                    </div>
                  ) : (
                    reminders.map((rem) => (
                      <div 
                        key={rem.id} 
                        className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 shadow-sm"
                      >
                        <div className="flex gap-3">
                          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest">
                                  Due: {rem.reminder_date}
                               </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 leading-snug">
                              {rem.notes}
                            </p>
                            <Link 
                              href="/reminders" 
                              onClick={() => setOpen(false)}
                              className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                               Go to Tasks <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </Tabs>

          {/* Footer */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-center pb-safe mb-safe">
             {activeTab === 'reminders' ? (
                <Link 
                  href={userRole === 'admin' ? "/admin/manage?tab=reminders" : "/dashboard/archive"}
                  onClick={() => setOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                >
                   View Task Archive
                </Link>
             ) : (
                <>
                  <Link 
                    href={userRole === 'lab_tech' ? '/laboratory/notifications' : '/dashboard/notifications'} 
                    onClick={() => setOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                  >
                      Labs Record History
                  </Link>
                  <Link 
                    href={userRole === 'lab_tech' ? '/laboratory/alerts' : '/dashboard/alerts'} 
                    onClick={() => setOpen(false)}
                    className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 tracking-[0.2em] py-1"
                  >
                      View Critical Value History
                  </Link>
                </>
             )}
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  )
}
