"use client"

import { useState, useMemo } from 'react'
import { 
  Search, UserRound, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, 
  CheckSquare, Square, FileText, Table as TableIcon, Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DeletePatientButton } from '@/components/patient/delete-button'
import { AddVisitModal } from '@/components/patient/add-visit-modal'
import { AddInvestigationModal } from '@/components/patient/add-investigation-modal'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useEffect, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface PatientRow {
  id: string
  name: string
  age: number
  room_number: string
  category: string
  chronic_diseases: any[] | null
  lastHba1c: number | null
  lastHb: number | null
  lastVisit: string | null
  // vitals from last visit
  lastBpSys: number | null
  lastBpDia: number | null
  lastPr: number | null
  lastSpo2: number | null
  lastTemp: number | null
  // death info
  date_of_death?: string | null
  cause_of_death?: string | null
  previous_category?: string | null
}

type SortKey = 'name' | 'age' | 'chronic_diseases' | 'lastHba1c' | 'lastHb' | 'lastVisit' | 'overdue'

function parseJSONArray(field: any): any[] {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getAbbrev(name: string) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : name;
}

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
  
  const router = useRouter();

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
    return patients.filter(p => {
      const diseasesArr = parseJSONArray(p.chronic_diseases)
      const diseasesStr = diseasesArr.map((d: any) => d.name).join(', ').toLowerCase();
      return !q ||
      p.name.toLowerCase().includes(q) ||
      p.room_number.toLowerCase().includes(q) ||
      diseasesStr.includes(q)
    })
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
    const { exportPatientsToExcel } = await import('@/lib/export-excel')
    await exportPatientsToExcel(selectedPatients)
    toast.success(`Exported ${selectedIds.size} patients to Excel`)
  }

  const handleBulkExportWord = async () => {
    setIsExporting(true)
    const supabase = createClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
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
        .order('date', { ascending: false })

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

      const { exportToWord } = await import('@/lib/export-word')
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
        case 'chronic_diseases': 
          va = parseJSONArray(a.chronic_diseases).map((d: any) => d.name).join(', ')
          vb = parseJSONArray(b.chronic_diseases).map((d: any) => d.name).join(', ')
          break
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
            placeholder="Search by name, ward, or disease..."
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm focus-visible:ring-teal-500"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/60 p-1.5 rounded-lg shadow-sm">
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
          <div className="hidden xl:grid items-center gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: '32px 2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 1fr 110px' }}>
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
            <div className="w-[110px]" /> {/* Spacer for Actions column */}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex flex-col">
            {sorted.map((p, i) => (
              <PatientCard 
                key={p.id} 
                p={p} 
                index={i}
                isSelected={selectedIds.has(p.id)} 
                onToggleSelect={toggleSelect} 
              />
            ))}
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

/**
 * MEMOIZED PATIENT CARD
 * extracted for high-performance rendering (prevents full list flicker on sync)
 */
const PatientCard = memo(({ p, index, isSelected, onToggleSelect }: { p: PatientRow; index: number; isSelected: boolean; onToggleSelect: (id: string) => void }) => {
  const router = useRouter()
  const handleRowClick = () => {
    router.push(`/patient/${p.id}`)
  }

  const OverdueTag = () => {
    if (!p.lastVisit) return <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">Never Seen</span>
    const daysSince = (Date.now() - new Date(p.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    const threshold = p.category === 'High Risk' ? 7 : p.category === 'Close Follow-up' ? 30 : 90
    const overdue = Math.floor(daysSince - threshold)
    if (overdue > 0) return <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">{overdue}d overdue</span>
    return <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight whitespace-nowrap">On Track</span>
  }

  // Stagger only first 20 rows — beyond that instant render to avoid janky scroll
  const delay = index < 20 ? `${index * 35}ms` : '0ms'

  return (
    <div
      className={`group relative transition-all cursor-pointer border-l-2 ${isSelected ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-900/10' : 'border-transparent hover:bg-teal-50/50 dark:hover:bg-teal-950/20'}`}
      onClick={handleRowClick}
    >

      {/* --- Desktop Row --- */}
      <div className="hidden xl:flex xl:flex-col">
        {/* Main desktop grid row */}
        <div
          className="grid items-center gap-4 px-5 py-4"
          style={{ gridTemplateColumns: '32px 2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 1fr 110px' }}
        >
          <div className="p-1 -m-1" onClick={e => { e.stopPropagation(); onToggleSelect(p.id) }}>
            {isSelected 
              ? <CheckSquare className="h-4 w-4 text-teal-600" /> 
              : <Square className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
            }
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1 group/link max-w-full">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm group-hover/link:text-teal-600 dark:group-hover/link:text-teal-400 transition-colors break-words whitespace-normal" style={{ wordBreak: 'break-word' }} dir="auto">
                  {p.name}
                </span>
                <ExternalLink className="h-3 w-3 mt-1 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">Room: {p.room_number}</span>
            </div>
          </div>

          <span className="text-sm text-slate-700 dark:text-slate-300">{p.age}y</span>

          <span className="text-sm text-slate-600 dark:text-slate-400 truncate" dir="auto" title={parseJSONArray(p.chronic_diseases).map((d: any) => d.name).join('، ')}>
            {(parseJSONArray(p.chronic_diseases).length > 0) ? (
              parseJSONArray(p.chronic_diseases).map((d: any) => getAbbrev(d.name)).join('، ')
            ) : <span className="text-muted-foreground italic text-xs">None</span>}
          </span>

          <span className={`text-sm font-medium tabular-nums ${p.lastHba1c != null && p.lastHba1c > 6.5 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
            {p.lastHba1c != null ? `${p.lastHba1c}%` : <span className="text-muted-foreground">—</span>}
          </span>

          <span className={`text-sm font-medium tabular-nums ${p.lastHb != null && p.lastHb < 10 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
            {p.lastHb != null ? p.lastHb : <span className="text-muted-foreground">—</span>}
          </span>

          <span className="text-sm text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
            {p.lastVisit ? format(parseISO(p.lastVisit), 'dd MMM yyyy') : <span className="text-muted-foreground italic text-xs">No visits</span>}
          </span>

          <div className="flex items-center">
            <OverdueTag />
          </div>

          <div className="flex justify-end items-center gap-1" onClick={e => e.stopPropagation()}>
            <AddVisitModal patientId={p.id} variant="icon" />
            <AddInvestigationModal patientId={p.id} variant="icon" />
            <DeletePatientButton patientId={p.id} variant="ghost" />
          </div>
        </div>

        {/* Vitals sub-row — only shown if vitals exist */}
        {(p.lastBpSys || p.lastPr || p.lastSpo2 || p.lastTemp) && (
          <div className="flex items-center gap-2 px-5 pb-3 flex-wrap" onClick={e => e.stopPropagation()}>
            <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-widest mr-1">Vitals</span>
            {p.lastBpSys != null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.lastBpSys > 140 || p.lastBpSys < 90
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>BP {p.lastBpSys}/{p.lastBpDia ?? '?'}</span>
            )}
            {p.lastPr != null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.lastPr > 100 || p.lastPr < 50
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>PR {p.lastPr}</span>
            )}
            {p.lastSpo2 != null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.lastSpo2 < 94
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>SpO2 {p.lastSpo2}%</span>
            )}
            {p.lastTemp != null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.lastTemp > 37.5
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>T {p.lastTemp}°C</span>
            )}
          </div>
        )}
      </div>

      {/* --- Mobile Row --- */}
      <div className="flex flex-col xl:hidden p-4 gap-3 cursor-pointer">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0" onClick={e => { e.stopPropagation(); onToggleSelect(p.id) }}>
              {isSelected 
                ? <CheckSquare className="h-5 w-5 text-teal-600" /> 
                : <Square className="h-5 w-5 text-muted-foreground/30" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 w-full">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-base break-words whitespace-normal" style={{ wordBreak: 'break-word' }} dir="auto">{p.name}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.age}y</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-muted-foreground">Room: {p.room_number}</span>
                <OverdueTag />
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <DeletePatientButton patientId={p.id} variant="ghost" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-8">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Conditions</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={parseJSONArray(p.chronic_diseases).map((d: any) => d.name).join(', ')}>
              {(parseJSONArray(p.chronic_diseases).length > 0) ? (
                parseJSONArray(p.chronic_diseases).map((d: any) => getAbbrev(d.name)).join(', ')
              ) : <span className="text-muted-foreground italic text-xs">None</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Last Visit</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {p.lastVisit ? format(parseISO(p.lastVisit), 'dd MMM yyyy') : <span className="text-muted-foreground italic text-xs">No visits</span>}
            </p>
          </div>

          {/* Labs */}
          <div className="flex gap-4 col-span-2">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">HbA1c</p>
              <p className={`text-xs font-bold tabular-nums ${p.lastHba1c != null && p.lastHba1c > 6.5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {p.lastHba1c != null ? `${p.lastHba1c}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Hb</p>
              <p className={`text-xs font-bold tabular-nums ${p.lastHb != null && p.lastHb < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {p.lastHb != null ? p.lastHb : '—'}
              </p>
            </div>
          </div>

          {/* Vitals row */}
          {(p.lastBpSys || p.lastPr || p.lastSpo2 || p.lastTemp) && (
            <div className="col-span-2 flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              {p.lastBpSys != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.lastBpSys > 140 || p.lastBpSys < 90
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>BP {p.lastBpSys}/{p.lastBpDia ?? '?'}</span>
              )}
              {p.lastPr != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.lastPr > 100 || p.lastPr < 50
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>PR {p.lastPr}</span>
              )}
              {p.lastSpo2 != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.lastSpo2 < 94
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>SpO2 {p.lastSpo2}%</span>
              )}
              {p.lastTemp != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.lastTemp > 37.5
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>T {p.lastTemp}°C</span>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="col-span-2 flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
            <AddVisitModal patientId={p.id} variant="icon" />
            <AddInvestigationModal patientId={p.id} variant="icon" />
          </div>
        </div>
      </div>
    </div>
  )
})
