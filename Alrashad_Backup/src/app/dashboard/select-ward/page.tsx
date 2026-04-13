import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, CheckCircle2, ChevronRight, Stethoscope } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { syncProfileWardAction } from '@/app/actions/admin-actions'

export const dynamic = 'force-dynamic'

export default async function SelectWardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ward_name, accessible_wards, role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  let accessibleWards = profile?.accessible_wards || (profile?.ward_name ? [profile.ward_name] : [])

  // If Admin: show ALL wards from settings
  if (isAdmin) {
    const { data: allWards } = await supabase.from('ward_settings').select('ward_name')
    if (allWards && allWards.length > 0) {
      accessibleWards = allWards.map(w => w.ward_name)
    }
  }

  // SKIP LOGIC: If exactly 1 ward, auto-select it and go to my-ward
  if (accessibleWards.length === 1) {
    // If it's already the active ward, just redirect
    if (profile?.ward_name === accessibleWards[0]) {
      redirect('/dashboard/my-ward')
    }
    // Otherwise, sync and redirect
    await syncProfileWardAction(accessibleWards[0])
    redirect('/dashboard/my-ward')
  }

  // If no wards at all (Error state or new user)
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
        {accessibleWards.map((wardName: string) => {
          const isActive = profile?.ward_name === wardName
          
          return (
            <form key={wardName} action={async () => {
              'use server'
              await syncProfileWardAction(wardName)
              redirect('/dashboard/my-ward')
            }}>
              <button
                type="submit"
                className={`group relative w-full text-left p-8 rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 active:scale-95 flex flex-col items-start ${
                  isActive 
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-700'
                }`}
              >
                {/* Active Indicator Pin */}
                {isActive && (
                  <div className="absolute top-6 right-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-600/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Currently Active
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
                    Manage Patients 
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </p>
                </div>
              </button>
            </form>
          )
        })}
      </div>

      {/* Footer Meta */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Alrashad Medical & Research Hub | Healthcare Local-First Platform
        </p>
      </div>
    </div>
  )
}
