"use client"

import { useState, useEffect } from "react"
import { 
  FileText, Search, Trash2, Eye, Calendar, MapPin, 
  User, Loader2, ClipboardList, ArrowUpDown, ChevronRight 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { format } from "date-fns"
import { getAllReferralsForAdminAction, deleteReferralAction } from "@/app/actions/admin-actions"
import { ReferralDocumentView } from "@/components/patient/referral-document-view"

export function ReferralManagement() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingReferral, setViewingReferral] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    setLoading(true)
    try {
      const res = await getAllReferralsForAdminAction()
      if (res.error) throw new Error(res.error)
      setReferrals(res.data || [])
    } catch (err: any) {
      toast.error("Failed to fetch referrals: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the referral letter for "${name}"? This cannot be undone.`)) return
    
    setIsDeleting(id)
    try {
      const res = await deleteReferralAction(id)
      if (res.error) throw new Error(res.error)
      toast.success("Referral deleted successfully")
      setReferrals(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      toast.error("Delete failed: " + err.message)
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredReferrals = referrals.filter(ref => {
    const q = searchQuery.toLowerCase()
    return (
      ref.patients?.name?.toLowerCase().includes(q) ||
      ref.patients?.medical_record_number?.toLowerCase().includes(q) ||
      ref.destination?.toLowerCase().includes(q) ||
      ref.user_profiles?.doctor_name?.toLowerCase().includes(q)
    )
  })

  // Full-screen overlay for viewing the document
  if (viewingReferral) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-950 overflow-y-auto">
        <ReferralDocumentView 
          referral={viewingReferral} 
          onBack={() => setViewingReferral(null)} 
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-500" />
            Referral Log
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Archived clinical handover records</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search name, MRN, or destination..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <p className="font-bold text-slate-500 dark:text-slate-400">Restoring clinical log...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center px-6">
          <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">No referral records found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mt-1">
            {searchQuery ? "Try adjusting your search terms or filters." : "Official referral letters will appear here once created by doctors."}
          </p>
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-4 rounded-xl">Clear Search</Button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Date & Logistics</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Patient Details</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Destination</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Created By</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredReferrals.map((ref) => (
                <tr key={ref.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                         <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                         {format(new Date(ref.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono pl-5">
                        {format(new Date(ref.created_at), "HH:mm")} • ID: {ref.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{ref.patients?.name || "Unknown Patient"}</div>
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                           MRN: {ref.patients?.medical_record_number || "---"}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded">
                           {ref.patients?.ward_name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        {ref.destination}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium pl-5 truncate max-w-[150px]">
                        {ref.department || "No Department Specified"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                         <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {ref.user_profiles?.doctor_name || "Specialist Physician"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setViewingReferral(ref)}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500"
                        title="View Letter"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={isDeleting === ref.id}
                        onClick={() => handleDelete(ref.id, ref.patients?.name)}
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-500"
                        title="Delete Record"
                      >
                        {isDeleting === ref.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Showing {filteredReferrals.length} of {referrals.length} logs
             </p>
             <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 cursor-help uppercase tracking-widest">
               Handover Integrity: OK <ChevronRight className="h-3 w-3" />
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
