"use client"

import { usePathname } from 'next/navigation'
import { useDatabase } from '@/hooks/useDatabase'
import { isDoctor } from '@/types/database.types'

// Pages where the ward name subtitle should NOT appear
const HIDE_WARD_PATHS = ['/dashboard', '/dashboard/select-ward', '/dashboard/wards']

export function WardHeader() {
  const pathname = usePathname()
  const { profile, isReady } = useDatabase()

  if (!isReady) {
    return <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
  }

  const doctorName = profile?.doctor_name || "Doctor"
  const wardName = profile?.ward_name || ""
  const showWardName = wardName && !HIDE_WARD_PATHS.includes(pathname)

  const isDoc = isDoctor(profile);

  return (
    <div className="flex flex-col">
      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic"
        style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
      >
        {isDoc ? 'Dr. ' : ''}{doctorName}
      </h1>
      {showWardName && (
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 animate-in fade-in duration-300">
          {wardName}
        </span>
      )}
    </div>
  )
}
