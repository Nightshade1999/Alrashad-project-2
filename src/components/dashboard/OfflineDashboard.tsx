"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, AlertCircle, Clock, Activity, CalendarClock, LayoutDashboard, Settings } from 'lucide-react'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { ExportButton } from '@/components/dashboard/export-button'
import { GlobalSearch } from '@/components/dashboard/global-search'
import { UrgentInsights } from '@/components/dashboard/urgent-insights'
import type { Patient } from '@/types/database.types'

export function OfflineDashboard() {
  const { patients, isOfflineMode, profile } = useDatabase();
  const ps = usePowerSync();
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PowerSync.watch() reads directly from local SQLite — it works whether
    // online or offline. We no longer gate on isOfflineMode; ps being ready
    // is the only prerequisite. This prevents the "0 patients" race condition
    // where isOfflineMode hadn't resolved yet when the component mounted.
    if (!ps) return;

    const abortController = new AbortController();

    const watcher = ps.watch(
      `SELECT * FROM patients WHERE category != 'Deceased/Archive' ORDER BY updated_at DESC`,
      [],
      { signal: abortController.signal }
    );

    (async () => {
      try {
        setLoading(true);
        for await (const result of watcher) {
          setPatientList((result.rows?._array || []) as any[]);
          setLoading(false);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error("PowerSync watch error:", e);
      }
    })();

    return () => abortController.abort();
  }, [ps]);

  const myWardName = profile?.ward_name ?? null;
  const [isCachedAdmin, setIsCachedAdmin] = useState(false);

  useEffect(() => {
    // Check localStorage directly for an emergency fallback if the reactive profile hasn't synced yet.
    if (typeof window !== 'undefined' && profile?.user_id) {
      try {
        const cachedRaw = localStorage.getItem(`profile_cache_${profile.user_id}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.role?.toLowerCase() === 'admin') setIsCachedAdmin(true);
        }
      } catch (e) {
        console.debug('Dashboard: Cache check failed', e);
      }
    }
  }, [profile?.user_id]);

  useEffect(() => {
    if (profile?.user_id) {
      console.log('[Clinical Admin Diagnostic]', {
        userId: profile.user_id,
        currentRole: profile.role,
        metadataRole: (profile as any).metadata_role,
        isSystemAdmin: profile?.role?.toLowerCase() === 'admin' || (profile as any)?.metadata_role?.toLowerCase() === 'admin'
      });
    }
  }, [profile]);

  const isAdmin = profile?.role?.toLowerCase() === 'admin' || isCachedAdmin || (profile as any)?.metadata_role?.toLowerCase() === 'admin';

  // For non-admins, scope the count to their assigned ward only
  const scopedList = isAdmin || !myWardName
    ? patientList
    : patientList.filter(p => p.ward_name === myWardName);

  const counts = {
    'High Risk': scopedList.filter(p => p.category === 'High Risk' && !p.is_in_er).length,
    'Close Follow-up': scopedList.filter(p => p.category === 'Close Follow-up' && !p.is_in_er).length,
    'Normal': scopedList.filter(p => p.category === 'Normal' && !p.is_in_er).length,
    // Total = ward patients + ER patients for this ward (both admitted locations)
    total: scopedList.filter(p => p.category !== 'Deceased/Archive').length,
  };


  if (loading) {
     return <div className="animate-pulse space-y-4">
       <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl w-48" />
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
         <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
         <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
       </div>
     </div>
  }

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Patient Overview {isOfflineMode && <span className="text-emerald-500 text-xs font-black uppercase tracking-widest ml-2 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-900/40">Local-First™</span>}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} patient{counts.total !== 1 ? 's' : ''} currently admitted
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportButton />
          <AddPatientModal />
        </div>
      </div>

      {/* Global Search Bar (All Wards) */}
      <div className="max-w-2xl mx-auto w-full">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block ml-1">
          System-Wide Patient Search
        </label>
        <GlobalSearch />
      </div>

      {/* AI Safety Monitor */}
      <UrgentInsights aiEnabled={profile?.ai_enabled ?? true} />

      {/* Role-based Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* ER Ward Card */}
        <Link href="/dashboard/er" prefetch={true}>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="h-32 w-32 text-rose-500" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                ER Ward
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                View and manage patients currently admitted to the emergency room based on your specialty.
              </p>
              <div className="mt-10 flex items-center font-semibold text-rose-600 dark:text-rose-400">
                Enter ER Ward
              </div>
            </div>
          </div>
        </Link>

        {/* Normal Ward Card */}
        <Link href={(!isAdmin && (profile?.accessible_wards?.length ?? 0) <= 1) ? '/dashboard/my-ward' : '/dashboard/select-ward'} prefetch={true}>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <LayoutDashboard className="h-32 w-32 text-emerald-500" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <LayoutDashboard className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Ward
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                {isAdmin 
                  ? "Access all patient information across all wards and departments."
                  : "Access your assigned ward, manage patients grouped by priority."}
              </p>
              <div className="mt-10 flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                View Ward
              </div>
            </div>
          </div>
        </Link>

        {/* Admin Manage Card - ONLY FOR ADMINS */}
        {isAdmin && (
          <Link href="/admin/manage" prefetch={true}>
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Settings className="h-32 w-32 text-indigo-500" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Settings className="h-8 w-8" />
                </div>
                
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Ward Management
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                  Configure system settings, monitor platform activity, and manage resources.
                </p>
                <div className="mt-10 flex items-center font-semibold text-indigo-600 dark:text-indigo-400">
                  Manage System
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
