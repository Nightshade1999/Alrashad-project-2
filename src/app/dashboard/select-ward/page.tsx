"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, CheckCircle2, ChevronRight, Stethoscope, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { syncProfileWardAction } from '@/app/actions/admin-actions'

export default function SelectWardPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [accessibleWards, setAccessibleWards] = useState<string[]>([])
  const [isSyncing, setIsSyncing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: activeProfile } = await supabase
          .from('user_profiles')
          .select('ward_name, accessible_wards, role')
          .eq('user_id', user.id)
          .single() as any

        const isAdmin = activeProfile?.role === 'admin'
        let wards = activeProfile?.accessible_wards || (activeProfile?.ward_name ? [activeProfile.ward_name] : [])

        if (isAdmin) {
          const { data: allWards } = await supabase.from('ward_settings').select('ward_name')
          if (allWards) wards = (allWards as any[]).map(w => w.ward_name)
        }

        setProfile(activeProfile)
        setAccessibleWards(wards)

        // Auto-select logic: single ward users skip selection entirely
        if (wards.length === 1) {
          const activeWard = wards[0]
          if (activeProfile?.ward_name !== activeWard) {
            await syncProfileWardAction(activeWard)
          }
          router.replace('/dashboard/my-ward');
          return;
        }

      } catch (err) {
        console.error("Select Ward Load Error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleSelectWard(wardName: string) {
    setIsSyncing(wardName)
    try {
      await syncProfileWardAction(wardName)
      router.push('/dashboard/my-ward')
    } catch (err) {
      console.error("Ward sync error:", err)
    } finally {
      setIsSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
        <p className="text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Initializing Workstations...</p>
      </div>
    )
  }

  if (accessibleWards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-md mx-auto">
        <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Stethoscope className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">No Ward Assigned</h1>
        <p className="mt-4 text-slate-500 leading-relaxed font-medium">
          Your account is not currently assigned to any clinical wards. Please contact your system administrator to gain access.
        </p>
        <Link 
          href="/dashboard" 
          className={cn(buttonVariants({ variant: "ghost" }), "mt-8 text-slate-400")}
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-tighter">
          Choose Your <span className="text-teal-600 dark:text-teal-400">Workstation</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-medium">
          Select the active clinical ward you wish to manage for this session. You can switch workstations at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Master Ward for Admins */}
        {profile?.role === 'admin' && (
          <div key="Master Ward">
            <button
              disabled={!!isSyncing}
              onClick={() => handleSelectWard('Master Ward')}
              className={`group relative w-full text-left p-8 rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 active:scale-95 flex flex-col items-start ${
                profile?.ward_name === 'Master Ward' 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
              } ${isSyncing && isSyncing !== 'Master Ward' ? 'opacity-50 grayscale' : ''}`}
            >
              {profile?.ward_name === 'Master Ward' && !isSyncing && (
                <div className="absolute top-6 right-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Currently Active
                </div>
              )}

              {isSyncing === 'Master Ward' && (
                <div className="absolute top-6 right-8">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                </div>
              )}

              <div className={`mb-6 h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                profile?.ward_name === 'Master' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-indigo-600/30'
              }`}>
                <LayoutDashboard className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Master Ward
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  {isSyncing === 'Master Ward' ? 'Syncing...' : 'System-Wide Patients'}
                  <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isSyncing === 'Master Ward' ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                </p>
              </div>
            </button>
          </div>
        )}

        {accessibleWards.map((wardName: string) => {
          const isActive = profile?.ward_name === wardName
          const loadingThis = isSyncing === wardName
          
          return (
            <div key={wardName}>
              <button
                disabled={!!isSyncing}
                onClick={() => handleSelectWard(wardName)}
                className={`group relative w-full text-left p-8 rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 active:scale-95 flex flex-col items-start ${
                  isActive 
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-700'
                } ${isSyncing && !loadingThis ? 'opacity-50 grayscale' : ''}`}
              >
                {/* Active Indicator Pin */}
                {isActive && !loadingThis && (
                  <div className="absolute top-6 right-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-600/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Currently Active
                  </div>
                )}

                {loadingThis && (
                  <div className="absolute top-6 right-8">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  </div>
                )}

                <div className={`mb-6 h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                  isActive ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-teal-600/30'
                }`}>
                  <LayoutDashboard className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate w-full">
                    {wardName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    {loadingThis ? 'Syncing...' : 'Manage Patients'}
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isActive || loadingThis ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </p>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer Meta */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Alrashad Medical & Research Hub | Global Healthcare Platform
        </p>
      </div>
    </div>
  )
}
