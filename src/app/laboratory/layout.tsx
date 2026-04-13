import { ReactNode } from 'react'
import { Microscope } from 'lucide-react'
import { LabTechNameModal } from '@/components/laboratory/LabTechNameModal'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { Toaster } from '@/components/ui/sonner'
import { ActiveUserBadge } from '@/components/layout/ActiveUserBadge'
import { UserSettingsModal } from '@/components/dashboard/user-settings-modal'

export default async function LaboratoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900">
      {/* Accent line at very top */}
      <div className="h-1.5 w-full bg-linear-to-r from-teal-500 via-emerald-400 to-indigo-500" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm pt-safe">
        <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-8 max-w-screen-2xl mx-auto w-full gap-4">
          
          <div className="flex items-center gap-3">
            <NavigationButtons />
            <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 shadow-md shadow-teal-500/20">
                <Microscope className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Alrashad Laboratory</h2>
                <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">Investigation Module</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ActiveUserBadge role="lab_tech" />
            <UserSettingsModal />
          </div>
        </div>
      </header>

      {/* Lab Tech Identity Modal */}
      <LabTechNameModal />

      <main className="flex-1 overflow-auto max-w-screen-2xl mx-auto w-full pb-safe mb-20 md:mb-0">
        {children}
      </main>
    </div>
  )
}
