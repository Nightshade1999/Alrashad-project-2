"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useState, useEffect, useRef } from 'react'
import { Cloud, CloudOff, RefreshCcw, Loader2, Wifi, WifiOff } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

function deriveStatus(ps: any) {
  const currentStatus = ps?.currentStatus;
  if (!currentStatus) return { connected: false, hasSynced: false, lastSyncedAt: null, isSyncing: false };
  const isSyncing = !!(currentStatus.dataFlowStatus?.downloading || currentStatus.dataFlowStatus?.uploading);
  const lastSyncedAt = currentStatus.lastSyncedAt ? new Date(currentStatus.lastSyncedAt) : null;
  return {
    connected: !!currentStatus.connected,
    hasSynced: !!currentStatus.hasSynced,
    lastSyncedAt,
    isSyncing,
  };
}

export function OfflineIndicator() {
  const ps = usePowerSync();
  const [status, setStatus] = useState<{
    connected: boolean;
    hasSynced: boolean;
    lastSyncedAt: Date | null;
    isSyncing: boolean;
  }>(() => deriveStatus(ps));

  const lastStatusRef = useRef<string>('');

  useEffect(() => {
    if (!ps) return;

    const updateStatus = () => {
      const currentStatus = ps.currentStatus;
      if (!currentStatus) return;

      const isSyncing = !!(currentStatus.dataFlowStatus?.downloading || currentStatus.dataFlowStatus?.uploading);
      const lastSyncedAt = currentStatus.lastSyncedAt ? new Date(currentStatus.lastSyncedAt) : null;
      const lastSyncedTime = lastSyncedAt?.getTime() || 0;

      const statusKey = `${currentStatus.connected}-${currentStatus.hasSynced}-${isSyncing}-${lastSyncedTime}`;

      if (statusKey === lastStatusRef.current) return;
      lastStatusRef.current = statusKey;

      setStatus({
        connected: !!currentStatus.connected,
        hasSynced: !!currentStatus.hasSynced,
        lastSyncedAt,
        isSyncing,
      });
    };

    updateStatus();
    const unsubscribe = ps.registerListener?.({ statusChanged: updateStatus });
    const interval = setInterval(updateStatus, 3000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [ps]);

  if (!ps) return null;

  const isConnecting = !status.connected && !status.hasSynced;

  // Render Logic
  if (status.isSyncing) {
    return (
      <Badge variant="outline" className="text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest flex h-9">
        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
        Syncing...
      </Badge>
    )
  }

  if (status.connected) {
    return (
      <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest hidden sm:flex h-9 group relative cursor-help">
        <Cloud className="w-3.5 h-3.5" />
        Synced
        {/* Tooltip on hover */}
        <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-slate-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">
          Last Updated: {status.lastSyncedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
        </span>
      </Badge>
    )
  }

  if (isConnecting) {
    return (
      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest flex h-9">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Connecting...
      </Badge>
    )
  }

  return (
    <Badge className="bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 gap-2 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest flex h-9 border shadow-sm">
      <CloudOff className="w-3.5 h-3.5" />
      Offline Mode
    </Badge>
  )
}

