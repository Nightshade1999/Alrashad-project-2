"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useState, useEffect } from 'react'
import { Cloud, CloudOff, RefreshCcw, CheckCircle2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'

export function SyncStatus() {
  const ps = usePowerSync();
  const [status, setStatus] = useState<{
    connected: boolean;
    lastSyncedAt: Date | null;
    isSyncing: boolean;
  }>({
    connected: false,
    lastSyncedAt: null,
    isSyncing: false
  });

  useEffect(() => {
    if (!ps) return;

    const updateStatus = () => {
      setStatus({
        connected: ps.status.connected,
        lastSyncedAt: ps.status.lastSyncedAt || null,
        isSyncing: ps.status.isSyncing
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, [ps]);

  if (!ps) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60] group animate-in slide-in-from-left-10 duration-500">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 shadow-2xl transition-all duration-300 backdrop-blur-md ${
        status.isSyncing 
          ? 'bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800' 
          : status.connected 
            ? 'bg-white/90 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800'
            : 'bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800'
      }`}>
        {status.isSyncing ? (
          <RefreshCcw className="h-4 w-4 text-indigo-500 animate-spin" />
        ) : status.connected ? (
          <Cloud className="h-4 w-4 text-emerald-500" />
        ) : (
          <CloudOff className="h-4 w-4 text-amber-500" />
        )}

        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            status.isSyncing ? 'text-indigo-600' : status.connected ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {status.isSyncing ? 'Syncing...' : status.connected ? 'Safe & Synced' : 'Offline Mode'}
          </span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
            {status.lastSyncedAt ? `Last update: ${status.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for initial sync...'}
          </span>
        </div>

        {status.connected && !status.isSyncing && (
          <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        )}
      </div>

      {/* Network Status Dot */}
      <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
        status.connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
      }`} />
    </div>
  );
}
