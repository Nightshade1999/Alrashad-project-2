"use client"

import { useState } from 'react'
import { Shield, Save } from 'lucide-react'
import { upsertWardSettingAction } from '@/app/actions/admin-actions'

export function WardSettings({ settings, users }: { settings: any[], users: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  
  // Extract unique ward names from users and current settings
  const uniqueWards = Array.from(new Set([
    ...users.map(u => u.ward_name).filter(Boolean),
    ...settings.map(s => s.ward_name).filter(Boolean)
  ])).sort()

  const [wardGenders, setWardGenders] = useState<Record<string, string>>(
    settings.reduce((acc, s) => {
      acc[s.ward_name] = s.gender || ''
      return acc
    }, {} as Record<string, string>)
  )

  const handleGenderChange = (wardName: string, gender: string) => {
    setWardGenders(prev => ({ ...prev, [wardName]: gender }))
  }

  const handleSave = async (wardName: string) => {
    setIsSaving(true)
    const res = await upsertWardSettingAction(wardName, (wardGenders[wardName] as any) || null)
    setIsSaving(false)
    if (res?.error) {
      alert("Failed to save: " + res.error)
    } else {
      alert(`Ward '${wardName}' successfully configured.`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" /> Ward Configurations
        </h2>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-6">
         <p className="text-sm text-slate-500 mb-6 font-medium">Configure gender settings for active Wards. Wards mapped as Male or Female will restrict ER visibility automatically to Internal Medicine doctors matching that gender.</p>
         
         <div className="grid gap-4 max-w-xl">
           {uniqueWards.map(wardName => (
             <div key={wardName} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
               <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{wardName}</h4>
                  <p className="text-xs text-slate-500">ER Gender Restriction</p>
               </div>
               <div className="flex items-center gap-3">
                 <select 
                   value={wardGenders[wardName] || ''} 
                   onChange={(e) => handleGenderChange(wardName, e.target.value)}
                   className="text-sm border rounded-lg p-2 dark:bg-slate-900 dark:border-slate-700 font-semibold"
                 >
                   <option value="">No Restriction (Default)</option>
                   <option value="Male">Male Ward</option>
                   <option value="Female">Female Ward</option>
                 </select>
                 <button 
                   onClick={() => handleSave(wardName)} 
                   disabled={isSaving}
                   className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                   title="Save Configuration"
                 >
                   <Save className="h-5 w-5 text-indigo-600" />
                 </button>
               </div>
             </div>
           ))}
           {uniqueWards.length === 0 && (
             <div className="p-4 text-center text-slate-500">No wards dynamically detected. Create doctors and assign them to wards first.</div>
           )}
         </div>
      </div>
    </div>
  )
}
