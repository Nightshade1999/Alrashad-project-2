"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Beaker, AlertTriangle, User, History, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function LabAlertHistory() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<any[]>([])
  const [labRanges, setLabRanges] = useState<any[]>([])
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
      const { data: aData } = await supabase
        .from("investigations")
        .select(`
          *,
          patients (
            id,
            name,
            ward_name,
            room_number
          )
        `)
        .eq("is_critical", true)
        .not("lab_tech_id", "is", null)
        .order("date", { ascending: false })

      const { data: rData } = await supabase
        .from("lab_reference_ranges")
        .select("*")

      // Fetch role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", user.id)
          .single()
        setUserRole(profile?.role || null)
      }

      if (aData) setAlerts(aData)
      if (rData) setLabRanges(rData)
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const getUnit = (key: string) => {
    return labRanges.find(r => r.key === key)?.unit || ""
  }

  const filteredAlerts = alerts.filter(alert => 
    alert.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.patients?.ward_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full min-h-screen bg-slate-50/30 dark:bg-transparent">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            className="rounded-2xl hover:bg-white dark:hover:bg-slate-800 font-bold -ml-2" 
            onClick={() => {
              if (userRole === 'lab_tech') router.push("/laboratory")
              else router.push("/dashboard")
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK TO DASHBOARD
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <AlertTriangle className="h-10 w-10 text-rose-500 fill-rose-500/10" />
              ALERT HISTORY
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Critical Value Tracking Log</p>
          </div>
        </div>

        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by patient or ward..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="p-20 text-center font-black animate-pulse text-slate-400 italic">
            RETRIEVING CRITICAL RECORDS...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full">
                <Beaker className="h-12 w-12 text-slate-300" />
             </div>
             <div className="space-y-1">
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">No Critical Alerts</p>
                <p className="text-slate-500 font-medium">No investigations have been flagged as critical yet.</p>
             </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className="rounded-[2.5rem] border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-xl overflow-hidden group hover:scale-[1.01] transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Status Indicator Bar */}
                  <div className="w-full md:w-3 bg-rose-500" />
                  
                  <CardContent className="p-8 flex-1">
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      {/* Left Side: Patient & Date */}
                      <div className="space-y-4 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-rose-50 dark:bg-rose-950 p-3 rounded-2xl">
                            <User className="h-6 w-6 text-rose-600" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1" dir="auto">
                              {alert.patients?.name || "Unknown Patient"}
                            </h3>
                            <div className="flex gap-2">
                               <Badge className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-black border-teal-200 dark:border-teal-800 text-[10px] uppercase">
                                  Ward: {alert.patients?.ward_name || "N/A"}
                               </Badge>
                               <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black border-indigo-200 dark:border-indigo-800 text-[10px] uppercase">
                                  Room: {alert.patients?.room_number || "N/A"}
                               </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-slate-400">
                            <History className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">
                               {format(new Date(alert.date), "PPP p")}
                            </span>
                          </div>
                          {alert.lab_tech_name && (
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md w-fit">
                              Tech: {alert.lab_tech_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Key Values Highlight */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 md:pl-8 md:border-l border-slate-100 dark:border-slate-800">
                         {alert.wbc && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">WBC</p>
                              <p className="text-xl font-black text-rose-600">{alert.wbc} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('wbc')}</span></p>
                           </div>
                         )}
                         {alert.hb && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Hemoglobin</p>
                              <p className="text-xl font-black text-rose-600">{alert.hb} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('hb')}</span></p>
                           </div>
                         )}
                         {alert.rbs && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">RBS</p>
                              <p className="text-xl font-black text-rose-600">{alert.rbs} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('rbs')}</span></p>
                           </div>
                         )}
                         {alert.s_creatinine && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Creatinine</p>
                              <p className="text-xl font-black text-rose-600">{alert.s_creatinine} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('s_creatinine')}</span></p>
                           </div>
                         )}
                         {alert.tsb && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">TSB</p>
                              <p className="text-xl font-black text-rose-600">{alert.tsb} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('tsb')}</span></p>
                           </div>
                         )}
                         {alert.alp && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ALP</p>
                              <p className="text-xl font-black text-rose-600">{alert.alp} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('alp')}</span></p>
                           </div>
                         )}
                         {(alert.ast || alert.alt) && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">AST/ALT</p>
                              <p className="text-xl font-black text-rose-600">{alert.ast || '-'}/{alert.alt || '-'} <span className="text-[10px] text-rose-400 font-medium tracking-normal">{getUnit('ast')}</span></p>
                           </div>
                         )}
                         <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex flex-col justify-center cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => router.push(`/laboratory/patient/${alert.patient_id}`)}>
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">View File</p>
                            <ArrowLeft className="h-4 w-4 text-indigo-500 rotate-180 transition-transform group-hover:translate-x-1" />
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
