"use client"

import { useState, useMemo } from 'react'
import { Users, Activity, BarChart3, Settings, ShieldAlert, Shield, Calendar, Trash2, ClipboardList, Pill, FlaskConical, Search, Filter, FileSpreadsheet, FileDown } from 'lucide-react'
import { UserManagement } from '@/components/admin/user-management'
import { DoctorPerformance } from '@/components/admin/doctor-performance'
import { MedicalStatistics } from '@/components/admin/medical-statistics'
import { WardSettings } from '@/components/admin/ward-settings'
import { ReminderArchive } from '@/components/admin/reminder-archive'
import { RecycleBinView } from '@/components/admin/recycle-bin-view'
import { ReferralManagement } from '@/components/admin/referral-management'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { exportPharmacyInventoryToExcel, exportPharmacyInventoryToDoc } from '@/lib/pharmacy-export-utils'
import { updateGlobalOfflineSettingAction, enableOfflineForAllUsersAction } from '@/app/actions/admin-actions'
import { toast } from 'sonner'

export default function WardManagementClient({
  initialUsers,
  dbSizeMB,
  patientsData,
  wardSettingsData,
  hasServiceKey,
  aiEnabled,
  initialGlobalOffline,
  allInstructions = [],
  allInventory = []
}: {
  initialUsers: any[]
  dbSizeMB: string
  patientsData: any[]
  wardSettingsData: any[]
  hasServiceKey: boolean
  aiEnabled: boolean
  initialGlobalOffline: boolean
  allInstructions?: any[]
  allInventory?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'performance' | 'research' | 'referrals' | 'pharmacy' | 'nursing' | 'reminders' | 'trash' | 'settings' | 'wards'>('users')
  const [globalOffline, setGlobalOffline] = useState(initialGlobalOffline)
  const [bulkEnabling, setBulkEnabling] = useState(false)

  // Searching & Filtering State
  const [pharmaSearch, setPharmaSearch] = useState("")
  const [pharmaCategory, setPharmaCategory] = useState("All")
  const [pharmaDept, setPharmaDept] = useState("All")
  const [nurseSearch, setNurseSearch] = useState("")

  // Filtered Data
  const filteredInventory = useMemo(() => {
    return allInventory.filter(item => {
      const matchesSearch = !pharmaSearch || 
        (item.generic_name || "").toLowerCase().includes(pharmaSearch.toLowerCase()) ||
        (item.scientific_name || "").toLowerCase().includes(pharmaSearch.toLowerCase());
      
      const matchesCategory = pharmaCategory === "All" || item.category === pharmaCategory;
      const matchesDept = pharmaDept === "All" || (item.department || "Ward") === pharmaDept;

      return matchesSearch && matchesCategory && matchesDept;
    });
  }, [allInventory, pharmaSearch, pharmaCategory, pharmaDept]);

  const filteredInstructions = useMemo(() => {
    return allInstructions.filter(inst => {
      const searchStr = `${inst.patients?.name || ""} ${inst.instruction || ""} ${inst.doctor_name || ""} ${inst.read_by_nurse_name || ""}`.toLowerCase();
      return !nurseSearch || searchStr.includes(nurseSearch.toLowerCase());
    });
  }, [allInstructions, nurseSearch]);

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
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'referrals' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Referral Log</span>
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
          onClick={() => setActiveTab('pharmacy')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'pharmacy' 
              ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Pill className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Pharmacy Log</span>
        </button>
        <button
          onClick={() => setActiveTab('nursing')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'nursing' 
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Nursing Log</span>
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'trash' 
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Trash2 className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Recycle Bin</span>
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
        {activeTab === 'referrals' && <ReferralManagement />}
        {activeTab === 'pharmacy' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Pill className="h-5 w-5 text-teal-600" />
                  Global Pharmacy Inventory
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic px-7">Read-Only Central Logs</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="h-10 rounded-xl font-black border-slate-200 dark:border-slate-800 gap-2"
                   onClick={() => exportPharmacyInventoryToExcel(filteredInventory, "Admin_Global_Log")}
                >
                   <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                   EXCEL
                </Button>
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="h-10 rounded-xl font-black border-slate-200 dark:border-slate-800 gap-2"
                   onClick={() => exportPharmacyInventoryToDoc(filteredInventory, "Admin_Global_Log")}
                >
                   <FileDown className="h-4 w-4 text-blue-600" />
                   DOC
                </Button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 bg-white/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by name..." 
                    value={pharmaSearch}
                    onChange={e => setPharmaSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
               </div>

               <div className="flex items-center gap-2">
                  <Select value={pharmaCategory} onValueChange={(v) => setPharmaCategory(v || "All")}>
                    <SelectTrigger className="h-10 w-32 rounded-xl font-bold bg-white dark:bg-slate-950">
                      <div className="flex items-center gap-2">
                         <Filter className="h-3 w-3 text-slate-400" />
                         <SelectValue placeholder="Category" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                      <SelectItem value="Analgesic">Analgesic</SelectItem>
                      <SelectItem value="Psychotic">Psychotic</SelectItem>
                      <SelectItem value="Eye drops">Eye drops</SelectItem>
                      <SelectItem value="Fluids">Fluids</SelectItem>
                      <SelectItem value="Creams">Creams</SelectItem>
                      <SelectItem value="Cardiovascular">Cardiovascular</SelectItem>
                      <SelectItem value="Gastrointestinal">Gastrointestinal</SelectItem>
                      <SelectItem value="Respiratory">Respiratory</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={pharmaDept} onValueChange={(v) => setPharmaDept(v || "All")}>
                    <SelectTrigger className="h-10 w-32 rounded-xl font-bold bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Departments</SelectItem>
                      <SelectItem value="Ward">Ward</SelectItem>
                      <SelectItem value="ER">ER</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50">
                     <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                        <th className="px-6 py-4">Drug / Dosage</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Dept.</th>
                        <th className="px-6 py-4">Expiry</th>
                        <th className="px-6 py-4">Pharmacist</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {filteredInventory.map(item => (
                       <tr key={item.id} className="text-sm font-bold">
                         <td className="px-6 py-4">
                            <p className="text-slate-900 dark:text-white">{item.generic_name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-black">{item.scientific_name} ({item.dosage})</p>
                         </td>
                         <td className="px-6 py-4">
                            <span className={item.quantity <= (item.min_stock_level || 10) ? 'text-rose-500 font-black' : 'text-slate-900 dark:text-white'}>
                              {item.quantity}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <Badge variant="outline" className="text-[9px] uppercase font-black">{item.category || 'General'}</Badge>
                         </td>
                         <td className="px-6 py-4 text-xs font-black text-slate-400 uppercase">{item.department || 'Ward'}</td>
                         <td className="px-6 py-4 text-xs">{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}</td>
                         <td className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500">{item.pharmacist_name || 'System'}</td>
                       </tr>
                     ))}
                     {filteredInventory.length === 0 && (
                        <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black italic uppercase tracking-widest">No matching drugs found</td>
                        </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'nursing' && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Global Nursing Instructions
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic px-7">Patient Care Audit Logs</p>
              </div>

               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by patient or instruction..." 
                    value={nurseSearch}
                    onChange={e => setNurseSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                     <tr>
                        <th className="px-6 py-4">Patient / Ward</th>
                        <th className="px-6 py-4">Instruction</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Physician</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Signed By</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredInstructions.map(inst => (
                        <tr key={inst.id} className="text-sm">
                           <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 dark:text-white">{inst.patients?.name || '??'}</p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{inst.ward_name}</p>
                           </td>
                           <td className="px-6 py-4 max-w-xs">
                              <p className="text-xs italic text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">"{inst.instruction}"</p>
                           </td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className="text-[9px] uppercase font-black border-slate-200">{inst.instruction_type}</Badge>
                           </td>
                           <td className="px-6 py-4 text-[10px] font-bold text-slate-600">Dr. {inst.doctor_name}</td>
                           <td className="px-6 py-4">
                              {inst.is_read ? (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50/50 font-black">Signed</Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50/50 font-black animate-pulse">Pending</Badge>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              {inst.is_read ? (
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{inst.read_by_nurse_name || 'Staff Nurse'}</span>
                                   <span className="text-[9px] text-slate-400 font-medium">Verified System Sign</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">Not yet signed</span>
                              )}
                           </td>
                        </tr>
                      ))}
                      {filteredInstructions.length === 0 && (
                        <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-black italic uppercase tracking-widest">No instructions found</td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'reminders' && <ReminderArchive />}
        {activeTab === 'wards' && <WardSettings settings={wardSettingsData} users={initialUsers} />}
        {activeTab === 'trash' && <RecycleBinView />}
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

                {/* Bulk enable */}
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/60 dark:border-slate-700/50">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Enable Offline Sync for All Users</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      Activates PowerSync Local-First mode for every doctor account in one step. Each device will begin its initial sync on next login.
                    </p>
                  </div>
                  <button
                    disabled={bulkEnabling}
                    onClick={async () => {
                      if (!confirm('Enable offline sync for ALL users? Each device will download a local copy of ward data on next login.')) return
                      setBulkEnabling(true)
                      const res = await enableOfflineForAllUsersAction()
                      setBulkEnabling(false)
                      if (res.success) toast.success('Offline sync enabled for all users')
                      else toast.error(res.error || 'Failed')
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap shrink-0 ml-6"
                  >
                    {bulkEnabling ? (
                      <><Shield className="h-4 w-4 animate-pulse" /> Enabling...</>
                    ) : (
                      <><Shield className="h-4 w-4" /> Enable for All</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

