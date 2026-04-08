"use client"

import { useState } from 'react'
import { Users, Activity, BarChart3, Settings, ShieldAlert, Shield, Calendar } from 'lucide-react'
import { UserManagement } from '@/components/admin/user-management'
import { DoctorPerformance } from '@/components/admin/doctor-performance'
import { MedicalStatistics } from '@/components/admin/medical-statistics'
import { WardSettings } from '@/components/admin/ward-settings'
import { ReminderArchive } from '@/components/admin/reminder-archive'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { Switch } from '@/components/ui/switch'
import { updateGlobalOfflineSettingAction } from '@/app/actions/admin-actions'
import { toast } from 'sonner'

export default function WardManagementClient({
  initialUsers,
  dbSizeMB,
  patientsData,
  wardSettingsData,
  hasServiceKey,
  aiEnabled,
  initialGlobalOffline
}: {
  initialUsers: any[]
  dbSizeMB: string
  patientsData: any[]
  wardSettingsData: any[]
  hasServiceKey: boolean
  aiEnabled: boolean
  initialGlobalOffline: boolean
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'performance' | 'research' | 'wards' | 'reminders' | 'settings'>('users')
  const [globalOffline, setGlobalOffline] = useState(initialGlobalOffline)

  return (
    <div className="space-y-8 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <NavigationButtons />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  Ward Management
                </h1>
              </div>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 ml-10 sm:ml-12">
                Control center, doctor performance, and research analytics.
              </p>
            </div>
          </div>

          {/* Storage Pill */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm shrink-0">
             <div className={`h-2.5 w-2.5 rounded-full ${dbSizeMB === 'Error' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
             <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
               {dbSizeMB === 'Error' ? 'Config Pending' : `${dbSizeMB} MB`}
             </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile, icon-only on xs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth w-full">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'users' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">User Control</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'performance' 
              ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Doctor Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'research' 
              ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Medical Research</span>
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'reminders' 
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Reminders</span>
        </button>
        <button
          onClick={() => setActiveTab('wards')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'wards' 
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Ward Setup</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'settings' 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Service Role Error Warning */}
      {!hasServiceKey && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Missing Service Role Key</h4>
            <p className="text-sm mt-1">
              User management is disabled. Please add <code className="bg-white px-1.5 py-0.5 rounded border border-red-100">SUPABASE_SERVICE_ROLE_KEY</code> to your <code className="bg-white px-1.5 py-0.5 rounded border border-red-100">.env.local</code>.
            </p>
          </div>
        </div>
      )}

      {/* Database RPC Error Warning */}
      {hasServiceKey && dbSizeMB === 'Error' && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-start gap-3 mb-4">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Database Functions Missing or Denied</h4>
            <p className="text-sm mt-1">
              The dashboard cannot read storage size. Make sure you ran the `0006_admin_functions.sql` script into your Supabase SQL Editor. If you did, make sure you run the updated version provided by the assistant to allow Service Key access.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'users' && (
          <UserManagement 
            users={initialUsers} 
            wardNames={wardSettingsData.map(s => s.ward_name).sort()} 
          />
        )}
        {activeTab === 'performance' && <DoctorPerformance users={initialUsers} patients={patientsData} />}

        {activeTab === 'research' && <MedicalStatistics patients={patientsData} aiEnabled={aiEnabled} />}
        {activeTab === 'reminders' && <ReminderArchive />}
        {activeTab === 'wards' && <WardSettings settings={wardSettingsData} users={initialUsers} />}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">OfflineSync™ Configuration</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Control institutional-wide offline accessibility.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 group transition-all hover:border-indigo-200 dark:hover:border-indigo-900/40">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Global Offline Support</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      When enabled, clinicians can opt-in to PowerSync Local-First mode. When disabled, the entire institution is forced to standard Online-Only Supabase REST access.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch 
                      checked={globalOffline} 
                      onCheckedChange={async (val: boolean) => {
                        setGlobalOffline(val)
                        const res = await updateGlobalOfflineSettingAction(val)
                        if (res.success) toast.success(`Global Offline Mode ${val ? 'Enabled' : 'Disabled'}`)
                        else toast.error("Failed to update global setting")
                      }} 
                    />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${globalOffline ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {globalOffline ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/40">
                  <div className="flex gap-4">
                    <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                       <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Performance & Data Integrity Notice</p>
                       <p className="text-xs text-indigo-700/80 dark:text-indigo-300/60 leading-relaxed">
                         Disabling this globally will immediately stop all background syncing. Clinicians with pending offline changes should finalize their sync before deactivation to ensure clinical data continuity.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

