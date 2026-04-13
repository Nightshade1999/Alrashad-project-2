"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { format } from "date-fns"
import { Search, ArrowLeft, FlaskConical, User, Home, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getBaghdadShiftStart } from "@/lib/utils"

export function LabHistory() {
  const [investigations, setInvestigations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchTodayTests = async () => {
    setLoading(true)
    const shiftStart = getBaghdadShiftStart()
    
    const { data, error } = await supabase
      .from("investigations")
      .select(`
        *,
        patients (name, ward_name, category)
      `)
      .gte("created_at", shiftStart.toISOString())
      .order("created_at", { ascending: false })

    if (!error && data) {
      setInvestigations(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTodayTests()
  }, [])

  const filtered = investigations.filter(inv => 
    inv.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/laboratory">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Today&apos;s Lab Log</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shift started at 09:00 AM Baghdad</p>
            </div>
          </div>
          <Badge className="bg-teal-600 text-white font-black px-4 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-teal-500/20">
            {investigations.length} Tests Recorded
          </Badge>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search log by patient name..."
            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold text-slate-700 dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <FlaskConical className="h-12 w-12 text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No tests found for this period</p>
          </div>
        ) : (
          filtered.map((inv) => (
            <Link key={inv.id} href={`/laboratory/patient/${inv.patient_id}`} className="block group">
              <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${inv.is_critical ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-teal-50 dark:bg-teal-900/30'}`}>
                         {inv.is_critical ? <AlertCircle className="h-6 w-6 text-rose-600 animate-pulse" /> : <FlaskConical className="h-6 w-6 text-teal-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate uppercase mt-0.5" dir="auto">
                            {inv.patients?.name || "Unknown Patient"}
                          </h3>
                          {inv.is_critical && (
                            <Badge className="bg-rose-600 text-white text-[8px] font-black uppercase px-2 py-0 border-none">Critical</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inv.patients?.ward_name || "Unknown Ward"}</span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(inv.created_at), "HH:mm · dd MMM")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          Tech: {inv.lab_tech_name || "N/A"}
                       </span>
                       <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                          View Details
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
