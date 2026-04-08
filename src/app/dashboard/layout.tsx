import { ReactNode } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { WardHeader } from '@/components/dashboard/ward-header'
import { DoctorNameModal } from '@/components/dashboard/doctor-name-modal'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { Toaster } from '@/components/ui/sonner'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import { UserSettingsModal } from '@/components/dashboard/user-settings-modal'

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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900">
      {/* Accent line at very top */}
      <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

      {/* Top Navigation */}
      <header data-pwa-header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="flex h-14 sm:h-18 items-center justify-between px-3 sm:px-8 max-w-screen-2xl mx-auto w-full gap-2">
          
          {/* Left: Nav Controls + Logo + Ward Name */}
          <div className="flex items-center gap-1 sm:gap-2">
            <NavigationButtons />
            <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/20 shrink-0">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <WardHeader />
              </div>
            </Link>
          </div>

          {/* Right: Notifications + User Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationCenter />
            <UserSettingsModal />
          </div>
        </div>
      </header>

      {/* Doctor Name Modal — shows on first sign-in of a session */}
      <DoctorNameModal />

      {/* Main Content Area - Reduced bottom padding since Indicator is fixed bottom */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full pb-32">
        {children}
      </main>
      <OfflineIndicator />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
