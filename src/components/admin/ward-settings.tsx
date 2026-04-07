"use client"

import { useState } from 'react'
import { Shield, Save, Trash2, RefreshCw, Search, Wrench } from 'lucide-react'
import { upsertWardSettingAction, deleteWardSettingAction, syncWardSettingsAction, repairWardDiscrepanciesAction } from '@/app/actions/admin-actions'

export function WardSettings({ settings, users }: { settings: any[], users: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  
  // Extract unique ward names from users and current settings
  const uniqueWards = Array.from(new Set([
    ...users.map(u => u.ward_name).filter(Boolean),
    ...settings.map(s => s.ward_name).filter(Boolean)
  ])).sort()

  const filteredWards = uniqueWards.filter(w => 
    w.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const handleDelete = async (wardName: string) => {
    if (!confirm(`Are you sure you want to remove the specific configuration for '${wardName}'? This ward will revert to 'No Restriction'.`)) return
    
    setIsSaving(true)
    const res = await deleteWardSettingAction(wardName)
    setIsSaving(false)
    
    if (res?.error) {
      alert("Failed to delete: " + res.error)
    } else {
      setWardGenders(prev => {
        const next = { ...prev }
        delete next[wardName]
        return next
      })
      alert(`Configuration for '${wardName}' removed.`)
    }
  }

  const handleSync = async () => {
    if (!confirm("This will permanently delete configurations for any ward that is not assigned to an active doctor. Proceed?")) return
    
    setIsSyncing(true)
    const res = await syncWardSettingsAction()
    setIsSyncing(false)
    
    if (res?.error) {
      alert("Sync failed: " + res.error)
    } else {
      alert("Ward configurations successfully synchronized with user accounts.")
      window.location.reload()
    }
  }

  const handleRepair = async () => {
    if (!confirm("This will scan ALL patients and ensure they are assigned to their doctor's CURRENT ward. Use this to recover 'lost' data from previous ward changes. Proceed?")) return
    
    setIsRepairing(true)
    const res = await repairWardDiscrepanciesAction()
    setIsRepairing(false)
    
    if (res?.error) {
      alert("Repair failed: " + res.error)
    } else {
      alert(`Success! Reconciled ${res.count} patients to their doctor's current wards.`)
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" /> Ward Configurations
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search wards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-48 shadow-sm"
            />
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync & Cleanup
          </button>
          <button 
            onClick={handleRepair}
            disabled={isRepairing}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold transition disabled:opacity-50"
            title="Repair patient ward mismatches"
          >
            <Wrench className={`h-4 w-4 ${isRepairing ? 'animate-spin' : ''}`} />
            Repair Data
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-6">
         <p className="text-sm text-slate-500 mb-6 font-medium">Configure gender settings for active Wards. Wards mapped as Male or Female will restrict ER visibility automatically to Internal Medicine doctors matching that gender.</p>
         
         <div className="grid gap-4 max-w-xl">
           {filteredWards.map(wardName => (
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
                 <button 
                   onClick={() => handleDelete(wardName)} 
                   disabled={isSaving}
                   className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors disabled:opacity-50"
                   title="Delete Configuration"
                 >
                   <Trash2 className="h-5 w-5" />
                 </button>
               </div>
             </div>
           ))}
           {filteredWards.length === 0 && (
             <div className="p-8 text-center text-slate-500 border border-dashed rounded-xl italic">
               {searchTerm ? "No wards match your search." : "No wards dynamically detected. Create doctors and assign them to wards first."}
             </div>
           )}
         </div>
      </div>
    </div>
  )
}
