"use client"

import { useState } from 'react'
import { Users, Activity, BarChart3, Settings, ShieldAlert, TrendingUp, Shield, Calendar } from 'lucide-react'
import { UserManagement } from '@/components/admin/user-management'
import { DoctorPerformance } from '@/components/admin/doctor-performance'
import { MedicalStatistics } from '@/components/admin/medical-statistics'
import { WardAnalytics } from '@/components/admin/ward-analytics'
import { WardSettings } from '@/components/admin/ward-settings'
import { ReminderArchive } from '@/components/admin/reminder-archive'
import { NavigationButtons } from '@/components/layout/navigation-buttons'

export default function WardManagementClient({
  initialUsers,
  dbSizeMB,
  patientsData,
  wardSettingsData,
  hasServiceKey,
  aiEnabled
}: {
  initialUsers: any[]
  dbSizeMB: string
  patientsData: any[]
  wardSettingsData: any[]
  hasServiceKey: boolean
  aiEnabled: boolean
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'performance' | 'research' | 'analytics' | 'wards' | 'reminders'>('users')

  return (
    <div className="space-y-8 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <NavigationButtons />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Settings className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Ward Management
              </h1>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 ml-12">
              Control center, doctor performance, and research analytics.
            </p>
          </div>
        </div>
        
        {/* Storage Pill */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
           <div className={`h-3 w-3 rounded-full ${dbSizeMB === 'Error' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
           <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
             Storage: {dbSizeMB === 'Error' ? 'Configuration Pending' : `${dbSizeMB} MB Used`}
           </span>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth w-full sm:max-w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'users' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" /> User Control
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'performance' 
              ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" /> Doctor Performance
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'analytics' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp className="h-4 w-4 shrink-0" /> Analytics
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'research' 
              ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" /> Medical Research
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'reminders' 
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" /> Reminders Archive
        </button>
        <button
          onClick={() => setActiveTab('wards')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'wards' 
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="h-4 w-4 shrink-0" /> Ward Setup
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
            wardNames={Array.from(new Set([
              ...initialUsers.map(u => u.ward_name),
              ...wardSettingsData.map(s => s.ward_name),
              ...patientsData.map(p => p.ward_name)
            ])).filter(Boolean).sort()} 
          />
        )}
        {activeTab === 'performance' && <DoctorPerformance users={initialUsers} patients={patientsData} />}
        {activeTab === 'analytics' && <WardAnalytics patients={patientsData} />}
        {activeTab === 'research' && <MedicalStatistics patients={patientsData} aiEnabled={aiEnabled} />}
        {activeTab === 'reminders' && <ReminderArchive />}
        {activeTab === 'wards' && <WardSettings settings={wardSettingsData} users={initialUsers} />}
      </div>
    </div>
  )
}

