"use client"

import { useState } from 'react'
import { exportSystemDataAction, restoreSystemDataAction, upsertWardSettingAction, deleteWardSettingAction, findUnusedWardsAction, bulkDeleteWardsAction } from '@/app/actions/admin-actions'
import { Shield, Save, Trash2, RefreshCw, Search, Download, Plus, Loader2, Activity, X, Upload, Database, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function WardSettings({ settings, users }: { settings: any[], users: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [showCleanupReview, setShowCleanupReview] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreData, setRestoreData] = useState<any>(null)
  const [restoreResults, setRestoreResults] = useState<any>(null)
  const [unusedWards, setUnusedWards] = useState<string[]>([])
  const [newWardInput, setNewWardInput] = useState('')
  
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

  const handleSyncDetection = async () => {
    setIsSyncing(true)
    const res = await findUnusedWardsAction()
    setIsSyncing(false)
    
    if (res?.error) {
      alert("Search failed: " + res.error)
    } else if (res.unused && res.unused.length > 0) {
      setUnusedWards(res.unused)
      setShowCleanupReview(true)
    } else {
      alert("No unused wards detected. All configurations are currently mapped to active clinical staff.")
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete these ${unusedWards.length} wards?`)) return
    
    setIsSyncing(true)
    const res = await bulkDeleteWardsAction(unusedWards)
    setIsSyncing(false)
    
    if (res?.error) {
      alert("Cleanup failed: " + res.error)
    } else {
      setShowCleanupReview(false)
      setUnusedWards([])
      alert("Successfully removed unused clinical ward configurations.")
      window.location.reload()
    }
  }


  const handleBackup = async () => {
    if (!confirm("This will export all clinical records into a single JSON file for secure offline storage. Proceed?")) return
    
    setIsSyncing(true)
    const res = await exportSystemDataAction()
    setIsSyncing(false)
    
    if (res?.error) {
      toast.error("Backup failed: " + res.error)
      return
    }

    if (res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AlRashad_Backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("System backup downloaded successfully.")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (!json.patients || !json.ward_settings) {
          throw new Error("Invalid backup format: Missing required clinical tables.")
        }
        setRestoreData(json)
        setShowRestoreModal(true)
      } catch (err: any) {
        toast.error("Invalid File: " + err.message)
      }
    }
    reader.readAsText(file)
    // Clear input
    e.target.value = ''
  }

  const handlePerformRestore = async (strategy: 'skip' | 'overwrite') => {
    if (!restoreData) return
    
    const confirmMsg = strategy === 'overwrite' 
      ? "WARNING: You have selected OVERWRITE mode. Existing clinical data with matching IDs/MRNs will be replaced. Proceed?"
      : "Selected SKIP mode. Only new records will be added. Proceed?"
      
    if (!confirm(confirmMsg)) return

    setIsRestoring(true)
    const res = await restoreSystemDataAction(restoreData, strategy === 'overwrite' ? 'overwrite' : 'skip')
    setIsRestoring(false)

    if (res.error) {
      toast.error("Restoration failed: " + res.error)
    } else {
      setRestoreResults(res.results)
      toast.success("System restoration complete.")
    }
  }

  const handleCreateNewWard = async () => {
    const val = newWardInput.trim()
    if (!val) return
    setIsSaving(true)
    const res = await upsertWardSettingAction(val, null)
    setIsSaving(false)
    if (res?.error) alert(res.error)
    else {
       setNewWardInput('')
       // The parent will re-fetch or we reload
       window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      {/* RENDER DEBUG CHECK - If you see this, the component is definitely rendering */}
      <div className="bg-emerald-600/10 border border-emerald-200 p-2 rounded-lg text-center">
         <p className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em]">Institutional Configuration Engine v13.0 Active</p>
      </div>

      {showCleanupReview && (
        <div className="bg-rose-600 p-10 rounded-[3rem] shadow-2xl shadow-rose-500/30 text-white animate-in slide-in-from-top duration-500 relative overflow-hidden z-[60]">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-32 -mt-32" />
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-3xl font-black tracking-tight">Review Unused Wards</h3>
                    <p className="text-rose-100/80 font-medium">The following wards have zero active clinical staff assigned. You may safely prune them or cancel.</p>
                 </div>
                 <button onClick={() => setShowCleanupReview(false)} className="p-3 hover:bg-white/10 rounded-full transition">
                    <X className="h-6 w-6" />
                 </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                 {unusedWards.map(name => (
                   <div key={name} className="px-5 py-3 bg-white/10 border border-white/20 rounded-2xl font-bold flex items-center justify-between">
                      <span className="truncate">{name}</span>
                   </div>
                 ))}
              </div>

              <div className="flex gap-4">
                 <button 
                   onClick={handleBulkDelete}
                   disabled={isSyncing}
                   className="px-8 py-4 bg-white text-rose-600 hover:bg-rose-50 rounded-2xl text-lg font-black transition-all active:scale-95 shadow-xl shadow-black/20"
                 >
                   {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : "Delete Wards"}
                 </button>
                 <button 
                   onClick={() => setShowCleanupReview(false)}
                   className="px-8 py-4 bg-rose-700/50 hover:bg-rose-700 text-white rounded-2xl text-lg font-black transition-all"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            {restoreResults ? (
              <div className="p-10 space-y-6">
                <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                  <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Restoration Complete</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-left">
                        <th className="pb-2">Table</th>
                        <th className="pb-2 text-right text-emerald-600">Added</th>
                        <th className="pb-2 text-right text-amber-600">Skipped</th>
                        <th className="pb-2 text-right text-rose-600">Failed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(restoreResults).map(([table, counts]: [string, any]) => (
                        <tr key={table} className="text-slate-600 dark:text-slate-300">
                          <td className="py-2 font-bold capitalize">{table.replace('_', ' ')}</td>
                          <td className="py-2 text-right">{counts.success}</td>
                          <td className="py-2 text-right">{counts.skipped}</td>
                          <td className="py-2 text-right">{counts.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={() => {
                    setShowRestoreModal(false)
                    setRestoreResults(null)
                    window.location.reload()
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all"
                >
                  Done & Refresh System
                </button>
              </div>
            ) : (
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <Database className="h-6 w-6" />
                       </div>
                       <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">System Restoration</h3>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Configure how the backup should be integrated.</p>
                  </div>
                  <button onClick={() => setShowRestoreModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => handlePerformRestore('skip')}
                    disabled={isRestoring}
                    className="group flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-[2rem] transition-all text-left disabled:opacity-50"
                  >
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Additive Restore</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Only imports new clinical records. Existing entries (matched by MRN or ID) are skipped to prevent overwriting current data.</p>
                  </button>

                  <button 
                    onClick={() => handlePerformRestore('overwrite')}
                    disabled={isRestoring}
                    className="group flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500 rounded-[2rem] transition-all text-left disabled:opacity-50"
                  >
                    <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                      <RefreshCw className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Full Snapshot Restore</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium"><span className="text-rose-500 font-black">WARNING:</span> Overwrites existing records with the state from the backup file. Use to revert the system to a previous state.</p>
                  </button>
                </div>

                <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-3xl flex gap-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    This process may take several minutes depending on the database size. Do not close this browser window or refresh the page while restoration is in progress.
                  </p>
                </div>

                {isRestoring && (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                    <p className="text-sm font-black text-indigo-600 animate-pulse tracking-widest uppercase">Initializing Clinical Reconstruction</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Manual Add Ward - High Visibility */}
      <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-500/20 text-white flex flex-wrap items-center gap-6 mb-8">
          <div className="flex-1 min-w-[250px]">
             <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Plus className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-black tracking-tight">Register New Clinical Ward</h3>
             </div>
             <p className="text-indigo-100/80 text-sm font-medium">Add a physical location (e.g. ICU, ER, Ward 5) to the institutional dropdown.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input 
              type="text"
              placeholder="Enter ward name..."
              value={newWardInput}
              onChange={(e) => setNewWardInput(e.target.value)}
              className="flex-1 sm:w-64 px-5 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold"
            />
            <button 
              onClick={handleCreateNewWard}
              disabled={!newWardInput.trim() || isSaving}
              className="px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-black/10"
            >
              Add Ward
            </button>
          </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" /> Administrative Controls
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-48 shadow-sm"
            />
          </div>
          <button 
            onClick={handleSyncDetection}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition disabled:opacity-50"
            title="Cleanup: Detection scan for clinical areas that no longer have assigned doctors."
          >
            <Activity className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Scan for Inactive Wards
          </button>
          <button 
            onClick={handleBackup}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
            title="Database Export: Safely downloads all clinical records as a JSON snapshot."
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Backup
          </button>
          <div className="relative">
            <input 
              type="file"
              id="restore-upload"
              className="hidden"
              accept=".json"
              onChange={handleFileSelect}
            />
            <button 
              onClick={() => document.getElementById('restore-upload')?.click()}
              disabled={isRestoring}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
              title="System Restore: Upload a previously exported JSON backup."
            >
              {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Restore
            </button>
          </div>
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
