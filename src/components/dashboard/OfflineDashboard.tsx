"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'

const AddPatientModal = dynamic(() => import('@/components/dashboard/add-patient-modal').then(mod => mod.AddPatientModal), {
  loading: () => <Skeleton className="h-14 w-32 rounded-xl" />
})

const ExportButton = dynamic(() => import('@/components/dashboard/export-button').then(mod => mod.ExportButton), {
  loading: () => <Skeleton className="h-14 w-32 rounded-xl" />
})

const GlobalSearch = dynamic(() => import('@/components/dashboard/global-search').then(mod => mod.GlobalSearch), {
  loading: () => <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
})

const UrgentInsights = dynamic(() => import('@/components/dashboard/urgent-insights').then(mod => mod.UrgentInsights), {
  loading: () => <Skeleton className="h-48 w-full rounded-2xl" />
})

import { AlertCircle, LayoutDashboard, Settings } from 'lucide-react'
import type { Patient } from '@/types/database.types'

export function OfflineDashboard() {
  const { patients, profile, isReady } = useDatabase();
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Dashboard: Loading timeout reached, showing partial view.");
        setLoading(false);
      }
    }, 6000); // 6s timeout for mobile consistency

    (async () => {
      try {
        setLoading(true);
        const list = await patients.list();
        if (isMounted) setPatientList(list);
      } catch (err: any) {
        console.error("Dashboard: fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    })();

    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [patients]);

  const myWardName = profile?.ward_name ?? null;
  const router = useRouter();

  useEffect(() => {
    // Rely solely on the DatabaseProvider profile for authoritative role detection
    if (typeof window !== 'undefined' && profile?.user_id) {
      const role = profile.role?.toLowerCase();
      if (role === 'lab_tech') router.push('/laboratory');
      else if (role === 'pharmacist') router.push('/pharmacy');
      else if (role === 'nurse') router.push('/dashboard/select-ward');
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile?.user_id) {
      console.log('[Clinical Admin Diagnostic]', {
        userId: profile.user_id,
        currentRole: profile.role,
        isSystemAdmin: profile?.role?.toLowerCase() === 'admin'
      });
    }
  }, [profile]);

  const isAdmin = profile?.role?.trim().toLowerCase() === 'admin';
  const isMaster = myWardName === 'Master Ward' || (isAdmin && (!myWardName || myWardName === 'Unassigned'));
  
  // Case-Insensitive Filter
  const filteredList = (myWardName && !isMaster)
    ? patientList.filter(p => p.ward_name?.toLowerCase() === myWardName.toLowerCase())
    : patientList;

  // Smart Fallback: If filtering returns nothing but there IS data available, show all (prevents blackout).
  const scopedList = (filteredList.length === 0 && patientList.length > 0)
    ? patientList
    : filteredList;

  const counts = {
    'High Risk': scopedList.filter(p => p.category === 'High Risk' && !p.is_in_er).length,
    'Close Follow-up': scopedList.filter(p => p.category === 'Close Follow-up' && !p.is_in_er).length,
    'Normal': scopedList.filter(p => p.category === 'Normal' && !p.is_in_er).length,
    // Total = ward patients + ER patients for this ward (both admitted locations)
    total: scopedList.filter(p => p.category !== 'Deceased/Archive').length,
  };


  if (loading || !isReady) {
     return (
       <div className="space-y-10 animate-pulse">
         <div className="flex justify-between items-end">
           <div className="space-y-4">
             <Skeleton className="h-10 w-64" />
             <Skeleton className="h-4 w-40" />
           </div>
           <div className="flex gap-2">
             <Skeleton className="h-14 w-28 rounded-xl" />
             <Skeleton className="h-14 w-28 rounded-xl" />
           </div>
         </div>
         <Skeleton className="h-12 w-full max-w-2xl mx-auto rounded-2xl" />
         <Skeleton className="h-48 w-full rounded-3xl" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Skeleton className="h-80 rounded-[2.5rem]" />
           <Skeleton className="h-80 rounded-[2.5rem]" />
           <Skeleton className="h-80 rounded-[2.5rem]" />
         </div>
       </div>
     )
  }
  
  // Strict Role Guard: Return null (blocking Doctor UI) for specialty roles while redirection triggers.
  const currentRole = profile?.role?.toLowerCase();
  const isSpecialtyRole = currentRole === 'nurse' || currentRole === 'lab_tech' || currentRole === 'pharmacist';
  if (isSpecialtyRole) return null;

  return (
    <div className="space-y-8 pb-20">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Patient Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} patient{counts.total !== 1 ? 's' : ''} currently admitted
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-indigo-200/50">
                <Settings className="h-2 w-2" /> Admin Verified
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportButton isAdmin={isAdmin} />
          <AddPatientModal role={currentRole} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto stagger-fade-in">
        {/* ER Ward Card - RESTRICTED TO DOCTOR/ADMIN */}
        {(isAdmin || profile?.role === 'doctor') && (
          <Link href="/dashboard/er" prefetch={true} className="block">
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full glass-card">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
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
        )}

        {/* Normal Ward Card */}
        <Link href={(!isAdmin && profile?.specialty !== 'psychiatry' && (profile?.accessible_wards?.length ?? 0) <= 1) ? '/dashboard/my-ward' : '/dashboard/select-ward'} prefetch={true} className="block">
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full glass-card">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
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
          <Link href="/admin/manage" prefetch={true} className="block">
            <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full glass-card">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
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
