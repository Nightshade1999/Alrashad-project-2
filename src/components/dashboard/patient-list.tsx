"use client"

import { useState, useMemo } from 'react'
import { 
  Search, UserRound, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, 
  CheckSquare, Square, FileText, Table as TableIcon, Loader2 
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DeletePatientButton } from '@/components/patient/delete-button'
import { format, parseISO } from 'date-fns'
import { exportPatientsToExcel, exportToWord } from '@/lib/export-utils'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useEffect } from 'react'

export interface PatientRow {
  id: string
  name: string
  age: number
  ward_number: string
  category: string
  chronic_diseases: string | null
  lastHba1c: number | null
  lastHb: number | null
  lastVisit: string | null
}

type SortKey = 'name' | 'age' | 'chronic_diseases' | 'lastHba1c' | 'lastHb' | 'lastVisit' | 'overdue'

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 inline-block" />
  return dir === 'asc'
    ? <ArrowUp className="ml-1 h-3 w-3 text-teal-600 dark:text-teal-400 inline-block" />
    : <ArrowDown className="ml-1 h-3 w-3 text-teal-600 dark:text-teal-400 inline-block" />
}

function SortableHeader({
  label, col, sortCol, sortDir, onSort
}: {
  label: string; col: SortKey; sortCol: SortKey; sortDir: 'asc' | 'desc'; onSort: (c: SortKey) => void
}) {
  const active = sortCol === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center text-left text-xs font-semibold uppercase tracking-wider transition-colors hover:text-teal-700 dark:hover:text-teal-300 ${active ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground'}`}
    >
      {label}
      <SortIcon col={col} active={active} dir={sortDir} />
    </button>
  )
}

export function PatientList({ patients, defaultSort = 'name' }: { patients: PatientRow[]; defaultSort?: SortKey }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortKey>(defaultSort)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    defaultSort === 'lastVisit' || defaultSort === 'overdue' ? 'desc' : 'asc'
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  function handleSort(col: SortKey) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return patients.filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.ward_number.toLowerCase().includes(q) ||
      (p.chronic_diseases ?? '').toLowerCase().includes(q)
    )
  }, [search, patients])

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleBulkExportExcel = async () => {
    const selectedPatients = patients.filter(p => selectedIds.has(p.id))
    await exportPatientsToExcel(selectedPatients)
    toast.success(`Exported ${selectedIds.size} patients to Excel`)
  }

  const handleBulkExportWord = async () => {
    setIsExporting(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const doctorEmail = user?.email || ""

      // Fetch full patient data
      const { data: patientsData, error: pError } = await supabase
        .from('patients')
        .select('*')
        .in('id', Array.from(selectedIds))

      if (pError) throw pError

      // Fetch all investigations for these patients
      const { data: invs, error: iError } = await supabase
        .from('investigations')
        .select('*')
        .in('patient_id', Array.from(selectedIds))
        .order('test_date', { ascending: false })

      if (iError) throw iError

      // Fetch all visits for these patients
      const { data: visits, error: vError } = await supabase
        .from('visits')
        .select('*')
        .in('patient_id', Array.from(selectedIds))
        .order('visit_date', { ascending: false })

      if (vError) throw vError

      // Merge data
      const merged = (patientsData as any[]).map(p => {
        const row = patients.find(r => r.id === p.id)
        return { 
          ...p, 
          ...row, 
          investigations: (invs as any[] || []).filter(i => i.patient_id === p.id),
          visits: (visits as any[] || []).filter(v => v.patient_id === p.id)
        }
      })

      await exportToWord(merged, doctorEmail)
      toast.success(`Exported ${selectedIds.size} patients to Word`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to export to Word")
    } finally {
      setIsExporting(false)
    }
  }

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let va: any, vb: any
      switch (sortCol) {
        case 'name': va = a.name; vb = b.name; break
        case 'age': va = a.age; vb = b.age; break
        case 'chronic_diseases': va = a.chronic_diseases ?? ''; vb = b.chronic_diseases ?? ''; break
        case 'lastHba1c': va = a.lastHba1c ?? -1; vb = b.lastHba1c ?? -1; break
        case 'lastHb': va = a.lastHb ?? -1; vb = b.lastHb ?? -1; break
        case 'lastVisit':
          // nulls go to end regardless of dir
          va = a.lastVisit ? new Date(a.lastVisit).getTime() : (sortDir === 'asc' ? Infinity : -Infinity)
          vb = b.lastVisit ? new Date(b.lastVisit).getTime() : (sortDir === 'asc' ? Infinity : -Infinity)
          break
        case 'overdue':
          const getOverdueScore = (p: PatientRow) => {
            if (!p.lastVisit) return 999999999 // Never seen = high priority
            const daysSince = (Date.now() - new Date(p.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
            const threshold = p.category === 'High Risk' ? 7 : p.category === 'Close Follow-up' ? 30 : 90
            return daysSince - threshold
          }
          va = getOverdueScore(a)
          vb = getOverdueScore(b)
          break
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortCol, sortDir])

  const headerProps = { sortCol, sortDir, onSort: handleSort }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, bed, or disease..."
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm focus-visible:ring-teal-500"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/60 p-1.5 rounded-lg animate-in fade-in zoom-in duration-200 shadow-sm">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 px-2 min-w-[70px]">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-teal-200 dark:bg-teal-800 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs gap-1.5 hover:bg-white dark:hover:bg-slate-800"
              onClick={handleBulkExportExcel}
            >
              <TableIcon className="h-3.5 w-3.5 text-emerald-600" />
              Excel
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs gap-1.5 hover:bg-white dark:hover:bg-slate-800"
              onClick={handleBulkExportWord}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-blue-600" />}
              Word
            </Button>
          </div>
        )}
      </div>

      {/* List container */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <UserRound className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            {search ? 'No patients match your search' : 'No patients in this category'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          {/* Table Header */}
          <div
            className="grid items-center gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700"
            style={{ gridTemplateColumns: 'min-content 2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 1fr 2rem' }}
          >
            <button 
              onClick={toggleSelectAll} 
              className="text-muted-foreground hover:text-teal-600 transition-colors p-1"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 
                ? <CheckSquare className="h-4 w-4 text-teal-600" /> 
                : <Square className="h-4 w-4" />
              }
            </button>
            <SortableHeader label="Patient" col="name" {...headerProps} />
            <SortableHeader label="Age" col="age" {...headerProps} />
            <SortableHeader label="Chronic Disease" col="chronic_diseases" {...headerProps} />
            <SortableHeader label="HbA1c" col="lastHba1c" {...headerProps} />
            <SortableHeader label="Hb" col="lastHb" {...headerProps} />
            <SortableHeader label="Last Visit" col="lastVisit" {...headerProps} />
            <SortableHeader label="Status" col="overdue" {...headerProps} />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map(p => {
              const handleRowClick = () => {
                window.location.href = `/patient/${p.id}`
              }

              return (
                <div
                  key={p.id}
                  className={`group grid items-center gap-4 px-5 py-4 border-l-2 transition-all cursor-pointer ${selectedIds.has(p.id) ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-900/10' : 'border-transparent hover:bg-teal-50/50 dark:hover:bg-teal-950/20'}`}
                  style={{ gridTemplateColumns: 'min-content 2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 1fr 2rem' }}
                  onClick={handleRowClick}
                >
                  <div 
                    className="p-1 -m-1" 
                    onClick={e => { e.stopPropagation(); toggleSelect(p.id) }}
                  >
                    {selectedIds.has(p.id) 
                      ? <CheckSquare className="h-4 w-4 text-teal-600" /> 
                      : <Square className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
                    }
                  </div>

                  {/* Name + Bed */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 group/link">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm group-hover/link:text-teal-600 dark:group-hover/link:text-teal-400 transition-colors" dir="auto">
                          {p.name}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{p.ward_number}</span>
                    </div>
                  </div>

                  {/* Age */}
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p.age}y</span>

                  {/* Chronic Disease */}
                  <span className="text-sm text-slate-600 dark:text-slate-400 truncate" title={p.chronic_diseases ?? ''}>
                    {p.chronic_diseases || <span className="text-muted-foreground italic text-xs">None</span>}
                  </span>

                  {/* HbA1c */}
                  <span className={`text-sm font-medium tabular-nums ${p.lastHba1c != null && p.lastHba1c > 6.5 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {p.lastHba1c != null ? `${p.lastHba1c}%` : <span className="text-muted-foreground">—</span>}
                  </span>

                  {/* Hb */}
                  <span className={`text-sm font-medium tabular-nums ${p.lastHb != null && p.lastHb < 10 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {p.lastHb != null ? p.lastHb : <span className="text-muted-foreground">—</span>}
                  </span>

                  {/* Last Visit */}
                  <span className="text-sm text-slate-600 dark:text-slate-400 text-xs">
                    {p.lastVisit
                      ? format(parseISO(p.lastVisit), 'dd MMM yyyy')
                      : <span className="text-muted-foreground italic text-xs">No visits</span>
                    }
                  </span>

                  {/* Overdue Status Tag */}
                  <div className="flex items-center">
                    {(() => {
                      if (!p.lastVisit) return <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">Never Seen</span>
                      const daysSince = (Date.now() - new Date(p.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
                      const threshold = p.category === 'High Risk' ? 7 : p.category === 'Close Follow-up' ? 30 : 90
                      const overdue = Math.floor(daysSince - threshold)
                      if (overdue > 0) return <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">{overdue}d overdue</span>
                      return <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">On Track</span>
                    })()}
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    <DeletePatientButton patientId={p.id} variant="ghost" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground px-1">
        Showing {sorted.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
        {sortCol && <span> · Sorted by <strong>{sortCol === 'lastVisit' ? 'last visit' : sortCol === 'lastHba1c' ? 'HbA1c' : sortCol === 'lastHb' ? 'Hb' : sortCol}</strong> ({sortDir})</span>}
      </p>
    </div>
  )
}
