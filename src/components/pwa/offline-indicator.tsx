"use client"

import { useEffect, useState } from "react"
import { processSyncQueue, getPendingCount } from "@/lib/offline-sync"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    getPendingCount().then(setPendingCount)

    const handleOnline = async () => {
      setIsOnline(true)
      const count = await getPendingCount()
      if (count > 0) {
        setIsSyncing(true)
        toast.info(`Back online! Syncing ${count} items...`)
        const syncedCount = await processSyncQueue()
        setIsSyncing(false)
        setPendingCount(0)
        if (syncedCount > 0) {
          toast.success(`Sync complete: ${syncedCount} items uploaded.`)
        } else {
          toast.info("Sync check finished.")
        }
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("You are offline. Working from local cache.")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Poll for pending count while offline
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        getPendingCount().then(setPendingCount)
      }
    }, 2000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (isOnline) {
    if (isSyncing) {
      return (
        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 gap-1 rounded-full px-3 py-1 text-sm flex h-9">
          <Loader2 className="w-4 h-4 animate-spin" />
          Syncing...
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 rounded-full px-3 py-1 text-sm hidden sm:flex h-9">
        <Wifi className="w-4 h-4" />
        Online
      </Badge>
    )
  }

  return (
    <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 gap-2 rounded-full px-3 py-1 text-sm flex h-9 border font-semibold">
      <WifiOff className="w-4 h-4" />
      {pendingCount > 0 ? (
        <span className="flex items-center gap-1">
          Offline <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> {pendingCount} Pending
        </span>
      ) : (
        "Offline"
      )}
    </Badge>
  )
}

