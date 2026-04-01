"use client"

import { useEffect, useState } from "react"
import { processSyncQueue } from "@/lib/offline-sync"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Back Online! Syncing changes...")
      processSyncQueue().then(() => {
        toast.success("Sync completed.")
      })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("You are offline. Working from local cache.")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) {
    return (
      <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 rounded-full px-3 py-1 text-sm hidden sm:flex h-9">
        <Wifi className="w-4 h-4" />
        Online
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 gap-1 rounded-full px-3 py-1 text-sm flex h-9">
      <WifiOff className="w-4 h-4" />
      Offline Storage
    </Badge>
  )
}
