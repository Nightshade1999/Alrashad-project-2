"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Bell, Search, Clock, CheckCircle2, FlaskConical, UserRoundCog, Repeat, History as HistoryIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function WardNotificationsPage({ 
  params 
}: { 
  params: Promise<{ wardName: string }> 
}) {
  const { wardName: encodedWardName } = use(params)
  const wardName = decodeURIComponent(encodedWardName)
  const router = useRouter()
  
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString();

      // 1. Fetch Instructions for this ward
      const { data: instructions } = await supabase
        .from('nurse_instructions')
        .select('*, patient:patients(name)')
        .eq('ward_name', wardName)
        .gt('created_at', since)

      // 2. Fetch Lab Notifications for this ward
      // This is trickier since notifications are by user_id. 
      // But for nurses, we want ward-wide lab alerts.
      // Usually lab alerts have a patient_id.
      const { data: labNotifs } = await supabase
        .from('notifications')
        .select('*, patients(id, name, ward_name)')
        .gt('created_at', since)
        .not('patient_id', 'is', null)

      const filteredLabs = (labNotifs || []).filter((n: any) => n.patients?.ward_name === wardName)

      // 3. Combine and Sort
      const combined = [
        ...(instructions || []).map(i => ({ ...i, type: 'instruction' })),
        ...filteredLabs.map(l => ({ ...l, type: 'lab' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setItems(combined)
      setIsLoading(false)
    }

    fetchData()
  }, [wardName])

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const patientName = item.patient?.name || item.patients?.name || "";
    const message = item.instruction || item.message || "";
    return patientName.toLowerCase().includes(searchLower) || message.toLowerCase().includes(searchLower);
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" className="rounded-2xl hover:bg-white dark:hover:bg-slate-800 font-bold -ml-2" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Bell className="h-10 w-10 text-blue-600 fill-blue-500/10" />
              WARD RECORD HUB
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{wardName} Ward · 30-Day Clinical Log</p>
          </div>
        </div>

        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search patients or notes..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-20 text-center font-black animate-pulse text-slate-400 italic">
            RETRIEVING WARD LOGS...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full">
                <Bell className="h-12 w-12 text-slate-300" />
             </div>
             <p className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">No Ward Records</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-l-4 border-blue-500">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-2xl shrink-0 ${item.type === 'lab' ? 'bg-teal-50 dark:bg-teal-900/40' : 'bg-blue-50 dark:bg-blue-900/40'}`}>
                         {item.type === 'lab' ? (
                           <FlaskConical className="h-6 w-6 text-teal-600" />
                         ) : (
                           <UserRoundCog className="h-6 w-6 text-blue-600" />
                         )}
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                           <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                             {item.patient?.name || item.patients?.name || "Ward Update"}
                           </h3>
                            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter ${item.type === 'lab' ? 'text-teal-600 border-teal-200' : 'text-blue-600 border-blue-200'}`}>
                              {item.type === 'lab' ? 'Lab Alert' : (item.instruction_type === 'repetitive' ? 'Repetitive' : 'Instruction')}
                            </Badge>
                            {item.instruction_type === 'repetitive' && (
                              <Badge className="bg-blue-100 text-blue-600 text-[8px] font-black border-none uppercase pr-2">
                                <Repeat className="mr-1 h-2 w-2" />
                                {item.duration_days} Days
                              </Badge>
                            )}
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-100 italic leading-snug">
                          {item.type === 'lab' ? item.message : `"${item.instruction}"`}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                           <div className="flex items-center gap-1.5 text-slate-400">
                             <Clock className="h-3 w-3" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">
                                {format(new Date(item.created_at), "PPP p")}
                             </span>
                           </div>
                           {item.type === 'instruction' && (
                             <div className="flex items-center gap-1.5 text-blue-600">
                               <span className="text-[10px] font-black uppercase tracking-wider">
                                 From: Dr. {item.doctor_name}
                               </span>
                             </div>
                           )}
                           {item.read_at && item.instruction_type !== 'repetitive' && (
                             <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                               <CheckCircle2 className="h-3 w-3" />
                               <span className="text-[10px] font-black uppercase tracking-wider">
                                 Acknowledged {format(new Date(item.read_at), "HH:mm")}
                               </span>
                             </div>
                           )}
                           
                           {item.instruction_type === 'repetitive' && item.acknowledgments?.length > 0 && (
                             <div className="w-full mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                               <div className="flex items-center gap-2 mb-3 text-slate-500">
                                  <HistoryIcon className="h-3 w-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Acknowledgment Log</span>
                               </div>
                               <div className="space-y-2">
                                  {item.acknowledgments.map((ack: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                       <span className="font-bold text-slate-700 dark:text-slate-300">
                                         {ack.nurse_name}
                                       </span>
                                       <span className="text-slate-400 font-medium">
                                         {format(new Date(ack.at), "dd MMM, HH:mm")}
                                       </span>
                                    </div>
                                  ))}
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
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
