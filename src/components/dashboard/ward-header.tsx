"use client"

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, RefreshCw } from 'lucide-react'
import { syncProfileWardAction } from '@/app/actions/admin-actions'
import { createClient } from '@/lib/supabase'
import { UserProfile } from '@/types/database.types'

const DEFAULT_WARD_NAME = "Internal Medicine - Psych Ward"

export function WardHeader() {
  const [wardName, setWardName] = useState(DEFAULT_WARD_NAME)
  const [doctorName, setDoctorName] = useState("")
  const [accessibleWards, setAccessibleWards] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

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
          .select('ward_name, accessible_wards, doctor_name')
          .eq('user_id', user.id)
          .single()

        const profileData = data as UserProfile | null
        if (profileData?.ward_name) setWardName(profileData.ward_name)
        if (profileData?.accessible_wards) setAccessibleWards(profileData.accessible_wards)
        if (profileData?.doctor_name) {
          setDoctorName(profileData.doctor_name)
        } else {
          const emailName = user.email?.split('@')[0] || 'Doctor'
          setDoctorName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
        }
      } catch { }
    }
    loadProfile()

    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWardSwitch = async (newWard: string) => {
    if (newWard === wardName) {
      setShowSwitcher(false)
      return
    }
    setIsSyncing(true)
    const res = await syncProfileWardAction(newWard)
    if (res?.error) alert(res.error)
    else window.location.reload()
  }


  if (!mounted) {
    return <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 uppercase">
          Dr. {doctorName}
        </h1>
      </div>

      {/* Ward Switcher / Display */}
      <div className="relative mt-0.5" ref={switcherRef}>
        <div 
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-transparent transition-all ${
            accessibleWards.length > 1 
              ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/50' 
              : 'bg-transparent'
          }`}
          onClick={accessibleWards.length > 1 ? () => setShowSwitcher(!showSwitcher) : undefined}
        >
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
            {wardName}
          </span>
          {accessibleWards.length > 1 && (
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${showSwitcher ? 'rotate-180' : ''}`} />
          )}
        </div>

      {/* Switcher Dropdown */}
      {showSwitcher && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 p-2 border-b border-slate-100 dark:border-slate-800 mb-2">Switch Active Ward</p>
          <div className="space-y-1">
            {accessibleWards.map((w: string) => (
              <button
                key={w}
                disabled={isSyncing}
                onClick={() => handleWardSwitch(w)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                  w === wardName 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {w}
                {w === wardName && <Check className="h-4 w-4" />}
                {isSyncing && w !== wardName && <RefreshCw className="h-3 w-3 animate-spin opacity-0" />}
              </button>
            ))}
          </div>
          {isSyncing && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
              <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
