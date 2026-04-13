"use client"

import { useState, useEffect } from "react"
import { getRoleDisplayName } from "@/types/database.types"

// Map roles to their respective localStorage keys for identity persistence
const ROLE_STORAGE_KEYS = {
  admin: 'wardManager_lastDoctorName',
  doctor: 'wardManager_lastDoctorName',
  nurse: 'nurse_lastNurseName',
  lab_tech: 'labTech_lastTechName',
  pharmacist: 'pharmacist_lastPharmacistName'
} as const;

export function ActiveUserBadge({ role = 'doctor' }: { role?: keyof typeof ROLE_STORAGE_KEYS }) {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const key = ROLE_STORAGE_KEYS[role] || ROLE_STORAGE_KEYS.doctor
    const saved = localStorage.getItem(key)
    setName(saved)

    // Listen for storage changes in case of session updates
    const handleUpdate = () => {
      setName(localStorage.getItem(key))
    }
    
    window.addEventListener('storage', handleUpdate)
    // Listen to all identity update events
    window.addEventListener('lab_tech_identity_updated', handleUpdate)
    window.addEventListener('nurse_identity_updated', handleUpdate)
    window.addEventListener('pharmacist_identity_updated', handleUpdate)
    window.addEventListener('doctor_identity_updated', handleUpdate)
    
    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('lab_tech_identity_updated', handleUpdate)
      window.removeEventListener('nurse_identity_updated', handleUpdate)
      window.removeEventListener('pharmacist_identity_updated', handleUpdate)
      window.removeEventListener('doctor_identity_updated', handleUpdate)
    }
  }, [role])

  if (!name) return null

  const displayRole = getRoleDisplayName(role)

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-2">
      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
        {displayRole}: {name}
      </span>
    </div>
  )
}
