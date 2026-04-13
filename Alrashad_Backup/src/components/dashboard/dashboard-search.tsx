"use client"

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, User, BedDouble, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { convertArabicNumbers } from '@/lib/utils'

interface PatientSearchItem {
  id: string
  name: string
  room_number: string | null
  category: string
}

export function DashboardSearch({ patients }: { patients: PatientSearchItem[] }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredPatients = useMemo(() => {
    if (!query.trim()) return []
    const convertedQuery = convertArabicNumbers(query.toLowerCase())
    const q = convertedQuery.toLowerCase()
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.room_number?.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [query, patients])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative max-w-lg w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name or room..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg focus-visible:ring-teal-500 rounded-xl"
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredPatients.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Matching Patients ({filteredPatients.length})
              </div>
              {filteredPatients.map(p => (
                <Link key={p.id} href={`/patient/${p.id}`} onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BedDouble className="h-3 w-3" />
                        <span>Room {p.room_number || 'N/A'}</span>
                        <span>•</span>
                        <span className={
                          p.category === 'High Risk' ? 'text-red-500 font-medium' :
                          p.category === 'Close Follow-up' ? 'text-amber-500 font-medium' :
                          'text-emerald-500 font-medium'
                        }>{p.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No patients found matches "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1 text-balance px-4 text-center">Try searching for the exact full name or the room number.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
