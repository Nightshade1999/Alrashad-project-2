import Link from 'next/link'
import { Activity, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ErSelectionPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
          Emergency Room Selection
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Please select the Emergency Room you wish to view. Patients are routed based on their originating ward's gender configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Male ER */}
        <Link href="/dashboard/er/Male">
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Users className="h-32 w-32 text-blue-500" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Activity className="h-8 w-8" />
              </div>
              
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Male ER
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                View patients currently admitted to the Male Emergency Room.
              </p>
              
              <div className="mt-10 flex items-center font-semibold text-blue-600 dark:text-blue-400">
                Enter Male ER
                <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Female ER */}
        <Link href="/dashboard/er/Female">
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Users className="h-32 w-32 text-pink-500" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                <Activity className="h-8 w-8" />
              </div>
              
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Female ER
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow">
                View patients currently admitted to the Female Emergency Room.
              </p>

              <div className="mt-10 flex items-center font-semibold text-pink-600 dark:text-pink-400">
                Enter Female ER
                <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
