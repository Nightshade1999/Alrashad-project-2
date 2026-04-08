"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useState, useEffect, useRef } from 'react'
import { CloudOff, RefreshCw, Loader2, Wifi, WifiOff, Database, CheckCircle2 } from 'lucide-react'
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
  // Controls whether the "syncing" banner is visible — auto-hides after 3s
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const syncBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // When actual data flows (upload or download), show the sync banner briefly
      if (isSyncing) {
        setShowSyncBanner(true);
        // Clear any existing timer and restart the 3s countdown
        if (syncBannerTimerRef.current) clearTimeout(syncBannerTimerRef.current);
        syncBannerTimerRef.current = setTimeout(() => {
          setShowSyncBanner(false);
        }, 3000);
      }
    };

    updateStatus();
    const unsubscribe = ps.registerListener?.({ statusChanged: updateStatus });
    const interval = setInterval(updateStatus, 1000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
      if (syncBannerTimerRef.current) clearTimeout(syncBannerTimerRef.current);
    };
  }, [ps]);

  if (!ps) return null;

  // --- 1. FULL SCREEN INITIAL SYNC OVERLAY ---
  // Block UI until device has successfully synced at least once
  if (!status.hasSynced) {
    const isWaitingOffline = !status.connected;
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-indigo-500/10 opacity-50" />
        
        <div className="relative">
          <div className={`h-32 w-32 rounded-full border-t-4 border-r-4 ${isWaitingOffline ? 'border-amber-500' : 'border-teal-500'} animate-spin mb-8`} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Database className={`h-12 w-12 ${isWaitingOffline ? 'text-amber-400' : 'text-teal-400'}`} />
          </div>
        </div>

        {isWaitingOffline ? (
          <>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Waiting for Connection</h2>
            <p className="text-slate-400 max-w-sm mb-8 font-medium">
              This is your first time opening the app. A network connection is needed to download the ward database before offline mode can work.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Initial Clinical Sync</h2>
            <p className="text-slate-400 max-w-sm mb-8 font-medium">
              Downloading ward database for full offline availability. This ensures your patient records are ready even without signal.
            </p>
          </>
        )}

        <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
           <div className={`h-full ${isWaitingOffline ? 'bg-amber-500' : 'bg-teal-500'} animate-pulse w-full`} />
        </div>
        
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${isWaitingOffline ? 'text-amber-500' : 'text-teal-500'}`}>
           <RefreshCw className={`h-3 w-3 ${isWaitingOffline ? '' : 'animate-spin'}`} />
           {isWaitingOffline ? 'Awaiting Network...' : 'Syncing Patient Stream'}
        </div>
      </div>
    )
  }

  // --- 2. CONDITIONAL BOTTOM STATUS BAR ---
  // Show when: offline, OR briefly when data is being synced (auto-hides after 3s)
  const isShow = !status.connected || showSyncBanner;
  if (!isShow) return null;

  return (
     <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[env(safe-area-inset-bottom,16px)] pointer-events-none mb-4 sm:mb-6 flex justify-center animate-in slide-in-from-bottom duration-500">
        <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
           
           {showSyncBanner && status.connected ? (
             <>
               <RefreshCw className="h-4 w-4 text-teal-400 animate-spin" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Syncing</span>
                  <span className="text-[9px] font-bold text-slate-400">Updating medical records...</span>
               </div>
             </>
           ) : (
             <>
               <div className="p-1.5 bg-rose-500/20 rounded-lg">
                  <CloudOff className="h-4 w-4 text-rose-500" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Offline Mode</span>
                  <span className="text-[9px] font-bold text-slate-400">Working with local SQLite cache</span>
               </div>
             </>
           )}

        </div>
     </div>
  )
}

