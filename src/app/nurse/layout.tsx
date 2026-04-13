import { ReactNode } from 'react'
import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { WardHeader } from '@/components/dashboard/ward-header'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { UserSettingsModal } from '@/components/dashboard/user-settings-modal'
import { ActiveUserBadge } from '@/components/layout/ActiveUserBadge'

export default async function NurseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900">
      {/* Accent line at very top */}
      <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

      {/* Top Navigation */}
      <header data-pwa-header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm pt-safe">
        <div className="flex h-14 sm:h-18 items-center justify-between px-3 sm:px-8 max-w-screen-2xl mx-auto w-full gap-2">
          
          {/* Left: Nav Controls + Logo + Ward Name */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
            <NavigationButtons />
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer min-w-0">
              <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/20 shrink-0">
                <Stethoscope className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <WardHeader />
              </div>
            </Link>
          </div>

          {/* Right: User Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ActiveUserBadge role="nurse" />
            <UserSettingsModal />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto max-w-screen-2xl mx-auto w-full pb-safe mb-32">
        {children}
      </main>
    </div>
  )
}
