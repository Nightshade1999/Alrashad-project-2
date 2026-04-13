"use client"

import { useState, useEffect } from "react"
import { Search, Beaker, Users, Activity, LogOut, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function LaboratoryDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [patients, setPatients] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentTech, setCurrentTech] = useState<string | null>(null)
  const [stats, setStats] = useState({
    todayTests: 0,
    criticalAlerts: 0
  })
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchIdentity = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("lab_tech_name")
        .eq("user_id", user.id)
        .single()
      
      if (profile?.lab_tech_name) {
        setCurrentTech(profile.lab_tech_name)
      }
    }
  }

  useEffect(() => {
    fetchIdentity()
    
    // Listen for identity updates from the modal
    window.addEventListener('lab_tech_identity_updated', fetchIdentity)
    return () => window.removeEventListener('lab_tech_identity_updated', fetchIdentity)
  }, [])

  // Fetch search results
  useEffect(() => {
    const searchPatients = async () => {
      if (searchQuery.length < 2) {
        setPatients([])
        return
      }
      
      setIsSearching(true)
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, age, ward_name, room_number")
        .ilike("name", `%${searchQuery}%`)
        .limit(10)
      
      if (!error && data) {
        setPatients(data)
      }
      setIsSearching(false)
    }

    const timer = setTimeout(searchPatients, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch stats (Today's Tests and Critical Alerts)
  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const [todayRes, alertsRes] = await Promise.all([
        supabase
          .from("investigations")
          .select("id", { count: 'exact', head: true })
          .gte("created_at", today.toISOString())
          .not("lab_tech_id", "is", null),
        supabase
          .from("investigations")
          .select("id", { count: 'exact', head: true })
          .eq("is_critical", true)
          .not("lab_tech_id", "is", null)
      ])

      setStats({
        todayTests: todayRes.count || 0,
        criticalAlerts: alertsRes.count || 0
      })
    }
    fetchStats()
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
               <Beaker className="h-6 w-6 text-white" />
             </div>
             <div>
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                  Laboratory System
                </h1>
                <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest leading-none">Diagnostic Information Hub</p>
             </div>
          </div>
          
          {currentTech && (
            <div className="flex items-center gap-2 mt-4 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                 Acting as: <span className="text-slate-900 dark:text-white uppercase">{currentTech}</span>
               </p>
               <button 
                onClick={() => {
                  sessionStorage.removeItem('labTech_sessionActive')
                  window.location.reload()
                }}
                className="ml-2 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase underline underline-offset-2"
               >
                 Switch
               </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            className={cn(
              "group/button h-12 inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 text-sm font-black transition-all hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
            )}
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = "/login"
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            SIGN OUT
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-teal-500 to-indigo-500 rounded-[2.5rem] blur-sm opacity-25 group-focus-within:opacity-50 transition-opacity" />
        <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-2 shadow-2xl">
          <div className="relative flex items-center">
            <Search className="absolute left-6 h-6 w-6 text-slate-400" />
            <Input 
              placeholder="Search patients across all wards (e.g., Patient Name)..." 
              className="h-16 pl-16 pr-8 text-xl font-bold bg-transparent border-none focus-visible:ring-0 shadow-none placeholder:text-slate-400 placeholder:font-normal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results / Empty State */}
      <div className="grid gap-4">
        {isSearching && (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        )}

        {!isSearching && patients.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Search Results ({patients.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((patient) => (
                <Link key={patient.id} href={`/laboratory/patient/${patient.id}`}>
                  <Card className="hover-lift border-white/20 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] overflow-hidden cursor-pointer group active:scale-[0.98] transition-all">
                    <CardHeader className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-xl font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors line-clamp-1" dir="auto">
                            {patient.name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full">
                              {patient.age === -1 ? "N/A" : `${patient.age}y`}
                            </Badge>
                            <Badge className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-black border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full uppercase tracking-tighter">
                              {patient.ward_name}
                            </Badge>
                            {patient.room_number && (
                              <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-full uppercase tracking-tighter">
                                Room {patient.room_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="bg-teal-500 text-white rounded-2xl p-3 shadow-lg shadow-teal-500/20">
                          <Activity className="h-6 w-6" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isSearching && searchQuery.length >= 2 && patients.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-6 rounded-full">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 italic uppercase italic">No Patients Found</p>
              <p className="text-slate-500 font-medium">Check the name spelling or try another search term.</p>
            </div>
          </div>
        )}

        {searchQuery.length < 2 && (
          <div className="bg-linear-to-br from-teal-500/5 to-indigo-500/5 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/50">
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Waiting for input...</p>
            <p className="text-slate-500 mt-2 font-medium">Type at least 2 characters to begin patient search.</p>
          </div>
        )}
      </div>
      
      {/* Quick Dashboard Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
        <div className="space-y-6">
          <Link href="/laboratory/history" className="block hover-lift transition-all active:scale-98">
            <Card className="rounded-[2rem] border-none bg-linear-to-br from-teal-500 to-teal-700 text-white shadow-xl">
               <CardHeader className="p-8">
                  <p className="text-teal-100 text-xs font-black uppercase tracking-[0.2em] mb-1">Today&apos;s Tests</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-5xl font-black italic tracking-tighter">
                      {String(stats.todayTests).padStart(2, '0')}
                    </h3>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                  </div>
               </CardHeader>
            </Card>
          </Link>
          
          <Link href="/laboratory/alerts" className="block">
            <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl border-t-4 border-t-amber-500 hover-lift active:scale-98 transition-all h-full">
               <CardHeader className="p-8 flex flex-row items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-1">Critical Alerts</p>
                    <h3 className={`text-5xl font-black italic tracking-tighter ${stats.criticalAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                      {stats.criticalAlerts > 0 ? String(stats.criticalAlerts).padStart(2, '0') : 'None'}
                    </h3>
                    {stats.criticalAlerts > 0 && <p className="text-[10px] font-black text-rose-500 mt-2 uppercase tracking-widest animate-pulse">Action Required</p>}
                  </div>
                  <Activity className={`h-12 w-12 ${stats.criticalAlerts > 0 ? 'text-rose-500' : 'text-amber-500 opacity-50'}`} />
               </CardHeader>
            </Card>
          </Link>
        </div>

        <ReferenceConfig />
      </div>
    </div>
  )
}

function ReferenceConfig() {
  const [ranges, setRanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchRanges = async () => {
      const { data } = await supabase
        .from("lab_reference_ranges")
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true })
      if (data) setRanges(data)
      setLoading(false)
    }
    fetchRanges()
  }, [supabase])

  if (loading) return null

  return (
    <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-[500px]">
      <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              REFERENCE RANGES
            </CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global System Defaults</p>
          </div>
          <Badge variant="outline" className="rounded-full text-[9px] font-black px-3 py-1 bg-white dark:bg-slate-800 border-dashed animate-pulse text-teal-600">
            SYST-WIDE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto scrollbar-hide flex-1">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {ranges.map((range) => (
            <ReferenceRangeRow 
              key={range.id} 
              range={range} 
              onSave={async (updates) => {
                const { error } = await supabase
                  .from("lab_reference_ranges")
                  .update(updates)
                  .eq("id", range.id)
                
                if (error) {
                  toast.error(error.message)
                  return false
                } else {
                  toast.success(`${range.label} range updated`)
                  return true
                }
              }} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ReferenceRangeRow({ range, onSave }: { range: any, onSave: (updates: any) => Promise<boolean> }) {
  const [localMin, setLocalMin] = useState(range.min_value)
  const [localMax, setLocalMax] = useState(range.max_value)
  const [localUnit, setLocalUnit] = useState(range.unit)
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = 
    localMin !== range.min_value || 
    localMax !== range.max_value || 
    localUnit !== range.unit

  const handleSave = async () => {
    setIsSaving(true)
    await onSave({
      min_value: localMin === "" ? null : Number(localMin),
      max_value: localMax === "" ? null : Number(localMax),
      unit: localUnit
    })
    setIsSaving(false)
  }

  return (
    <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{range.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">{range.category}</span>
            {isDirty && (
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="h-6 px-3 rounded-full bg-teal-600 hover:bg-teal-700 text-[9px] font-black uppercase text-white animate-in zoom-in-90"
              >
                {isSaving ? "..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Min</p>
            <Input 
              type="number" step="0.01" 
              value={localMin ?? ""} 
              onChange={(e) => setLocalMin(e.target.value)}
              className={cn(
                "h-10 rounded-xl bg-white dark:bg-slate-950 font-bold border-slate-200 text-sm py-0 transition-colors",
                localMin !== range.min_value && "border-teal-500 bg-teal-50/30"
              )} 
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Max</p>
            <Input 
              type="number" step="0.01" 
              value={localMax ?? ""} 
              onChange={(e) => setLocalMax(e.target.value)}
              className={cn(
                "h-10 rounded-xl bg-white dark:bg-slate-950 font-bold border-slate-200 text-sm transition-colors",
                localMax !== range.max_value && "border-teal-500 bg-teal-50/30"
              )} 
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Unit</p>
            <Input 
              value={localUnit ?? ""} 
              onChange={(e) => setLocalUnit(e.target.value)}
              className={cn(
                "h-10 rounded-xl bg-white dark:bg-slate-950 font-bold border-slate-200 text-sm transition-colors",
                localUnit !== range.unit && "border-teal-500 bg-teal-50/30"
              )} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
