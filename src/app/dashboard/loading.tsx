import { Activity, Search, LayoutDashboard } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse pb-32">
      {/* Top Bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800/50 rounded-full" />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="h-12 flex-1 sm:w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-12 flex-1 sm:w-40 bg-teal-200/50 dark:bg-teal-900/30 rounded-2xl border border-teal-100 dark:border-teal-900/30" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="max-w-md space-y-2">
        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-full ml-1" />
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-700">
            <Search className="h-4 w-4" />
          </div>
          <div className="h-11 w-full bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800" />
        </div>
      </div>

      {/* Category Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          'border-red-100 dark:border-red-900/20',
          'border-amber-100 dark:border-amber-900/20',
          'border-emerald-100 dark:border-emerald-900/20',
          'border-violet-100 dark:border-violet-900/20',
        ].map((border, i) => (
          <div
            key={i}
            className={`relative rounded-[2rem] border-2 ${border} bg-white dark:bg-slate-900/50 p-6 overflow-hidden`}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800" />
            <div className="flex items-start justify-between mb-6">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800/50" />
            </div>
            <div className="h-12 w-16 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2" />
            <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded-full mb-1" />
            <div className="h-3 w-24 bg-slate-50 dark:bg-slate-800/50 rounded-full" />
            <div className="mt-6 h-4 w-28 bg-slate-50 dark:bg-slate-800/40 rounded-full" />
          </div>
        ))}
      </div>

      {/* Section Footer skeleton */}
      <div className="rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
             <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
             <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-full" />
          </div>
        </div>
        <div className="text-right space-y-2">
           <div className="h-10 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto" />
           <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-full" />
        </div>
      </div>

      {/* Loading Pulse Center */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-20">
         <Activity className="h-32 w-32 text-teal-500 animate-pulse" />
      </div>
    </div>
  )
}

