import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-teal-100 dark:border-teal-900/30" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
      </div>
      <div className="mt-6 flex flex-col items-center gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400 animate-pulse">
          Alrashad Clinical
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Syncing Patient Records...
        </p>
      </div>
    </div>
  )
}
