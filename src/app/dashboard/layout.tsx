import { ReactNode } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { LogOut, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { WardHeader } from '@/components/dashboard/ward-header'
import { DoctorNameModal } from '@/components/dashboard/doctor-name-modal'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Try to get real doctor name from user_profiles
  let displayName = 'Doctor'
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('doctor_name')
      .eq('user_id', user?.id ?? '')
      .single()
    if (profile?.doctor_name) {
      displayName = profile.doctor_name
    } else {
      // Fallback to email-based name
      const emailName = user?.email?.split('@')[0] || 'Doctor'
      displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
    }
  } catch {
    const emailName = user?.email?.split('@')[0] || 'Doctor'
    displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900">
      {/* Accent line at very top */}
      <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-8 max-w-screen-2xl mx-auto w-full">
          
          {/* Left: Logo + Ward Name */}
          <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/20 shrink-0">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <WardHeader />
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  Dr. {displayName}
                </span>
              </div>
            </div>
          </Link>

          {/* Right: Status + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <OfflineIndicator />
            <form action="/auth/signout" method="post">
              <Button variant="ghost" type="submit" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 px-3">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Doctor Name Modal — shows on first sign-in if name not set */}
      <DoctorNameModal />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
