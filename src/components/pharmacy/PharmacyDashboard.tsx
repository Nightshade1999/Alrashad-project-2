"use client"

import { useState, useEffect } from "react"
import { LayoutDashboard, Package, ScanQrCode, AlertTriangle, Clock, TrendingUp, Search, LogOut } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useDatabase } from "@/hooks/useDatabase"

export function PharmacyDashboard() {
  const { profile } = useDatabase()
  const [stats, setStats] = useState({
    totalDrugs: 0,
    lowStock: 0,
    expiringSoon: 0,
    latestArrivals: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  // Use the standardized Supabase client
  const supabase = createClient()

  const fetchStats = async () => {
    setLoading(true)
    
    // Fetch records to calculate accurate stats
    const { data: allItems, error } = await (supabase as any)
      .from("pharmacy_inventory")
      .select("quantity, min_stock_level, expiration_date")

    if (error) {
      console.error("PharmacyDashboard: Error fetching stats", error)
      setLoading(false)
      return
    }

    if (allItems) {
      const now = new Date()
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(now.getMonth() + 6)

      const total = allItems.length
      const low = allItems.filter((item: any) => 
        item.quantity !== null && 
        item.min_stock_level !== null && 
        item.quantity <= item.min_stock_level
      ).length

      const expiring = allItems.filter((item: any) => {
        if (!item.expiration_date) return false
        const expDate = new Date(item.expiration_date)
        return expDate >= now && expDate <= sixMonthsFromNow
      }).length

      const { data: latest } = await (supabase as any)
        .from("pharmacy_inventory")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      setStats({
        totalDrugs: total,
        lowStock: low,
        expiringSoon: expiring,
        latestArrivals: latest || []
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
    
    // Listen for identity updates from the modal
    const handleIdentityUpdate = () => {
      // The profile update is handled by useDatabase, but we might want to refetch stats if needed
      // Actually window.location.reload() or similar might be used in the switch logic
    }
    window.addEventListener('pharmacy_identity_updated', handleIdentityUpdate)
    return () => window.removeEventListener('pharmacy_identity_updated', handleIdentityUpdate)
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 italic underline decoration-teal-500/30">
            PHARMACY HUB
          </h1>
          {profile?.pharmacist_name && (
            <div className="flex items-center gap-2 mt-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                 Acting Pharmacist: <span className="text-slate-900 dark:text-white uppercase">{profile.pharmacist_name}</span>
               </p>
               <button 
                onClick={() => {
                  sessionStorage.removeItem('pharmacist_sessionActive')
                  window.location.reload()
                }}
                className="ml-2 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase underline underline-offset-2"
               >
                 Switch
               </button>
            </div>
          )}
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Inventory & Distribution System</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="ghost"
            className={cn(
              "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-background hover:bg-muted font-black px-6 py-2 h-12 text-sm transition-all"
            )}
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = "/login"
            }}
          >
             <LogOut className="h-4 w-4 mr-2" />
             EXIT
          </Button>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/pharmacy/inventory" className="lg:col-span-2">
          <Card className="hover-lift h-full relative overflow-hidden group border-none bg-linear-to-br from-teal-600 to-teal-800 text-white shadow-2xl rounded-[2.5rem] cursor-pointer">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            <CardHeader className="p-6 sm:p-10 relative z-10">
               <Package className="h-10 w-10 sm:h-14 sm:w-14 mb-4" />
               <CardTitle className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase">MANAGE INVENTORY</CardTitle>
               <p className="text-teal-100/80 font-medium text-sm sm:text-lg mt-2">View stock, update quantities, and add new drug formulations.</p>
            </CardHeader>
            <div className="px-6 sm:px-10 pb-6 sm:pb-10 relative z-10">
               <span className="inline-flex items-center text-[10px] sm:text-sm font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full">
                  Explore Stock <TrendingUp className="ml-2 h-4 w-4" />
               </span>
            </div>
          </Card>
        </Link>

        <Link href="/pharmacy/scanner" className="lg:col-span-2">
          <Card className="hover-lift h-full relative overflow-hidden group border-none bg-linear-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl rounded-[2.5rem] cursor-pointer">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            <CardHeader className="p-6 sm:p-10 relative z-10">
               <ScanQrCode className="h-10 w-10 sm:h-14 sm:w-14 mb-4" />
               <CardTitle className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase">GUDEA SCANNER</CardTitle>
               <p className="text-indigo-100/80 font-medium text-sm sm:text-lg mt-2">Scan Iraqi national drug QR codes to quickly import and verify drug info.</p>
            </CardHeader>
            <div className="px-6 sm:px-10 pb-6 sm:pb-10 relative z-10">
               <span className="inline-flex items-center text-[10px] sm:text-sm font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full">
                  Open Camera <ScanQrCode className="ml-2 h-4 w-4" />
               </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href="/pharmacy/inventory" className="block group">
          <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-xl border-b-4 border-b-teal-500 hover-lift active:scale-98 transition-all cursor-pointer h-full">
            <CardHeader className="p-6">
               <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Formulations</p>
               <h3 className="text-4xl font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">{stats.totalDrugs}</h3>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/pharmacy/inventory?filter=low" className="block group">
          <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-xl border-b-4 border-b-rose-500 hover-lift active:scale-98 transition-all cursor-pointer h-full">
            <CardHeader className="p-6">
               <div className="flex items-center justify-between">
                 <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Low Stock Alerts</p>
                 <AlertTriangle className="h-4 w-4 text-rose-500" />
               </div>
               <h3 className="text-4xl font-black text-rose-600">{stats.lowStock}</h3>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/pharmacy/inventory?filter=expiring" className="block group">
          <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-xl border-b-4 border-b-amber-500 hover-lift active:scale-98 transition-all cursor-pointer h-full">
            <CardHeader className="p-6">
               <div className="flex items-center justify-between">
                 <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Expiring Soon</p>
                 <Clock className="h-4 w-4 text-amber-500" />
               </div>
               <h3 className="text-4xl font-black text-amber-600">{stats.expiringSoon}</h3>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Recently Added Inventory</h2>
        <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
           <CardContent className="p-0">
              {stats.latestArrivals.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic">No inventory recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Drug Detail</th>
                        <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Scientific Name</th>
                        <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Exp. Date</th>
                        <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {stats.latestArrivals.map((drug) => (
                        <tr key={drug.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950 font-black text-teal-600 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                                {drug.formulation?.slice(0, 3).toUpperCase() || "TAB"}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{drug.generic_name || drug.scientific_name}</p>
                                <p className="text-xs font-bold text-slate-400">{drug.dosage}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-medium text-slate-600 dark:text-slate-400 italic">{drug.scientific_name}</td>
                          <td className="px-8 py-6">
                             <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-[10px] font-black">{drug.expiration_date || "N/A"}</Badge>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-lg font-black text-slate-900 dark:text-white">{drug.quantity}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
