"use client"

import { useState } from 'react'
import { UserPlus, KeyRound, Edit, Trash2, ArrowRightLeft, User, X, Sparkles, Search, ChevronDown, Plus, Check as CheckIcon, Activity } from 'lucide-react'
import { createUserAction, deleteUserAction, updateUserPasswordAction, migratePatientsAction, updateUserDetailsAction } from '@/app/actions/admin-actions'

export function UserManagement({ users, wardNames }: { users: any[], wardNames: string[] }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'password' | 'migrate' | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [specialty, setSpecialty] = useState('psychiatry')
  const [wardName, setWardName] = useState('')
  const [toUserId, setToUserId] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false)
  const [canSeeWardPatients, setCanSeeWardPatients] = useState(false)
  const [accessibleWards, setAccessibleWards] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [wardSearch, setWardSearch] = useState('')

  const filteredUsers = (users || []).filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.ward_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openModal = (type: any, user: any = null) => {
    setActiveModal(type)
    setSelectedUser(user)
    if (user) {
      setEmail(user.email)
      setRole(user.role)
      setWardName(user.ward_name)
      setSpecialty(user.specialty || 'psychiatry')
      setGender(user.gender || '')
      setAiEnabled(user.ai_enabled ?? true)
      setOfflineModeEnabled(user.offline_mode_enabled ?? false)
      setCanSeeWardPatients(user.can_see_ward_patients ?? false)
      setAccessibleWards(user.accessible_wards || (user.ward_name ? [user.ward_name] : []))
    } else {
      setEmail('')
      setPassword('')
      setRole('user')
      setSpecialty('psychiatry')
      setWardName(wardNames[0] || '')
      setGender('')
      setAiEnabled(true)
      setOfflineModeEnabled(false)
      setCanSeeWardPatients(false)
      setAccessibleWards([])
    }
    setWardSearch('')
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedUser(null)
    setWardSearch('')
  }

  // Actions
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    
    const updatedWards = accessibleWards
    const primaryWard = updatedWards[0] || 'Unassigned'

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('role', role)
    formData.append('ward_name', primaryWard)
    formData.append('specialty', specialty)
    formData.append('ai_enabled', String(aiEnabled))
    formData.append('offline_mode_enabled', String(offlineModeEnabled))
    formData.append('can_see_ward_patients', String(canSeeWardPatients))
    if (gender) formData.append('gender', gender)
    formData.append('accessible_wards', JSON.stringify(updatedWards))
    formData.append('ward_name', primaryWard)

    const res = await createUserAction(formData)
    setIsRefreshing(false)
    if (res?.error) alert(res.error)
    else closeModal()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    
    const updatedWards = accessibleWards
    const primaryWard = updatedWards[0] || 'Unassigned'

    const res = await updateUserDetailsAction(selectedUser.id, email, primaryWard, role, specialty, aiEnabled, offlineModeEnabled, canSeeWardPatients, gender || null, updatedWards)
    setIsRefreshing(false)
    if (res?.error) alert(res.error)
    else closeModal()
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    const res = await updateUserPasswordAction(selectedUser.id, password)
    setIsRefreshing(false)
    if (res?.error) alert(res.error)
    else {
      alert("Password successfully changed.")
      closeModal()
    }
  }

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    const res = await migratePatientsAction(selectedUser.id, toUserId)
    setIsRefreshing(false)
    if (res?.error) alert(res.error)
    else {
      alert(`Success! Moved ${res.count} patients.`)
      closeModal()
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`Are you sure you want to delete ${email}?\nThis is permanent.`)) {
      setIsRefreshing(true)
      const res = await deleteUserAction(id)
      if (res?.error) alert(res.error)
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" /> System Users
        </h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by email or ward..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
            />
          </div>
          <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
            <UserPlus className="h-4 w-4" /> Create Doctor
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Account / Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Ward Name</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500 font-medium">No doctors match your search.</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                        {u.specialty === 'internal_medicine' ? 'IM Resident' : 'Psych Resident'} {u.gender ? `(${u.gender})` : ''}
                      </span>
                      {u.offline_mode_enabled && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-tighter">
                          <Activity className="h-3 w-3" /> Offline Sync
                        </span>
                      )}
                      {u.ai_enabled ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-tighter">
                          <Sparkles className="h-3 w-3" /> AI Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter grayscale">
                           AI Disabled
                        </span>
                      )}
                      {u.can_see_ward_patients && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-1 uppercase tracking-tighter">
                          <ArrowRightLeft className="h-3 w-3" /> Collaborator
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-700 dark:text-slate-300">
                        {u.ward_name}
                      </span>
                      {u.accessible_wards?.filter((w: string) => w !== u.ward_name).map((w: string) => (
                        <span key={w} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900/50 rounded text-slate-400 border border-slate-100 dark:border-slate-800">
                          {w}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors inline-block" title="Edit Profile" onClick={() => openModal('edit', u)}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors inline-block" title="Migrate Patients" onClick={() => openModal('migrate', u)}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors inline-block" title="Reset Password" onClick={() => openModal('password', u)}>
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button disabled={isRefreshing} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors inline-block disabled:opacity-50" title="Delete Account" onClick={() => handleDelete(u.id, u.email)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== OVERLAYS / MODALS ===== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">
                {activeModal === 'create' && 'Create New Doctor'}
                {activeModal === 'edit' && 'Edit User Details'}
                {activeModal === 'password' && 'Change Password'}
                {activeModal === 'migrate' && 'Migrate Data'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-4">
              
              {/* CREATE & EDIT FORM */}
              {(activeModal === 'create' || activeModal === 'edit') && (
                <form onSubmit={activeModal === 'create' ? handleCreateNew : handleEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Email / Account ID</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  
                  {activeModal === 'create' && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">New Password</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-1">Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700">
                      <option value="user">Doctor (Standard)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Specialty</label>
                    <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700">
                      <option value="psychiatry">Psychiatrist Resident</option>
                      <option value="internal_medicine">Internal Medicine Resident</option>
                    </select>
                  </div>

                  {/* Simplified Ward Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Assigned Wards (First is Primary)</label>
                    <div className="flex flex-wrap gap-2 p-3 border-2 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus-within:border-indigo-500/50 transition-all shadow-sm">
                      {accessibleWards.map((w, idx) => (
                        <span key={w} className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in zoom-in-95 ${
                          idx === 0 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {w}
                          <button type="button" onClick={() => setAccessibleWards(prev => prev.filter(aw => aw !== w))} className="hover:scale-125 transition-transform"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                      {accessibleWards.length === 0 && (
                        <span className="text-sm font-medium text-slate-400 p-1 italic">
                          No wards selected...
                        </span>
                      )}
                    </div>
                    
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Search existing wards..."
                          value={wardSearch}
                          onChange={e => setWardSearch(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs font-bold w-full"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {wardNames.filter(w => w.toLowerCase().includes(wardSearch.toLowerCase())).map(w => (
                          <label key={w} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 mb-1">
                            <div className="relative flex items-center justify-center">
                              <input 
                                type="checkbox"
                                checked={accessibleWards.includes(w)}
                                onChange={e => {
                                  if (e.target.checked) setAccessibleWards(prev => [...prev, w])
                                  else setAccessibleWards(prev => prev.filter(aw => aw !== w))
                                }}
                                className="peer h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all appearance-none border-2 checked:bg-indigo-600 checked:border-indigo-600"
                              />
                              <CheckIcon className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <span className={`text-sm tracking-tight ${accessibleWards.includes(w) ? 'font-black text-slate-900 dark:text-slate-100' : 'font-medium text-slate-500 dark:text-slate-400'}`}>{w}</span>
                            {accessibleWards[0] === w && (
                              <span className="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 rounded-md ring-1 ring-indigo-200 dark:ring-indigo-800 animate-pulse">
                                Primary
                              </span>
                            )}
                          </label>
                        ))}
                        {wardNames.filter(w => w.toLowerCase().includes(wardSearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-xs text-slate-400 italic font-medium">No matching wards found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700">
                      <option value="">-- Not Set --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={aiEnabled} 
                        onChange={e => setAiEnabled(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          Enable AI Features
                        </p>
                        <p className="text-[11px] text-slate-500">Allow doctor to use Gemini Clinical Advisor & AI Research reports</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={offlineModeEnabled}
                        onChange={e => setOfflineModeEnabled(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold flex items-center gap-2">
                          <Activity className="h-4 w-4 text-amber-500" />
                          OfflineSync™ Support
                        </p>
                        <p className="text-[11px] text-slate-500">Allow doctor to use SQLite Local-First mode</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={canSeeWardPatients}
                        onChange={e => setCanSeeWardPatients(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-teal-500" />
                          Ward Collaboration
                        </p>
                        <p className="text-[11px] text-slate-500">Allow doctor to see all patients in their assigned ward</p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button disabled={isRefreshing} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50">
                      {isRefreshing ? 'Saving...' : 'Save User'}
                    </button>
                  </div>
                </form>
              )}

              {/* PASSWORD RESET FORM */}
              {activeModal === 'password' && (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg mb-4">
                    You are forcing a password reset for <b>{selectedUser?.email}</b>.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">New Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button disabled={isRefreshing} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg disabled:opacity-50">
                      {isRefreshing ? 'Saving...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              {/* MIGRATE FORM */}
              {activeModal === 'migrate' && (
                <form onSubmit={handleMigrate} className="space-y-4">
                  <div className="p-3 bg-teal-50 text-teal-800 text-sm rounded-lg mb-4">
                    Transfer all patients seamlessly from <b>{selectedUser?.email}</b> to a different doctor.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Select Destination Doctor</label>
                    <select value={toUserId} onChange={e => setToUserId(e.target.value)} required className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700">
                      <option value="" disabled>-- Select Doctor --</option>
                      {users.filter(u => u.id !== selectedUser?.id).map(u => (
                        <option key={u.id} value={u.id}>{u.email} ({u.ward_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button disabled={isRefreshing || !toUserId} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg disabled:opacity-50">
                      {isRefreshing ? 'Migrating...' : 'Migrate Data'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
