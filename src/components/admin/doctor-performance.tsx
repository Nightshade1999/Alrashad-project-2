"use client"

import { useMemo } from 'react'
import { Activity, Stethoscope, AlertCircle, FileText, CheckCircle2, Clock } from 'lucide-react'

export function DoctorPerformance({ users, patients }: { users: any[], patients: any[] }) {
  
  const performanceMetrics = useMemo(() => {
    if (!users || !patients) return []

    return users.map(user => {
      const userPatients = patients.filter(p => p.user_id === user.id)
      const totalPatients = userPatients.length
      const highRiskCount = userPatients.filter(p => p.category === 'High Risk').length
      
      let totalVisits = 0
      let overduePatients = 0

      userPatients.forEach(p => {
        const vCount = p.visits?.length || 0
        const iCount = p.investigations?.length || 0
        totalVisits += (vCount + iCount)

        // Only calculate overdue strictly for Internal Medicine residents
        if (user.specialty === 'internal_medicine') {
          // Find the most recent date between all visits and investigations
          let latestDate = new Date(p.created_at) // Default to creation date if no visits

          if (p.visits && p.visits.length > 0) {
            const lastVisit = [...p.visits].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]
            if (lastVisit && new Date(lastVisit.visit_date) > latestDate) {
              latestDate = new Date(lastVisit.visit_date)
            }
          }

          if (p.investigations && p.investigations.length > 0) {
            const lastInv = [...p.investigations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            if (lastInv && new Date(lastInv.date) > latestDate) {
              latestDate = new Date(lastInv.date)
            }
          }

          const daysSinceLastAction = Math.floor((new Date().getTime() - latestDate.getTime()) / (1000 * 3600 * 24))
          
          let isOverdue = false
          if (p.category === 'High Risk' && daysSinceLastAction > 7) isOverdue = true
          else if (p.category === 'Close Follow-up' && daysSinceLastAction > 30) isOverdue = true
          else if (p.category === 'Normal' && daysSinceLastAction > 90) isOverdue = true

          if (isOverdue) overduePatients++
        }
      })

      const complianceRate = totalPatients > 0 ? (((totalPatients - overduePatients) / totalPatients) * 100).toFixed(0) : '100'
      const engagementScore = totalPatients > 0 ? (totalVisits / totalPatients).toFixed(1) : '0.0'

      return {
        ...user,
        totalPatients,
        highRiskCount,
        totalVisits,
        engagementScore,
        overduePatients,
        complianceRate
      }
    }).sort((a, b) => {
      // Sort so Internal Medicine and Overdue naturally rise up, then by total patients
      if (a.overduePatients !== b.overduePatients) return b.overduePatients - a.overduePatients
      return b.totalPatients - a.totalPatients
    })
  }, [users, patients])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-500" /> Doctor Performance Matrix
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceMetrics.map((perf) => (
          <div key={perf.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            
            {/* Status Indicator */}
            {perf.overduePatients > 0 ? (
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 animate-pulse" />
            ) : perf.highRiskCount > 5 ? (
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
            ) : (
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
            )}

            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                  {perf.email.split('@')[0]}
                </h3>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <span className="text-xs font-medium text-slate-500">{perf.ward_name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded ${perf.specialty === 'internal_medicine' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                    {perf.specialty === 'internal_medicine' ? 'IM Resident' : 'Psych Resident'}
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <Stethoscope className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{perf.totalPatients}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Patients</div>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{perf.highRiskCount}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-500 mt-1">High Risk</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-2">
                 <FileText className="h-4 w-4 text-slate-400" />
                 <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {perf.specialty === 'internal_medicine' ? `${perf.totalVisits} Evaluations` : `${perf.totalVisits} Entries`}
                 </span>
               </div>
               <div className="flex flex-col items-end">
                 <span className={`text-xl font-black ${perf.specialty === 'internal_medicine' ? 'text-teal-600 dark:text-teal-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {perf.specialty === 'internal_medicine' ? `${perf.complianceRate}%` : perf.engagementScore}
                 </span>
                 <span className="text-[10px] uppercase font-bold text-slate-400">
                    {perf.specialty === 'internal_medicine' ? 'Adherence' : 'Ratio'}
                 </span>
               </div>
            </div>

            {/* Strict Internal Medicine Compliance Warnings */}
            {perf.specialty === 'internal_medicine' && (
              <div className={`mt-2 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${
                perf.overduePatients > 0 
                  ? 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400' 
                  : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
              }`}>
                {perf.overduePatients > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>{perf.overduePatients} Patient(s) OVERDUE for follow-up!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>100% Medical Follow-up Compliance</span>
                  </>
                )}
              </div>
            )}
            
            {/* General Workload Warning for Psych/Others */}
            {perf.specialty !== 'internal_medicine' && perf.highRiskCount > 10 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1.5 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5" /> High burnout risk (High alert volume)
              </div>
            )}
          </div>
        ))}

        {performanceMetrics.length === 0 && (
           <div className="col-span-full p-8 text-center text-slate-500 border border-dashed rounded-xl">
             No doctor performance data available.
           </div>
        )}
      </div>
    </div>
  )
}
