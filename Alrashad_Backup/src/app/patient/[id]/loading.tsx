import { Loader2, User } from "lucide-react"

export default function PatientLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto py-10">
      {/* Skeleton for Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b-2 border-slate-100 dark:border-slate-800 pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse" />
        <div className="h-80 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse" />
      </div>
    </div>
  )
}
