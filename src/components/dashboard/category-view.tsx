"use client"

import { AlertCircle, Clock, Activity, CalendarClock } from 'lucide-react'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { PatientList, type PatientRow } from '@/components/dashboard/patient-list'
import { useDatabase } from '@/hooks/useDatabase'

export const CATEGORY_MAP: Record<string, {
  label: string; dbValue: string | null; icon: any
  gradient: string; lightBg: string; border: string
  iconBg: string; iconColor: string; dot: string
  description?: string
}> = {
  'high-risk': {
    label: 'High Risk', dbValue: 'High Risk', icon: AlertCircle,
    gradient: 'from-red-500 to-rose-600', lightBg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-900/40', iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400', dot: '🔴',
  },
  'close-follow-up': {
    label: 'Close Follow-up', dbValue: 'Close Follow-up', icon: Clock,
    gradient: 'from-amber-500 to-orange-500', lightBg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/40', iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400', dot: '🟡',
  },
  'normal': {
    label: 'Normal Follow-up', dbValue: 'Normal', icon: Activity,
    gradient: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/40', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400', dot: '🟢',
  },
  'pending-follow-up': {
    label: 'Pending Follow-up', dbValue: 'ALL', icon: CalendarClock,
    gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-900/40', iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400', dot: '🕐',
    description: 'All patients sorted by oldest last visit — review who needs attention first.',
  },
  'awaiting-assessment': {
    label: 'Awaiting Assessment', dbValue: 'Awaiting Assessment', icon: Activity,
    gradient: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900/40', iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400', dot: '🔵',
  },
  'archive': {
    label: 'Archive (Deceased)', dbValue: 'Deceased/Archive', icon: AlertCircle,
    gradient: 'from-slate-500 to-slate-700', lightBg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-slate-200 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-400', dot: '⚫',
  },
}

interface CategoryViewProps {
  slug: string
  rows: PatientRow[]
  isPending: boolean
}

export function CategoryView({ slug, rows, isPending }: CategoryViewProps) {
  const { profile } = useDatabase()
  const category = CATEGORY_MAP[slug]
  if (!category) return null;
  const Icon = category.icon

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`relative rounded-2xl border ${category.border} ${category.lightBg} p-6 overflow-hidden`}>
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${category.gradient}`} />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${category.iconBg}`}>
              <Icon className={`h-6 w-6 ${category.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.dot}</span>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{category.label}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {category.description ? category.description : `${rows.length} patient${rows.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {!isPending && <AddPatientModal role={profile?.role} />}
        </div>
      </div>

      {/* Patient List */}
      <PatientList 
        patients={rows} 
        defaultSort={isPending ? 'overdue' : 'name'} 
        categorySlug={slug}
        availableWards={Array.from(new Set(rows.map(r => (r as any).ward_name).filter(Boolean).sort())) as string[]}
      />
    </div>
  )
}
