"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useDatabase } from '@/hooks/useDatabase'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CloudOff, RefreshCw, Loader2, Database, CheckCircle2 } from 'lucide-react'
import { logEvent } from '@/lib/pwa/black-box'

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
  const { profile } = useDatabase();
  const role = profile?.role || 'Guest';

  // ── PowerSync not yet initialised ──────────────────────────
  // Show an initialising overlay rather than returning null.
  // This way the full-screen gate is visible from the very first render
  // and the disconnectAndClear / version-check path is always covered.
  const [psReady, setPsReady] = useState(false);
  useEffect(() => {
    if (ps) setPsReady(true);
  }, [ps]);

  const [status, setStatus] = useState<{
    connected: boolean;
    hasSynced: boolean;
    lastSyncedAt: Date | null;
    isSyncing: boolean;
  }>(() => deriveStatus(ps));

  const lastStatusRef = useRef<string>('');
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const syncBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track if we've EVER completed a sync to prevent the full screen 
  // initialization gate from flashing during navigations or background reconnects.
  const hasEverSyncedRef = useRef(false);

  const updateStatus = useCallback(() => {
    if (!ps) return;
    const currentStatus = ps.currentStatus;
    if (!currentStatus) return;

    const isSyncing = !!(currentStatus.dataFlowStatus?.downloading || currentStatus.dataFlowStatus?.uploading);
    const lastSyncedAt = currentStatus.lastSyncedAt ? new Date(currentStatus.lastSyncedAt) : null;
    const lastSyncedTime = lastSyncedAt?.getTime() || 0;

    // THROTLE: Only update state if meaningful status fields change
    const statusKey = `${currentStatus.connected}-${currentStatus.hasSynced}-${isSyncing}-${lastSyncedTime}`;
    if (statusKey === lastStatusRef.current) return;
    lastStatusRef.current = statusKey;

    logEvent('PWA: Status Update', { connected: currentStatus.connected, hasSynced: currentStatus.hasSynced, isSyncing });

    setStatus({
      connected: !!currentStatus.connected,
      hasSynced: !!currentStatus.hasSynced,
      lastSyncedAt,
      isSyncing,
    });

    if (currentStatus.hasSynced) {
      hasEverSyncedRef.current = true;
    }

    if (isSyncing) {
      setShowSyncBanner(true);
      if (syncBannerTimerRef.current) clearTimeout(syncBannerTimerRef.current);
      syncBannerTimerRef.current = setTimeout(() => {
        setShowSyncBanner(false);
      }, 3000);
    }
  }, [ps]);

  useEffect(() => {
    if (!ps) return;

    updateStatus();
    
    // Register listener for reactive updates
    const unsubscribe = ps.registerListener?.({ 
      statusChanged: () => {
        // Use requestAnimationFrame to ensure we don't hammer the main thread
        // during high-frequency sync events.
        requestAnimationFrame(updateStatus);
      } 
    });

    // CRITICAL: Removed setInterval polling. We rely entirely on the reactive listener
    // to prevent the "A problem repeatedly occurred" rendering crash.

    return () => {
      if (unsubscribe) unsubscribe();
      if (syncBannerTimerRef.current) clearTimeout(syncBannerTimerRef.current);
    };
  }, [ps, updateStatus]);

  // --- 1. FULL-SCREEN GATE ---
  // Show while PowerSync is booting OR until the first sync completes.
  // We use hasEverSyncedRef so that temporary disconnects don't plunge the user back into the loading screen.
  if (!psReady || (!hasEverSyncedRef.current && !status.hasSynced)) {
    const isInitialising = !psReady;
    const isWaitingOffline = psReady && !status.connected;

    const spinnerColor = isInitialising
      ? 'border-slate-500'
      : isWaitingOffline
        ? 'border-amber-500'
        : 'border-teal-500';

    const iconColor = isInitialising
      ? 'text-slate-400'
      : isWaitingOffline
        ? 'text-amber-400'
        : 'text-teal-400';

    const accentColor = isInitialising
      ? 'text-slate-500'
      : isWaitingOffline
        ? 'text-amber-500'
        : 'text-teal-500';

    const barColor = isInitialising
      ? 'bg-slate-600'
      : isWaitingOffline
        ? 'bg-amber-500'
        : 'bg-teal-500';

    const label = isInitialising
      ? 'Starting System...'
      : isWaitingOffline
        ? 'Awaiting Network...'
        : 'Syncing Patient Stream';

    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-indigo-500/10 opacity-50" />

        <div className="relative">
          <div className={`h-32 w-32 rounded-full border-t-4 border-r-4 ${spinnerColor} animate-spin mb-8`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className={`h-12 w-12 ${iconColor}`} />
          </div>
        </div>

        {isInitialising ? (
          <>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Starting Clinical System</h2>
            <p className="text-slate-400 max-w-sm mb-8 font-medium">
              Initialising local database engine. This takes a moment on first load.
            </p>
          </>
        ) : isWaitingOffline ? (
          <>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Waiting for Connection</h2>
            <p className="text-slate-400 max-w-sm mb-8 font-medium">
              A network connection is required to download your ward database before offline mode can work.
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
          <div className={`h-full ${barColor} animate-pulse w-full`} />
        </div>

        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>
          <RefreshCw className={`h-3 w-3 ${!isInitialising && !isWaitingOffline ? 'animate-spin' : ''}`} />
          {label}
        </div>
      </div>
    )
  }

  // --- 2. CONDITIONAL BOTTOM STATUS BAR ---
  // For debugging the refresh loop, we force the bar to be always visible.
  const isShow = true; 
  if (!isShow) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[env(safe-area-inset-bottom,16px)] pointer-events-none mb-4 sm:mb-6 flex justify-center animate-in slide-in-from-bottom duration-500">
      <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">

        {status.connected ? (
          showSyncBanner ? (
            <>
              <RefreshCw className="h-4 w-4 text-teal-400 animate-spin" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Syncing</span>
                <span className="text-[9px] font-bold text-slate-400">Updating medical records...</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-1.5 bg-teal-500/20 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-teal-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">System Online</span>
                <span className="text-[9px] font-bold text-slate-400">Verified & Synchronized</span>
              </div>
            </>
          )
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

        {/* Black Box Access */}
        <button 
          onClick={() => {
            const raw = localStorage.getItem('app_black_box') || '[]';
            const logs = JSON.parse(raw);
            const text = logs.map((l: any) => `[${l.t}] ${l.m}`).join('\n');
            alert(text || 'Black Box is empty.');
          }}
          className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors pointer-events-auto group"
          title="Read Clinical Black Box"
        >
          <span className="sr-only">Audit Logs</span>
          <Database className="h-3 w-3 text-teal-500/50 group-hover:text-teal-400" />
        </button>

        {/* Diagnostic Metadata */}
        <div className="ml-2 pl-4 border-l border-white/10 flex flex-col items-end">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-teal-500/80">v18.1.0</span>
          <span className={`text-[8px] font-bold uppercase tracking-widest ${role === 'admin' ? 'text-amber-400' : 'text-slate-500'}`}>
            {role}
          </span>
        </div>

      </div>
    </div>
  )
}
