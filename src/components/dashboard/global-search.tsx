"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, User, BedDouble, ArrowRight, AlertCircle, Loader2, Globe } from 'lucide-react'
import Link from 'next/link'
import { searchAllPatientsAction } from '@/app/actions/admin-actions'
import { convertArabicNumbers } from '@/lib/utils'

interface GlobalPatient {
  id: string
  name: string
  age: number
  room_number: string | null
  ward_name: string | null
  category: string
  is_in_er: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  'High Risk': 'text-red-500',
  'Close Follow-up': 'text-amber-500',
  'Normal': 'text-emerald-500',
  'Deceased/Archive': 'text-slate-400',
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalPatient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await searchAllPatientsAction(q)
      setResults(result.patients || [])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setIsOpen(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (!val.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      doSearch(convertArabicNumbers(val))
    }, 400)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-indigo-400" />
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Global search — find any patient across all wards by name..."
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="w-full pl-14 pr-12 h-13 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 animate-spin" />
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              <span>Searching all wards...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Global Results ({results.length})
                </span>
                <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">All Wards</span>
              </div>
              {results.map(p => (
                <Link key={p.id} href={`/patient/${p.id}`} onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <div className={`p-2 rounded-lg ${p.is_in_er ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                      {p.is_in_er ? <AlertCircle className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <BedDouble className="h-3 w-3 shrink-0" />
                        <span>{p.ward_name || 'Unknown Ward'}</span>
                        {p.room_number && <><span>·</span><span>Room {p.room_number}</span></>}
                        <span>·</span>
                        <span className={CATEGORY_COLORS[p.category] || 'text-slate-500'}>
                          {p.category}
                        </span>
                        {p.is_in_er && (
                          <span className="text-rose-500 font-bold">· IN ER</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No patients found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching with the patient's full or partial name.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
