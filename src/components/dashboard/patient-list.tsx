"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, UserRound, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DeletePatientButton } from '@/components/patient/delete-button'
import { format, parseISO } from 'date-fns'

export interface PatientRow {
  id: string
  name: string
  age: number
  ward_number: string
  chronic_diseases: string | null
  lastHba1c: number | null
  lastHb: number | null
  lastVisit: string | null
}

type SortKey = 'name' | 'age' | 'chronic_diseases' | 'lastHba1c' | 'lastHb' | 'lastVisit'

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
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSort === 'lastVisit' ? 'asc' : 'asc')

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
      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, bed, or disease..."
          className="pl-10 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm focus-visible:ring-teal-500"
        />
      </div>

      {/* List */}
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
            style={{ gridTemplateColumns: '2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 2rem' }}
          >
            <SortableHeader label="Patient" col="name" {...headerProps} />
            <SortableHeader label="Age" col="age" {...headerProps} />
            <SortableHeader label="Chronic Disease" col="chronic_diseases" {...headerProps} />
            <SortableHeader label="HbA1c" col="lastHba1c" {...headerProps} />
            <SortableHeader label="Hb" col="lastHb" {...headerProps} />
            <SortableHeader label="Last Visit" col="lastVisit" {...headerProps} />
            <span />
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
                  className="group grid items-center gap-4 px-5 py-4 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors cursor-pointer"
                  style={{ gridTemplateColumns: '2fr 0.6fr 2fr 0.8fr 0.7fr 1.4fr 2rem' }}
                  onClick={handleRowClick}
                >
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
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {p.lastVisit
                      ? format(parseISO(p.lastVisit), 'dd MMM yyyy')
                      : <span className="text-muted-foreground italic text-xs">No visits</span>
                    }
                  </span>

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
