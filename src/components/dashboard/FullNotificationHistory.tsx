"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Bell, Search, User, Clock, CheckCircle2, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export function FullNotificationHistory() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
          router.push('/login')
          return
      }

      // 1. Fetch Role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single()
      setUserRole(profile?.role || null)

      // 2. Fetch last 30 days of notifications
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: nData } = await supabase
        .from("notifications")
        .select(`
          *,
          patients (
            id,
            name,
            ward_name,
            room_number
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })

      if (nData) setNotifications(nData)
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const filteredNotifications = notifications.filter(n => 
    n.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.patients?.ward_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBack = () => {
    if (userRole === 'lab_tech') router.push("/laboratory")
    else router.push("/dashboard")
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full min-h-screen">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" className="rounded-2xl hover:bg-white dark:hover:bg-slate-800 font-bold -ml-2" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK TO DASHBOARD
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Bell className="h-10 w-10 text-teal-600 fill-teal-500/10" />
              LABS RECORD HISTORY
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">30-Day Clinical Update Log</p>
          </div>
        </div>

        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search patients or results..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-20 text-center font-black animate-pulse text-slate-400 italic">
            RETRIEVING AUDIT LOGS...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full">
                <Bell className="h-12 w-12 text-slate-300" />
             </div>
             <div className="space-y-1">
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">No Records Found</p>
                <p className="text-slate-500 font-medium text-sm">No clinical updates found for the selected criteria.</p>
             </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredNotifications.map((notif) => (
              <Card key={notif.id} className={`rounded-[2rem] border-none shadow-sm overflow-hidden transition-all hover:shadow-md ${notif.is_read ? 'bg-white/40 dark:bg-slate-900/40 opacity-80' : 'bg-white dark:bg-slate-900 border-l-4 border-teal-500'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    {/* Main Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-2xl shrink-0 ${notif.is_read ? 'bg-slate-100 dark:bg-slate-800' : 'bg-teal-50 dark:bg-teal-900/40'}`}>
                         <FlaskConical className={`h-6 w-6 ${notif.is_read ? 'text-slate-400' : 'text-teal-600'}`} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                           <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight" dir="auto">
                             {notif.patients?.name || "System Update"}
                           </h3>
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter h-5">
                             {notif.patients?.ward_name || "N/A"}
                           </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-snug">
                          {notif.message}
                        </p>
                        
                        {/* Audit Trail */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                           <div className="flex items-center gap-1.5 text-slate-400">
                             <Clock className="h-3 w-3" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">
                               Sent: {format(new Date(notif.created_at), "PPP p")}
                             </span>
                           </div>
                           {notif.is_read && (
                             <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                               <CheckCircle2 className="h-3 w-3" />
                               <span className="text-[10px] font-black uppercase tracking-wider">
                                 Read by {notif.read_by_doctor_name} at {format(new Date(notif.read_at), "HH:mm")}
                               </span>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                        onClick={() => router.push(`/patient/${notif.patients?.id}/investigations`)}
                      >
                        VIEW RESULTS
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
