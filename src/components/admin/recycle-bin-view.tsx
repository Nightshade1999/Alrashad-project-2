"use client"

import { useState, useEffect } from 'react'
import { 
  Trash2, 
  RefreshCcw, 
  Search, 
  User, 
  FlaskConical, 
  Stethoscope, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Pill,
  ClipboardList
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  getTrashItemsAction, 
  restoreFromTrashAction, 
  permanentlyDeleteFromTrashAction,
  bulkRestoreFromTrashAction,
  bulkPermanentlyDeleteFromTrashAction
} from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

type TrashItem = {
  id: string
  table_name: string
  data: any
  original_id: string
  deleted_by_name: string
  deleted_by_id: string
  deleted_at: string
}

export function RecycleBinView() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'patients' | 'investigations' | 'visits' | 'nurse_instructions' | 'pharmacy_inventory' | 'referrals'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const fetchTrash = async () => {
    setLoading(true)
    const res = await getTrashItemsAction()
    if (res.data) setItems(res.data)
    else if (res.error) toast.error(res.error)
    setLoading(false)
  }

  useEffect(() => {
    fetchTrash()
  }, [])

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this record to its original location?')) return
    setProcessingId(id)
    try {
      const res = await restoreFromTrashAction(id)
      if (res.success) {
        toast.success('Record restored successfully')
        fetchTrash()
      } else {
        toast.error(res.error || 'Failed to restore')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Restore ${selectedIds.size} records?`)) return
    setIsBulkProcessing(true)
    try {
      const res = await bulkRestoreFromTrashAction(Array.from(selectedIds))
      if (res.success) {
        toast.success(`${selectedIds.size} records restored`)
        setSelectedIds(new Set())
        fetchTrash()
      } else toast.error(res.error || 'Bulk restore failed')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`PERMANENTLY DELETE ${selectedIds.size} records? This cannot be undone.`)) return
    setIsBulkProcessing(true)
    try {
      const res = await bulkPermanentlyDeleteFromTrashAction(Array.from(selectedIds))
      if (res.success) {
        toast.success(`${selectedIds.size} records deleted`)
        setSelectedIds(new Set())
        fetchTrash()
      } else toast.error(res.error || 'Bulk delete failed')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('PERMANENTLY DELETE this record? This cannot be undone and clinical data will be lost forever.')) return
    setProcessingId(id)
    try {
      const res = await permanentlyDeleteFromTrashAction(id)
      if (res.success) {
        toast.success('Record permanently deleted')
        fetchTrash()
      } else {
        toast.error(res.error || 'Failed to delete')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = JSON.stringify(item.data).toLowerCase().includes(search.toLowerCase()) ||
                          item.deleted_by_name.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = activeCategory === 'all' || item.table_name === activeCategory

    return matchesSearch && matchesCategory
  })

  const getTableIcon = (table: string) => {
    switch (table) {
      case 'patients': return <User className="h-4 w-4" />
      case 'investigations': return <FlaskConical className="h-4 w-4" />
      case 'visits': return <Stethoscope className="h-4 w-4" />
      case 'nurse_instructions': return <ClipboardList className="h-4 w-4" />
      case 'pharmacy_inventory': return <Pill className="h-4 w-4" />
      case 'referrals': return <ExternalLink className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTableColor = (table: string) => {
    switch (table) {
      case 'patients': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'investigations': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
      case 'visits': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      case 'nurse_instructions': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'pharmacy_inventory': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'referrals': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const getTableLabel = (table: string) => {
    switch (table) {
      case 'investigations': return 'LABORATORY'
      case 'nurse_instructions': return 'NURSING'
      case 'pharmacy_inventory': return 'PHARMACY'
      default: return table.toUpperCase()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search deleted records..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-2xl"
          />
        </div>
        
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto">
          {(['all', 'patients', 'investigations', 'visits', 'nurse_instructions', 'pharmacy_inventory', 'referrals'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setSelectedIds(new Set())
              }}
              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                activeCategory === cat 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat === 'investigations' ? 'Labs' : 
               cat === 'nurse_instructions' ? 'Nursing' :
               cat === 'pharmacy_inventory' ? 'Pharmacy' : 
               cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl shadow-sm">
           <div className="flex items-center gap-4">
             <Button
               variant="ghost"
               size="sm"
               onClick={toggleSelectAll}
               className="text-[10px] font-black uppercase tracking-widest text-indigo-600"
             >
               {selectedIds.size === filteredItems.length ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
               {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
             </Button>
             {selectedIds.size > 0 && (
               <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                 {selectedIds.size} items selected
               </span>
             )}
           </div>

           {selectedIds.size > 0 && (
             <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkProcessing}
                  onClick={handleBulkRestore}
                  className="h-8 rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase px-4"
                >
                  <RefreshCcw className={`h-3 w-3 mr-1 ${isBulkProcessing ? 'animate-spin' : ''}`} /> Restore Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkProcessing}
                  onClick={handleBulkDelete}
                  className="h-8 rounded-xl border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase px-4"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete Permanently
                </Button>
             </div>
           )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-[2rem] bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <Trash2 className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
           <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Recycle Bin is Empty</p>
           <p className="text-xs text-slate-400 mt-1">No deleted records matching your filters were found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card 
              key={item.id} 
              className={`overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 ${expandedId === item.id ? 'ring-2 ring-indigo-500' : ''}`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-start gap-3">
                   <button 
                     onClick={() => toggleSelect(item.id)}
                     className={`mt-1 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${selectedIds.has(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                   >
                     {selectedIds.has(item.id) && <CheckSquare className="h-3.5 w-3.5" />}
                   </button>
                   <div className="space-y-1">
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${getTableColor(item.table_name)}`}>
                        {getTableIcon(item.table_name)}
                        {getTableLabel(item.table_name)}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
                         {item.table_name === 'patients' ? item.data.name : 
                          item.table_name === 'investigations' ? (item.data.wbc ? `WBC: ${item.data.wbc}` : 'Lab Result') :
                          item.table_name === 'nurse_instructions' ? 'Instruction' :
                          item.table_name === 'pharmacy_inventory' ? item.data.scientific_name :
                          item.table_name === 'visits' ? 'Doctor Visit' : 'Record'}
                      </h4>
                   </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(item.deleted_at), 'dd MMM HH:mm')}
                  </div>
                </div>
              </div>

              {/* Data Summary */}
              <div className="p-5 space-y-3">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deleted By</p>
                   <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.deleted_by_name}</p>
                 </div>

                 {expandedId === item.id ? (
                   <div className="animate-in fade-in slide-in-from-top-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Record Data</p>
                     <div className="bg-slate-900 p-4 rounded-2xl overflow-auto max-h-48 text-[10px] font-mono text-emerald-400 no-scrollbar">
                       <pre>{JSON.stringify(item.data, null, 2)}</pre>
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-wrap gap-1.5 line-clamp-2">
                      {Object.entries(item.data).slice(0, 4).map(([key, val]) => (
                        val && typeof val !== 'object' && (
                          <Badge key={key} variant="outline" className="text-[9px] font-medium border-slate-200 dark:border-slate-700">
                            {key}: {String(val)}
                          </Badge>
                        )
                      ))}
                   </div>
                 )}
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                   className="text-[10px] font-black uppercase text-slate-500 tracking-tighter hover:bg-slate-200 dark:hover:bg-slate-800"
                 >
                   {expandedId === item.id ? <><ChevronUp className="h-3 w-3 mr-1" /> Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> More Details</>}
                 </Button>

                 <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={processingId === item.id}
                      onClick={() => handleRestore(item.id)}
                      className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase px-4 shadow-lg shadow-emerald-500/10"
                    >
                      <RefreshCcw className={`h-3 w-3 mr-1 ${processingId === item.id ? 'animate-spin' : ''}`} /> Restore
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={processingId === item.id}
                      onClick={() => handlePermanentDelete(item.id)}
                      className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${processingId === item.id ? 'animate-pulse' : ''}`} />
                    </Button>
                 </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
