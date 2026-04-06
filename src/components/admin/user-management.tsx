"use client"

import { useState } from 'react'
import { UserPlus, KeyRound, Edit, Trash2, ArrowRightLeft, User, X, Sparkles } from 'lucide-react'
import { createUserAction, deleteUserAction, updateUserPasswordAction, migratePatientsAction, updateUserDetailsAction } from '@/app/actions/admin-actions'

export function UserManagement({ users }: { users: any[] }) {
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
  const [canSeeWardPatients, setCanSeeWardPatients] = useState(false)

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
      setCanSeeWardPatients(user.can_see_ward_patients ?? false)
    } else {
      setEmail('')
      setPassword('')
      setRole('user')
      setSpecialty('psychiatry')
      setWardName('')
      setGender('')
      setAiEnabled(true)
      setCanSeeWardPatients(false)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedUser(null)
  }

  // Actions
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('role', role)
    formData.append('ward_name', wardName)
    formData.append('specialty', specialty)
    formData.append('ai_enabled', String(aiEnabled))
    formData.append('can_see_ward_patients', String(canSeeWardPatients))
    if (gender) formData.append('gender', gender)

    const res = await createUserAction(formData)
    setIsRefreshing(false)
    if (res?.error) alert(res.error)
    else closeModal()
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    const res = await updateUserDetailsAction(selectedUser.id, email, wardName, role, specialty, aiEnabled, canSeeWardPatients, gender || null)
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
              {users?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">No users found or error fetching</td></tr>
              ) : users?.map((u) => (
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
                    {u.ward_name}
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

                  <div>
                    <label className="block text-sm font-semibold mb-1">Assigned Ward</label>
                    <input type="text" value={wardName} onChange={e => setWardName(e.target.value)} placeholder="e.g. ICU - General" required className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700" />
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
