"use client"

import { ReminderArchive } from "@/components/admin/reminder-archive"
import { NavigationButtons } from "@/components/layout/navigation-buttons"
import { Calendar } from "lucide-react"

export default function RemindersArchivePage() {
  return (
    <div className="space-y-8 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <NavigationButtons />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Reminders Archive
              </h1>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 ml-12 italic">
               Review patient-specific task history and clinical outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
         <ReminderArchive />
      </div>
    </div>
  )
}
