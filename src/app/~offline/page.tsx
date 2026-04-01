import { WifiOff, RotateCcw } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="h-10 w-10 text-slate-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">You are offline</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
        The Ward Manager requires an active internet connection to synchronize live patient data. Please check your connection and try again.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Retry Connection
      </button>
    </div>
  )
}
