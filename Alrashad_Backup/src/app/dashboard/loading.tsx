export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-36 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-10 w-36 bg-teal-200 dark:bg-teal-800/50 rounded-lg" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="h-11 w-full max-w-lg bg-slate-100 dark:bg-slate-800 rounded-lg" />

      {/* AI Ward Safety Monitor skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-9 w-40 bg-red-100 dark:bg-red-900/30 rounded-lg" />
      </div>

      {/* Category Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-900/40',
          'bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40',
          'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40',
          'bg-violet-100 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/40',
        ].map((color, i) => (
          <div
            key={i}
            className={`relative rounded-2xl border ${color} p-6 overflow-hidden`}
          >
            {/* gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300 dark:bg-slate-600 rounded-t-2xl" />
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-white/60 dark:bg-slate-800/40" />
              <div className="h-6 w-6 rounded bg-white/40 dark:bg-slate-800/20" />
            </div>
            <div className="h-10 w-12 bg-white/50 dark:bg-slate-800/30 rounded-lg mb-2" />
            <div className="h-4 w-28 bg-white/50 dark:bg-slate-800/30 rounded mb-1" />
            <div className="h-3 w-20 bg-white/40 dark:bg-slate-800/20 rounded mt-1" />
            <div className="mt-4 h-4 w-24 bg-white/40 dark:bg-slate-800/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
