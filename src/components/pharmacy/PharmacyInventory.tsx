"use client"

import { useState, useEffect } from "react"
import { Package, Search, Plus, ArrowUpDown, Filter, AlertCircle, Edit, Trash2, ArrowLeft, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { format, addDays } from "date-fns"
import { toast } from "sonner"
import { useDatabase } from "@/hooks/useDatabase"
import { createClient } from "@/lib/supabase"
import { exportPharmacyInventoryToExcel, exportPharmacyInventoryToDoc } from "@/lib/pharmacy-export-utils"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function PharmacyInventory() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")
  const [inventory, setInventory] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [sortColumn, setSortColumn] = useState("generic_name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [deptFilter, setDeptFilter] = useState("All")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortOrder("asc")
    }
  }

  useEffect(() => {
    if (filterParam === "low") setFilterLowStock(true)
    if (filterParam === "expiring") setFilterExpiring(true)
  }, [filterParam])

  const { profile } = useDatabase()
  const supabase = createClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    scientific_name: "",
    generic_name: "",
    dosage: "",
    formulation: "",
    mode_of_administration: "",
    quantity: 0,
    min_stock_level: 0,
    expiration_date: "",
    manufacturer: "",
    batch_number: "",
    price: 0,
    department: "Ward",
    category: "General"
  })

  const fetchInventory = async () => {
    setLoading(true)
    let query = (supabase as any).from("pharmacy_inventory").select("*")

    if (search) {
      query = query.or(`scientific_name.ilike.%${search}%,generic_name.ilike.%${search}%`)
    }

    const { data, error } = await query.order(sortColumn, { ascending: sortOrder === "asc" })

    if (error) toast.error(error.message)
    else {
      let results = data || []
      if (filterLowStock) {
        results = results.filter((item: any) => 
          item.quantity !== null && 
          item.min_stock_level !== null && 
          item.quantity <= item.min_stock_level
        )
      }
      if (filterExpiring) {
        const soon = new Date()
        soon.setMonth(soon.getMonth() + 6)
        results = results.filter((item: any) => {
          if (!item.expiration_date) return false
          const exp = new Date(item.expiration_date)
          return exp >= new Date() && exp <= soon
        })
      }
      if (categoryFilter !== "All") {
        results = results.filter((item: any) => item.category === categoryFilter)
      }
      if (deptFilter !== "All") {
        results = results.filter((item: any) => (item.department || "Ward") === deptFilter)
      }
      setInventory(results)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInventory()
  }, [search, filterLowStock, filterExpiring, sortColumn, sortOrder, categoryFilter, deptFilter])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This item will be moved to the Recycle Bin.")) return
    const { error } = await (supabase as any).from("pharmacy_inventory").delete().eq("id", id)
    if (error) toast.error(error.message)
    else {
      toast.success("Item deleted")
      fetchInventory()
    }
  }

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        scientific_name: item.scientific_name || "",
        generic_name: item.generic_name || "",
        dosage: item.dosage || "",
        formulation: item.formulation || "",
        mode_of_administration: item.mode_of_administration || "",
        quantity: item.quantity || 0,
        min_stock_level: item.min_stock_level || 0,
        expiration_date: item.expiration_date || "",
        manufacturer: item.manufacturer || "",
        batch_number: item.batch_number || "",
        price: item.price || 0,
        department: item.department || "Ward",
        category: item.category || "General"
      })
    } else {
      setEditingItem(null)
      setFormData({
        scientific_name: "",
        generic_name: "",
        dosage: "",
        formulation: "",
        mode_of_administration: "",
        quantity: 0,
        min_stock_level: 0,
        expiration_date: "",
        manufacturer: "",
        batch_number: "",
        price: 0,
        department: "Ward",
        category: "General"
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.scientific_name) {
      toast.error("Scientific name is required")
      return
    }

    const payload = {
      ...formData,
      quantity: Number(formData.quantity) || 0,
      min_stock_level: Number(formData.min_stock_level) || 0,
      price: Number(formData.price) || 0,
      expiration_date: formData.expiration_date || null,
      pharmacist_name: profile?.pharmacist_name || "System"
    }

    let error;
    if (editingItem) {
      const { error: err } = await (supabase as any)
        .from("pharmacy_inventory")
        .update(payload)
        .eq("id", editingItem.id)
      error = err
    } else {
      const { error: err } = await (supabase as any)
        .from("pharmacy_inventory")
        .insert(payload)
      error = err
    }

    if (error) {
      console.error("PharmacyInventory: Database Error (Details)", {
        raw: JSON.stringify(error),
        message: error.message,
        code: error.code,
        details: error.details
      })
      toast.error(`Database Error: ${error.message || 'Access Denied'}. (Code: ${error.code || 'RLS'})`)
    } else {
      toast.success(editingItem ? "Drug updated successfully" : "Drug added to inventory")
      setIsModalOpen(false)
      fetchInventory()
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link 
            href="/pharmacy"
            className="inline-flex items-center text-slate-400 font-bold mb-4 hover:text-slate-600 transition-colors"
          >
             <ArrowLeft className="mr-2 h-4 w-4" />
             BACK TO CENTRAL
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <Package className="h-10 w-10 text-teal-600" />
            STOCKS & INVENTORY
            <Badge variant="outline" className="ml-2 bg-slate-50 text-[10px] uppercase font-black tracking-widest border-slate-200">
               Role: {profile?.role || "Checking..."}
            </Badge>
          </h1>
          {profile?.pharmacist_name && (
            <div className="flex items-center gap-2 mt-4 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                 Acting Pharmacist: <span className="text-slate-900 dark:text-white">{profile.pharmacist_name}</span>
               </p>
               <button 
                onClick={() => {
                  sessionStorage.removeItem('pharmacist_sessionActive')
                  window.location.reload()
                }}
                className="ml-2 text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase underline underline-offset-2 decoration-2"
               >
                 Switch
               </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className={`rounded-2xl border-slate-200 dark:border-slate-800 font-bold transition-all flex-1 sm:flex-none text-xs sm:text-sm h-10 sm:h-11 ${filterLowStock ? 'bg-orange-50 border-orange-200 text-orange-600' : ''}`} 
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            <Filter className={`mr-2 h-3 w-3 sm:h-4 sm:w-4 ${filterLowStock ? 'fill-orange-500' : ''}`} />
            {filterLowStock ? 'SHOWING LOW' : 'LOW STOCK'}
          </Button>
          <Button 
            variant="outline" 
            className={`rounded-2xl border-slate-200 dark:border-slate-800 font-bold transition-all flex-1 sm:flex-none text-xs sm:text-sm h-10 sm:h-11 ${filterExpiring ? 'bg-rose-50 border-rose-200 text-rose-600' : ''}`} 
            onClick={() => setFilterExpiring(!filterExpiring)}
          >
            <Clock className={`mr-2 h-3 w-3 sm:h-4 sm:w-4 ${filterExpiring ? 'fill-rose-500' : ''}`} />
            {filterExpiring ? 'SHOWING EXP.' : 'EXPIRING'}
          </Button>
          <div className="h-11 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
          <Button 
            variant="outline" 
            className="rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold border-none h-11 px-6 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
            onClick={() => exportPharmacyInventoryToExcel(inventory, categoryFilter !== 'All' ? categoryFilter : (deptFilter !== 'All' ? deptFilter : 'Full'))}
          >
            Export EXCEL
          </Button>
          <Button 
            variant="outline" 
            className="rounded-2xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 font-bold border border-teal-200 dark:border-teal-800 h-11 px-6 active:scale-95 transition-all"
            onClick={() => exportPharmacyInventoryToDoc(inventory, categoryFilter !== 'All' ? categoryFilter : (deptFilter !== 'All' ? deptFilter : 'Registry'))}
          >
            Export DOC
          </Button>
          <Button 
            className="rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black px-4 sm:px-6 shadow-xl shadow-teal-500/20 active:scale-95 transition-all w-full sm:w-auto mt-2 sm:mt-0 h-11"
            onClick={() => handleOpenModal()}
          >
            <Plus className="mr-2 h-4 w-4" />
            ADD MANUAL
          </Button>
        </div>
      </div>

      {/* Navigation and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group max-w-2xl flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by generic or scientific name..." 
            className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-lg focus:ring-2 focus:ring-teal-500 transition-all shadow-lg"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 min-w-fit">
           <select 
             value={deptFilter}
             onChange={e => setDeptFilter(e.target.value)}
             className="h-14 px-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold text-sm focus:border-teal-500 transition-all outline-none"
           >
             <option value="All uppercase">All Depts</option>
             <option value="Ward">Ward Only</option>
             <option value="ER">ER Only</option>
           </select>

           <select 
             value={categoryFilter}
             onChange={e => setCategoryFilter(e.target.value)}
             className="h-14 px-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold text-sm focus:border-teal-500 transition-all outline-none"
           >
             <option value="All">All Categories</option>
             {["Antibiotics", "Analgesic", "Psychotic", "Eye drops", "Fluids", "Creams", "Cardiovascular", "Gastrointestinal", "Respiratory"].map(cat => (
               <option key={cat} value={cat}>{cat}</option>
             ))}
           </select>
        </div>
      </div>

      {/* Table Container */}
      <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <CardContent className="p-0">
           {loading ? (
             <div className="p-20 text-center font-black animate-pulse uppercase italic tracking-widest text-slate-400">Syncing with drug database...</div>
           ) : inventory.length === 0 ? (
             <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 opacity-20" />
                <p className="font-bold italic">No internal inventory records found matching your search.</p>
             </div>
           ) : (
              <>
                {/* Mobile View: Rich Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-900">
                  {inventory.map((item) => {
                    const isLow = item.quantity <= item.min_stock_level
                    return (
                      <div key={item.id} className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-900 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xl leading-tight">
                               {item.generic_name || item.scientific_name}
                             </h3>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.dosage}</p>
                             <p className="text-sm font-medium italic text-slate-500 dark:text-slate-400 mt-1">{item.scientific_name}</p>
                          </div>
                          <div className="text-right">
                             <div className={`text-3xl font-black ${isLow ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                                {item.quantity}
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                           <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] rounded-lg border-none">
                              {item.formulation || "Tab"}
                           </Badge>
                           <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase font-black text-[10px] rounded-lg border-none">
                              {item.mode_of_administration || "Oral"}
                           </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-900">
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiration</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                 {item.expiration_date ? format(new Date(item.expiration_date), "MMM yyyy") : "N/A"}
                              </p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pharmacist</p>
                              <p className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase">
                                 {item.pharmacist_name || "System"}
                              </p>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <Button 
                             className="flex-1 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 font-black h-12"
                             onClick={() => handleOpenModal(item)}
                           >
                              <Edit className="h-4 w-4 mr-2" />
                              EDIT RECORD
                           </Button>
                           <Button 
                             variant="outline"
                             className="rounded-xl border-rose-100 text-rose-500 h-12 w-12 flex items-center justify-center p-0"
                             onClick={() => handleDelete(item.id)}
                           >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop View: Traditional Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("generic_name")}
                        >
                           <div className="flex items-center gap-1.5">
                             Medicine & Dosage {sortColumn === "generic_name" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("scientific_name")}
                        >
                           <div className="flex items-center gap-1.5">
                             Scientific Name {sortColumn === "scientific_name" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("formulation")}
                        >
                           <div className="flex items-center gap-1.5">
                             Form / Admin {sortColumn === "formulation" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("quantity")}
                        >
                           <div className="flex items-center gap-1.5">
                             Qty {sortColumn === "quantity" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("expiration_date")}
                        >
                           <div className="flex items-center gap-1.5">
                             Expiry {sortColumn === "expiration_date" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th 
                          className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/h"
                          onClick={() => handleSort("pharmacist_name")}
                        >
                           <div className="flex items-center gap-1.5">
                             Pharmacist Signature {sortColumn === "pharmacist_name" && <ArrowUpDown className="h-3 w-3 text-teal-500" />}
                           </div>
                        </th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dept/Cat</th>
                        <th className="px-8 py-4 text-right pr-12 text-[10px] font-black uppercase tracking-widest text-slate-400">Manage Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {inventory.map((item) => {
                        const isLow = item.quantity <= item.min_stock_level
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                            <td className="px-8 py-6">
                               <div className="space-y-1">
                                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                                     {item.generic_name || item.scientific_name}
                                  </p>
                                  <p className="text-xs font-bold text-slate-400 uppercase">{item.dosage}</p>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-sm font-medium italic text-slate-500 dark:text-slate-400">{item.scientific_name}</p>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex gap-2">
                                  <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[9px] px-2 py-0.5 rounded-md border-none">
                                     {item.formulation || "Tab"}
                                  </Badge>
                                  <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase font-black text-[9px] px-2 py-0.5 rounded-md border-none">
                                     {item.mode_of_administration || "Oral"}
                                  </Badge>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex flex-col">
                                  <span className={`text-2xl font-black ${isLow ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                     {item.quantity}
                                  </span>
                                  {isLow && <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter italic animate-pulse">Low Stock</span>}
                               </div>
                            </td>
                            <td className="px-8 py-6 font-mono text-sm font-bold text-slate-600 dark:text-slate-400">
                               {item.expiration_date ? format(new Date(item.expiration_date), "MMM yyyy") : "---"}
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                     {item.pharmacist_name || "Auto System"}
                                   </p>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="space-y-1">
                                   <Badge className="block w-fit bg-teal-50 dark:bg-teal-900/20 text-teal-600 border-none text-[9px] font-black">{item.department || "Ward"}</Badge>
                                   <Badge variant="outline" className="block w-fit text-[9px] font-black opacity-60 uppercase">{item.category || "General"}</Badge>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-right pr-8">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600"
                                    onClick={() => handleOpenModal(item)}
                                  >
                                     <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500" onClick={() => handleDelete(item.id)}>
                                     <Trash2 className="h-4 w-4" />
                                  </Button>
                               </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
           )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl w-full max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
          <div className="bg-linear-to-br from-teal-600 to-teal-800 p-6 sm:p-10 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">
                {editingItem ? "Edit Drug Formulation" : "Add New Drug Manual"}
              </DialogTitle>
              <DialogDescription className="text-teal-100 font-medium">
                Enter precise details for inventory tracking and clinical dispensing.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Scientific Name *</Label>
                <Input 
                  value={formData.scientific_name} 
                  onChange={e => setFormData({...formData, scientific_name: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  placeholder="e.g. Paracetamol"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Generic/Brand Name</Label>
                <Input 
                  value={formData.generic_name} 
                  onChange={e => setFormData({...formData, generic_name: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  placeholder="e.g. Panadol"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Dosage</Label>
                <Input 
                  value={formData.dosage} 
                  onChange={e => setFormData({...formData, dosage: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  placeholder="e.g. 500mg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Formulation</Label>
                <Input 
                  value={formData.formulation} 
                  onChange={e => setFormData({...formData, formulation: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  placeholder="e.g. Tablet"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Administration</Label>
                <Input 
                  value={formData.mode_of_administration} 
                  onChange={e => setFormData({...formData, mode_of_administration: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  placeholder="e.g. Oral"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Expiration Date</Label>
                <Input 
                  type="date"
                  value={formData.expiration_date} 
                  onChange={e => setFormData({...formData, expiration_date: e.target.value})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Qty</Label>
                <Input 
                  type="number"
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Min. Stock Level</Label>
                <Input 
                  type="number"
                  value={formData.min_stock_level} 
                  onChange={e => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})}
                  className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Primary Department</Label>
                <select 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  className="w-full h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Ward">Ward</option>
                  <option value="ER">ER</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Drug Category</Label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {["Antibiotics", "Analgesic", "Psychotic", "Eye drops", "Fluids", "Creams", "Cardiovascular", "Gastrointestinal", "Respiratory", "General"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-6 pb-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="w-full sm:w-auto rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black px-8 h-12 order-1 sm:order-2">
                {editingItem ? "UPDATE STOCK" : "SAVE TO INVENTORY"}
              </Button>
              <Button type="button" variant="ghost" className="w-full sm:w-auto rounded-xl font-bold h-12 order-2 sm:order-1" onClick={() => setIsModalOpen(false)}>
                CANCEL
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
