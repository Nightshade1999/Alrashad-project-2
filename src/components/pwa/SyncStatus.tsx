"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useState, useEffect, useRef } from 'react'
import { Cloud, CloudOff, RefreshCcw, CheckCircle2, Loader2 } from 'lucide-react'

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

export function SyncStatus() {
  const ps = usePowerSync();
  const [status, setStatus] = useState<{
    connected: boolean;
    hasSynced: boolean;
    lastSyncedAt: Date | null;
    isSyncing: boolean;
  }>(() => deriveStatus(ps));

  // Track previous status key to avoid redundant re-renders
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

    // Immediate read on mount
    updateStatus();

    // Listener-based updates (fires on status changes)
    const unsubscribe = ps.registerListener?.({ statusChanged: updateStatus });

    // Polling fallback — catches the "connected" transition even when the
    // listener fires before this component mounts (race condition)
    const interval = setInterval(updateStatus, 2000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [ps]);

  if (!ps) return null;

  const isConnecting = !status.connected && !status.hasSynced;

  const label = status.isSyncing
    ? 'Syncing...'
    : status.connected
      ? (status.hasSynced ? 'Safe & Synced' : 'Online')
      : isConnecting
        ? 'Connecting...'
        : 'Offline Mode';

  const colorClass = status.isSyncing
    ? 'text-teal-600'
    : status.connected
      ? 'text-emerald-600'
      : 'text-amber-600';

  const cardClass = status.connected
    ? 'bg-white/90 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800'
    : 'bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800';

  return (
    <div className="fixed bottom-6 left-6 z-[60] group animate-in slide-in-from-left-10 duration-500">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 shadow-2xl transition-all duration-300 backdrop-blur-md ${cardClass}`}>
        {status.isSyncing ? (
          <RefreshCcw className="h-4 w-4 text-teal-500 animate-spin" />
        ) : status.connected ? (
          <Cloud className="h-4 w-4 text-emerald-500" />
        ) : isConnecting ? (
          <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
        ) : (
          <CloudOff className="h-4 w-4 text-amber-500" />
        )}

        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>
            {label}
          </span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
            {status.lastSyncedAt
              ? `Updated: ${status.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : isConnecting ? 'Establishing connection...' : 'Starting connection...'}
          </span>
        </div>

        {status.connected && status.hasSynced && !status.isSyncing && (
          <div className="ml-1 opacity-100 transition-opacity">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        )}
      </div>

      <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
        status.connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
      }`} />
    </div>
  );
}
