"use client"

import Link from 'next/link'
import { Activity, Users, ShieldAlert, ArrowLeft } from 'lucide-react'
import { useDatabase } from '@/hooks/useDatabase'
import { Button } from '@/components/ui/button'

export default function ErSelectionPage() {
  const { profile, isReady } = useDatabase()

  if (!isReady) return null

  const isAdmin = profile?.role === 'admin'
  const isDoctor = profile?.role === 'doctor'
  const hasAccess = isAdmin || isDoctor

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-20 w-20 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-rose-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Security Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-medium">
          The Emergency Room module is restricted to medical doctors and senior administrators. Please return to the main dashboard.
        </p>
        <Link href="/dashboard">
          <Button className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white font-black uppercase tracking-widest transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8 px-4 sm:px-0 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
          Emergency Room Selection
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Please select the Emergency Room you wish to view. Patients are routed based on their originating ward's gender configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Male ER */}
        <Link href="/dashboard/er/Male" prefetch={true}>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 text-blue-500">
              <Users className="h-32 w-32" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Activity className="h-8 w-8" />
              </div>
              
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Male ER
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow font-medium">
                View patients currently admitted to the Male Emergency Room.
              </p>
              
              <div className="mt-10 flex items-center font-bold text-blue-600 dark:text-blue-400">
                Enter Male ER
                <svg className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Female ER */}
        <Link href="/dashboard/er/Female" prefetch={true}>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 text-pink-500">
              <Users className="h-32 w-32" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                <Activity className="h-8 w-8" />
              </div>
              
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Female ER
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed flex-grow font-medium">
                View patients currently admitted to the Female Emergency Room.
              </p>

              <div className="mt-10 flex items-center font-bold text-pink-600 dark:text-pink-400">
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

