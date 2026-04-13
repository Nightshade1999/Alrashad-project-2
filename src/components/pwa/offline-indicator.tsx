"use client"

import { useState, useEffect } from 'react'
import { Cloud, CloudOff, Wifi, WifiOff } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

/**
 * A simplified, robust Offline Indicator that monitors the browser's 
 * connection status without external library dependencies.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(typeof window !== 'undefined' ? window.navigator.onLine : true)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return (
      <Badge 
        variant="outline" 
        className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest hidden sm:flex h-9 group relative cursor-help transition-all"
      >
        <Wifi className="w-3.5 h-3.5" />
        Online
        {/* Tooltip on hover */}
        <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-slate-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">
          Standard Cloud Connection Active
        </span>
      </Badge>
    )
  }

  return (
    <Badge 
      className="bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest flex h-9 border shadow-sm transition-all animate-pulse"
    >
      <WifiOff className="w-3.5 h-3.5" />
      Offline
    </Badge>
  )
}
