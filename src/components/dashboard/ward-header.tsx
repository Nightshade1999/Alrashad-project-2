"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserProfile } from '@/types/database.types'

// Pages where the ward name subtitle should NOT appear
const HIDE_WARD_PATHS = ['/dashboard', '/dashboard/select-ward', '/dashboard/wards']

export function WardHeader() {
  const [wardName, setWardName] = useState("")
  const [doctorName, setDoctorName] = useState("")
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  const showWardName = wardName && !HIDE_WARD_PATHS.includes(pathname)

  // Load profile from Supabase on mount
  useEffect(() => {
    setMounted(true)
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('user_profiles')
          .select('ward_name, doctor_name')
          .eq('user_id', user.id)
          .single()

        const profileData = data as any as UserProfile | null
        if (profileData?.ward_name) setWardName(profileData.ward_name)
        if (profileData?.doctor_name) {
          setDoctorName(profileData.doctor_name)
        } else {
          const emailName = user.email?.split('@')[0] || 'Doctor'
          setDoctorName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
        }
      } catch { }
    }
    loadProfile()
  }, [])

  if (!mounted) {
    return <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic"
        style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
      >
        Dr. {doctorName}
      </h1>
      {showWardName && (
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 animate-in fade-in duration-300">
          {wardName}
        </span>
      )}
    </div>
  )
}
