"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Beaker, Plus, History, Trash2, Edit2, Check, X, AlertCircle, AlertTriangle, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { format, differenceInHours } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Droplet, FileText, Microscope } from "lucide-react"
import { GueReportView } from "./GueReportView"

const DEFAULT_GUE = {
  color: "Straw",
  appearance: "Clear",
  ph: "6.0",
  sp_gravity: "1.020",
  sugar: "Nil",
  protein: "Nil",
  ketone: "Nil",
  pus_cells: "2-4",
  rbcs: "0-2",
  epithelial: "Common",
  casts: "Nil",
  crystals: "Nil",
  bacteria: "Nil",
  others: ""
};

export function LabPatientDetail({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [currentTech, setCurrentTech] = useState<{ id: string, name: string } | null>(null)
  const [labRanges, setLabRanges] = useState<any[]>([])
  const [showGUEForm, setShowGUEForm] = useState(false)
  const [gueApplied, setGueApplied] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [viewingGUE, setViewingGUE] = useState<any | null>(null)
  const [formData, setFormData] = useState<any>({
    wbc: "", hb: "", plt: "", s_urea: "", s_creatinine: "", ast: "", alt: "", alp: "", tsb: "", 
    hba1c: "", rbs: "", ldl: "", hdl: "", tg: "", esr: "", crp: "", 
    ka: "", na: "", cl: "", ca: "",
    other_labs: [{ name: '', value: '' }],
    is_er: false, is_critical: false,
    gue: { ...DEFAULT_GUE }
  })

  // Clinical Range Validation Logic
  const isOutOfRange = (key: string, value: string) => {
    if (!value || value === "") return false;
    const val = Number(value);
    if (isNaN(val)) return false;

    const range = labRanges.find(r => r.key === key);
    if (!range) return false;
    
    if (range.min_value !== null && val < range.min_value) return true;
    if (range.max_value !== null && val > range.max_value) return true;
    return false;
  }

  const getRangeInfo = (key: string) => {
    const range = labRanges.find(r => r.key === key);
    if (!range) return { label: key.toUpperCase(), range: "", unit: "" };
    
    let rangeStr = "";
    if (range.min_value !== null && range.max_value !== null) {
      rangeStr = `${range.min_value}-${range.max_value}`;
    } else if (range.min_value !== null) {
      rangeStr = `Min ${range.min_value}`;
    } else if (range.max_value !== null) {
      rangeStr = `Max ${range.max_value}`;
    }
    
    return {
      label: range.label,
      range: rangeStr,
      unit: range.unit || ""
    };
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = async () => {
    setIsLoading(true)
    // Basic patient info
    const { data: pData } = await supabase
      .from("patients")
      .select("id, name, age, ward_name, is_in_er")
      .eq("id", patientId)
      .single()
    
    // Lab history (specifically investigations)
    const { data: hData } = await supabase
      .from("investigations")
      .select("*")
      .eq("patient_id", patientId)
      .not("lab_tech_id", "is", null)
      .order("date", { ascending: false })

    if (pData) setPatient(pData)
    if (hData) setHistory(hData)

    // Fetch Lab Ranges
    const { data: rData } = await supabase
      .from("lab_reference_ranges")
      .select("*")
    if (rData) setLabRanges(rData)

    // Fetch current user profile if not already fetched
    if (!currentTech) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let techName = localStorage.getItem('labTech_lastTechName')
        
        if (!techName) {
            const { data: profile } = await supabase
            .from("user_profiles")
            .select("lab_tech_name")
            .eq("user_id", user.id)
            .single()
            techName = profile?.lab_tech_name || null
        }
        
        if (techName) {
          setCurrentTech({ id: user.id, name: techName })
        }
      }
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [patientId])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const processedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => {
        // Skip non-numeric fields & handle specialized JSON formats
        if (k === 'gue' || k === 'is_er' || k === 'is_critical' || k === 'other_labs') {
          if (k === 'gue') return [k, gueApplied ? v : null];
          if (k === 'other_labs') {
            return [k, Array.isArray(v) ? v.filter(l => l.name.trim() !== "" || l.value.trim() !== "") : []];
          }
          return [k, v];
        }
        
        // Handle numeric fields (including CRP)
        const trimmed = typeof v === 'string' ? v.trim() : v;
        if (trimmed === "" || trimmed === null || trimmed === undefined) return [k, null];
        
        const num = Number(trimmed);
        return [k, isNaN(num) ? null : num];
      })
    )

    // Override is_er with the actual patient status
    processedData.is_er = patient?.is_in_er || false;

    let result;
    if (editingRecordId) {
      result = await supabase
        .from("investigations")
        .update(processedData)
        .eq("id", editingRecordId);
    } else {
      result = await supabase
        .from("investigations")
        .insert({
          patient_id: patientId,
          ...processedData,
          date: new Date().toISOString(),
          lab_tech_id: currentTech?.id || null,
          lab_tech_name: currentTech?.name || localStorage.getItem('labTech_lastTechName') || null
        });
    }

    if (result.error) {
      toast.error(`Error: ${result.error.message}`)
    } else {
      toast.success(editingRecordId ? "Investigation updated successfully" : "Investigation added successfully")
      setIsAdding(false)
      setEditingRecordId(null)
      setFormData({
        wbc: "", hb: "", plt: "", s_urea: "", s_creatinine: "", ast: "", alt: "", alp: "", tsb: "", 
        hba1c: "", rbs: "", ldl: "", hdl: "", tg: "", esr: "", crp: "", 
        ka: "", na: "", cl: "", ca: "",
        other_labs: [{ name: '', value: '' }],
        is_er: false, is_critical: false,
        gue: { ...DEFAULT_GUE }
      })
      setShowGUEForm(false)
      setGueApplied(false)
      fetchData()
    }
  }

  const handleEdit = (record: any) => {
    // Populate form with existing data
    setFormData({
      wbc: record.wbc?.toString() || "",
      hb: record.hb?.toString() || "",
      plt: record.plt?.toString() || "",
      s_urea: record.s_urea?.toString() || "",
      s_creatinine: record.s_creatinine?.toString() || "",
      ast: record.ast?.toString() || "",
      alt: record.alt?.toString() || "",
      alp: record.alp?.toString() || "",
      tsb: record.tsb?.toString() || "",
      hba1c: record.hba1c?.toString() || "",
      rbs: record.rbs?.toString() || "",
      ldl: record.ldl?.toString() || "",
      hdl: record.hdl?.toString() || "",
      tg: record.tg?.toString() || "",
      esr: record.esr?.toString() || "",
      crp: record.crp?.toString() || "",
      ka: record.ka?.toString() || "",
      na: record.na?.toString() || "",
      cl: record.cl?.toString() || "",
      ca: record.ca?.toString() || "",
      other_labs: Array.isArray(record.other_labs) && record.other_labs.length > 0 
        ? record.other_labs 
        : [{ name: '', value: '' }],
      is_er: record.is_er || false,
      is_critical: record.is_critical || false,
      gue: record.gue || { ...DEFAULT_GUE }
    });
    
    setEditingRecordId(record.id);
    setGueApplied(!!record.gue);
    setShowGUEForm(!!record.gue);
    setIsAdding(true);
  };

  const canModify = (createdAt: string) => {
    return differenceInHours(new Date(), new Date(createdAt)) < 24
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will be moved to the Admin Recycle Bin.")) return;
    
    const { error } = await supabase.from("investigations").delete().eq("id", id)
    if (error) toast.error(error.message)
    else {
      toast.success("Deleted successfully")
      fetchData()
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse text-teal-600">LOADING PATIENT FILE...</div>
  if (!patient) return <div className="p-20 text-center text-red-500 font-black">PATIENT NOT FOUND</div>

  if (viewingGUE) {
    return <GueReportView data={viewingGUE} onBack={() => setViewingGUE(null)} />
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          BACK TO SEARCH
        </Button>
        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Patient ID: {patient.id.slice(0, 8)}
        </Badge>
      </div>

      {/* Patient Header Card */}
      <Card className="rounded-[2.5rem] border-white/20 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="h-2 bg-linear-to-r from-teal-500 to-indigo-500" />
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white" dir="auto">
                {patient.name}
              </h1>
              <div className="flex gap-4">
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black px-4 py-1.5 rounded-full text-sm uppercase">
                  Age: {patient.age === -1 ? "N/A" : patient.age}
                </Badge>
                <Badge className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-black px-4 py-1.5 rounded-full text-sm uppercase border-teal-200 dark:border-teal-800">
                  Ward: {patient.ward_name}
                </Badge>
              </div>
            </div>
            <Button 
               size="lg" 
               className="rounded-3xl bg-teal-600 hover:bg-teal-500 text-white font-black h-16 px-8 shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
               onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-6 w-6" />
              ADD NEW INVESTIGATION
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form (if active) or Summary */}
        <div className="lg:col-span-2 space-y-6">
          {isAdding ? (
            <Card className="rounded-[2rem] shadow-xl border-teal-200 dark:border-teal-900/50 bg-teal-50/10 dark:bg-teal-900/5 animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="p-8 border-b border-teal-100 dark:border-teal-900/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black text-teal-700 dark:text-teal-400 flex items-center gap-2 uppercase tracking-tight">
                    <Beaker className="h-6 w-6" />
                    New Lab Results
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsAdding(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleAddSubmit} className="space-y-10">
                  {/* Priority & Toggles */}
                  <div className="grid grid-cols-1 gap-4 pb-4">
                    <div className={cn(
                      "flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-500 cursor-pointer",
                      formData.is_critical 
                        ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/50 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/20 animate-pulse" 
                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                    )} onClick={() => setFormData({...formData, is_critical: !formData.is_critical})}>
                      <div className="space-y-1">
                        <Label className={cn("text-xs font-black uppercase leading-none", formData.is_critical ? "text-rose-600" : "text-slate-600")}>Critical Value Alert</Label>
                        <p className="text-[10px] font-medium text-slate-500 leading-tight">Enable to prioritize in Clinical Dashboard.</p>
                      </div>
                      <div className={cn(
                        "h-6 w-11 rounded-full p-1 transition-colors duration-200 relative",
                        formData.is_critical ? "bg-rose-600" : "bg-slate-300 dark:bg-slate-700"
                      )}>
                        <div className={cn(
                          "h-4 w-4 bg-white rounded-full shadow-sm transition-transform duration-200 transform",
                          formData.is_critical ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </div>
                  </div>
                  {/* Station 1: Hematology */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Hematology</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Complete Blood Count & Inflammatory Markers</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('wbc').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('wbc').range} {getRangeInfo('wbc').unit}</span>
                        </div>
                        <Input 
                          type="number" step="0.1" value={formData.wbc} 
                          onChange={e => setFormData({...formData, wbc: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('wbc', formData.wbc) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                          placeholder={getRangeInfo('wbc').unit} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('hb').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('hb').range} {getRangeInfo('hb').unit}</span>
                        </div>
                        <Input 
                          type="number" step="0.1" value={formData.hb} 
                          onChange={e => setFormData({...formData, hb: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('hb', formData.hb) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                          placeholder={getRangeInfo('hb').unit} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('plt').label || 'PLT'}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('plt').range} {getRangeInfo('plt').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.plt} 
                          onChange={e => setFormData({...formData, plt: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('plt', formData.plt) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                          placeholder={getRangeInfo('plt').unit || 'x10³/µL'} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('esr').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('esr').range} {getRangeInfo('esr').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.esr} 
                          onChange={e => setFormData({...formData, esr: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('esr', formData.esr) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                          placeholder={getRangeInfo('esr').unit}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">CRP</Label>
                          <span className="text-[9px] font-bold text-slate-300">Qualitative</span>
                        </div>
                        <Input 
                          type="number" step="0.1" value={formData.crp} 
                          onChange={e => setFormData({...formData, crp: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('crp', formData.crp) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                          placeholder="mg/L" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Station 2: Biochemistry & Organ Function */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                        <Beaker className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Biochemistry</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Renal, Liver & Glandular Profiles</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('s_urea').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('s_urea').range} {getRangeInfo('s_urea').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.s_urea} 
                          onChange={e => setFormData({...formData, s_urea: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('s_urea', formData.s_urea) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('s_creatinine').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('s_creatinine').range} {getRangeInfo('s_creatinine').unit}</span>
                        </div>
                        <Input 
                          type="number" step="0.01" value={formData.s_creatinine} 
                          onChange={e => setFormData({...formData, s_creatinine: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('s_creatinine', formData.s_creatinine) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('ast').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('ast').range} {getRangeInfo('ast').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.ast} 
                          onChange={e => setFormData({...formData, ast: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('ast', formData.ast) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('alt').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('alt').range} {getRangeInfo('alt').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.alt} 
                          onChange={e => setFormData({...formData, alt: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('alt', formData.alt) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('alp').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('alp').range} {getRangeInfo('alp').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.alp} 
                          onChange={e => setFormData({...formData, alp: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('alp', formData.alp) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('tsb').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('tsb').range} {getRangeInfo('tsb').unit}</span>
                        </div>
                        <Input 
                          type="number" step="0.1" value={formData.tsb} 
                          onChange={e => setFormData({...formData, tsb: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('tsb', formData.tsb) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Station 3: Electrolytes */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                        <Droplet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Electrolytes</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Serum Ions & Essential Salts</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {['ka', 'na', 'cl', 'ca'].map((key) => (
                         <div key={key} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo(key).label}</Label>
                              <span className="text-[9px] font-bold text-slate-300">{getRangeInfo(key).range}</span>
                            </div>
                            <Input 
                              type="number" step="0.01" value={formData[key]} 
                              onChange={e => setFormData({...formData, [key]: e.target.value})} 
                              className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange(key, formData[key]) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                              placeholder={getRangeInfo(key).unit}
                            />
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Station 4: Metabolism & Lipids */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Metabolic & Lipids</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Glucose Management & Lipid Profile</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('rbs').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('rbs').range} {getRangeInfo('rbs').unit}</span>
                        </div>
                        <Input 
                          type="number" value={formData.rbs} 
                          onChange={e => setFormData({...formData, rbs: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('rbs', formData.rbs) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">{getRangeInfo('hba1c').label}</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('hba1c').range} {getRangeInfo('hba1c').unit}</span>
                        </div>
                        <Input 
                          type="number" step="0.1" value={formData.hba1c} 
                          onChange={e => setFormData({...formData, hba1c: e.target.value})} 
                          className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2", isOutOfRange('hba1c', formData.hba1c) ? "text-rose-500 border-rose-200 focus:ring-rose-500" : "text-slate-900 dark:text-white border-slate-200 focus:ring-teal-500")} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label className="text-[11px] font-black uppercase text-slate-500">Lipid Profile</Label>
                          <span className="text-[9px] font-bold text-slate-300">{getRangeInfo('tg').unit}</span>
                        </div>
                        <div className="flex gap-1">
                          <Input 
                            type="number" value={formData.tg} 
                            onChange={e => setFormData({...formData, tg: e.target.value})} 
                            className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2 px-1 text-center text-xs", isOutOfRange('tg', formData.tg) ? "text-rose-500 border-rose-200" : "text-slate-900 dark:text-white border-slate-200")} 
                            placeholder={`TG (${getRangeInfo('tg').range})`} 
                          />
                          <Input 
                            type="number" value={formData.ldl} 
                            onChange={e => setFormData({...formData, ldl: e.target.value})} 
                            className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2 px-1 text-center text-xs", isOutOfRange('ldl', formData.ldl) ? "text-rose-500 border-rose-200" : "text-slate-900 dark:text-white border-slate-200")} 
                            placeholder={`LDL (${getRangeInfo('ldl').range})`} 
                          />
                          <Input 
                            type="number" value={formData.hdl} 
                            onChange={e => setFormData({...formData, hdl: e.target.value})} 
                            className={cn("h-12 rounded-xl bg-white dark:bg-slate-950 font-black transition-all focus:ring-2 px-1 text-center text-xs", isOutOfRange('hdl', formData.hdl) ? "text-rose-500 border-rose-200" : "text-slate-900 dark:text-white border-slate-200")} 
                            placeholder={`HDL (${getRangeInfo('hdl').range})`} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Station 5: Specialized & Custom Tests */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Specialized Investigations</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Troponin, D-Dimer, Cardiac Biomarkers & Notes</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex items-center justify-between ml-1">
                          <Label className="text-[11px] font-black uppercase text-slate-500">Specialized Investigations</Label>
                          <Button 
                             type="button" 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => setFormData({...formData, other_labs: [...formData.other_labs, { name: '', value: '' }]})}
                             className="h-7 text-[10px] font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg pr-3"
                          >
                             <Plus className="h-3 w-3 mr-1" /> Add Test
                          </Button>
                       </div>
                       
                       <div className="space-y-3">
                          {formData.other_labs.map((lab: any, index: number) => (
                             <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                                <Input 
                                   placeholder="Test (e.g. Troponin)"
                                   value={lab.name}
                                   onChange={e => {
                                      const newLabs = [...formData.other_labs];
                                      newLabs[index].name = e.target.value;
                                      setFormData({...formData, other_labs: newLabs});
                                   }}
                                   className="flex-1 h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-sm"
                                />
                                <Input 
                                   placeholder="Result"
                                   value={lab.value}
                                   onChange={e => {
                                      const newLabs = [...formData.other_labs];
                                      newLabs[index].value = e.target.value;
                                      setFormData({...formData, other_labs: newLabs});
                                   }}
                                   className="w-32 h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black text-sm text-teal-600"
                                />
                                {formData.other_labs.length > 1 && (
                                   <Button 
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                         const newLabs = formData.other_labs.filter((_: any, i: number) => i !== index);
                                         setFormData({...formData, other_labs: newLabs});
                                      }}
                                      className="h-11 w-11 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                   >
                                      <X className="h-4 w-4" />
                                   </Button>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>

                  {/* Specialized Section: GUE */}
                  <div className="space-y-6">
                     <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                              <Microscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                           </div>
                           <div>
                              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">General Urine Exam</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Structured Microscopic Analysis</p>
                           </div>
                        </div>
                        <Button 
                          type="button" 
                          variant={showGUEForm ? "destructive" : "outline"} 
                          className="rounded-xl font-black text-xs h-10 px-6 active:scale-95 transition-all"
                          onClick={() => setShowGUEForm(!showGUEForm)}
                        >
                          {showGUEForm ? "HIDE GUE FORM" : "OPEN GUE FORM"}
                        </Button>
                     </div>

                     {showGUEForm && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4">
                           <div className="space-y-6">
                              <p className="text-xs font-black text-teal-600 uppercase tracking-widest">Physical & Chemical</p>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                 {[
                                   { id: 'color', label: 'Color' },
                                   { id: 'appearance', label: 'Appearance' },
                                   { id: 'ph', label: 'pH Reaction' },
                                   { id: 'sp_gravity', label: 'Sp. Gravity' },
                                   { id: 'sugar', label: 'Sugar' },
                                   { id: 'protein', label: 'Protein' },
                                   { id: 'ketone', label: 'Ketones' },
                                 ].map((item) => (
                                   <div key={item.id} className="space-y-1.5 font-bold">
                                      <Label className="text-[10px] uppercase text-slate-400">{item.label}</Label>
                                      <Input 
                                        value={formData.gue[item.id]} 
                                        onChange={(e) => setFormData({...formData, gue: {...formData.gue, [item.id]: e.target.value}})}
                                        className="h-10 rounded-xl bg-white dark:bg-slate-950 font-black border-slate-200"
                                      />
                                   </div>
                                 ))}
                              </div>
                           </div>

                           <div className="space-y-6">
                              <p className="text-xs font-black text-teal-600 uppercase tracking-widest">Microscopic Exam</p>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                 {[
                                   { id: 'pus_cells', label: 'Pus Cells /HPF' },
                                   { id: 'rbcs', label: 'RBCs /HPF' },
                                   { id: 'epithelial', label: 'Epithelial' },
                                   { id: 'casts', label: 'Casts' },
                                   { id: 'crystals', label: 'Crystals' },
                                   { id: 'bacteria', label: 'Bacteria' },
                                 ].map((item) => (
                                   <div key={item.id} className="space-y-1.5 font-bold">
                                      <Label className="text-[10px] uppercase text-slate-400">{item.label}</Label>
                                      <Input 
                                        value={formData.gue[item.id]} 
                                        onChange={(e) => setFormData({...formData, gue: {...formData.gue, [item.id]: e.target.value}})}
                                        className="h-10 rounded-xl bg-white dark:bg-slate-950 font-black border-slate-200"
                                      />
                                   </div>
                                 ))}
                                 <div className="col-span-2 space-y-1.5 font-bold">
                                    <Label className="text-[10px] uppercase text-slate-400">Other Microscopic Notes</Label>
                                    <Input 
                                      value={formData.gue.others} 
                                      onChange={(e) => setFormData({...formData, gue: {...formData.gue, others: e.target.value}})}
                                      className="h-10 rounded-xl bg-white dark:bg-slate-950 font-black border-slate-200"
                                      placeholder="Granular casts, trichomonas, yeast..."
                                    />
                                 </div>
                              </div>
                           </div>
                           
                           {/* Add GUE Apply Control */}
                           <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 bg-white dark:bg-slate-950 rounded-2xl border border-teal-100 dark:border-teal-900/50 mt-4">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                    "p-2 rounded-full",
                                    gueApplied ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400"
                                 )}>
                                    <Check className="h-4 w-4" />
                                 </div>
                                 <div>
                                    <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                       {gueApplied ? "Urine Exam Applied" : "Urine Exam Not Applied"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                       {gueApplied ? "Results will be included in the report." : "Click save below to confirm these values."}
                                    </p>
                                 </div>
                              </div>
                              <Button 
                                 type="button" 
                                 onClick={() => {
                                    setGueApplied(true);
                                    toast.success("GUE data saved to report");
                                 }}
                                 disabled={gueApplied}
                                 className={cn(
                                    "rounded-xl font-black text-xs px-6 transition-all",
                                    gueApplied ? "bg-slate-100 text-slate-400 cursor-default" : "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                                 )}
                              >
                                 {gueApplied ? "DATA SAVED" : "SAVE AND APPLY GUE"}
                              </Button>
                           </div>
                        </div>
                     )}
                  </div>

                    <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                       <Button type="submit" className="flex-1 h-14 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black shadow-xl shadow-teal-500/20 active:scale-95 transition-all">
                        <Check className="mr-2 h-6 w-6" />
                        {editingRecordId ? "UPDATE AND AUTHENTICATE" : "AUTHENTICATE AND SAVE RESULTS"}
                      </Button>
                       <Button 
                          type="button" 
                          variant="outline" 
                          className="h-14 rounded-2xl px-8 font-black border-slate-200 shadow-inner" 
                          onClick={() => {
                            setIsAdding(false);
                            setEditingRecordId(null);
                          }}
                        >
                        CANCEL
                      </Button>
                    </div>
                 </form>
               </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-400 ml-2">
                <History className="h-4 w-4" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Previous Records</h2>
              </div>
              
              {history.length === 0 ? (
                <div className="p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50">
                   <p className="text-slate-400 font-bold italic">No history found for this patient.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((record) => (
                    <Card key={record.id} className={cn(
                      "rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group transition-all",
                      record.is_critical && "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/20"
                    )}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-teal-50 dark:bg-teal-950/50 p-2.5 rounded-xl">
                              <Beaker className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{format(new Date(record.date), "PPP p")}</p>
                                {record.is_critical && (
                                  <Badge className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full animate-bounce">
                                    CRITICAL
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {record.lab_tech_name ? `Tech: ${record.lab_tech_name}` : `Added by ${record.doctor_name || "Laboratory Role"}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                             {record.gue && Object.keys(record.gue).length > 2 && (
                               <Button 
                                 variant="outline" 
                                 size="icon" 
                                 className="h-10 w-10 rounded-full border-teal-200 text-teal-600 hover:bg-teal-50" 
                                 onClick={() => setViewingGUE(record)}
                               >
                                 <FileText className="h-4 w-4" />
                               </Button>
                             )}
                             {canModify(record.date) ? (
                               <>
                                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => handleEdit(record)}>
                                   <Edit2 className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => handleDelete(record.id)}>
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </>
                             ) : (
                               <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 flex gap-1 h-8 items-center border-dashed">
                                 <AlertCircle className="h-3 w-3" />
                                 LOCKED (24H EXPIRED)
                               </Badge>
                             )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-x-6 gap-y-3 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                           {record.wbc && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">WBC</p><p className={cn("font-black text-sm", isOutOfRange('wbc', record.wbc) && "text-rose-500")}>{record.wbc} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('wbc').unit}</span></p></div>}
                           {record.hb && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Hb</p><p className={cn("font-black text-sm", isOutOfRange('hb', record.hb) && "text-rose-500")}>{record.hb} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('hb').unit}</span></p></div>}
                           {record.plt && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">PLT</p><p className={cn("font-black text-sm", isOutOfRange('plt', record.plt) && "text-rose-500")}>{record.plt} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('plt').unit || "10³/µL"}</span></p></div>}
                           {record.s_urea && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Urea</p><p className={cn("font-black text-sm", isOutOfRange('s_urea', record.s_urea) && "text-rose-500")}>{record.s_urea} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('s_urea').unit}</span></p></div>}
                           {record.s_creatinine && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Creat</p><p className={cn("font-black text-sm", isOutOfRange('s_creatinine', record.s_creatinine) && "text-rose-500")}>{record.s_creatinine} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('s_creatinine').unit}</span></p></div>}
                           {record.ast && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">AST</p><p className={cn("font-black text-sm", isOutOfRange('ast', record.ast) && "text-rose-500")}>{record.ast} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('ast').unit}</span></p></div>}
                           {record.alt && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">ALT</p><p className={cn("font-black text-sm", isOutOfRange('alt', record.alt) && "text-rose-500")}>{record.alt} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('alt').unit}</span></p></div>}
                           {record.alp && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">ALP</p><p className={cn("font-black text-sm", isOutOfRange('alp', record.alp) && "text-rose-500")}>{record.alp} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('alp').unit}</span></p></div>}
                           {record.tsb && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">TSB</p><p className={cn("font-black text-sm", isOutOfRange('tsb', record.tsb) && "text-rose-500")}>{record.tsb} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('tsb').unit}</span></p></div>}
                           {record.rbs && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">RBS</p><p className={cn("font-black text-sm", isOutOfRange('rbs', record.rbs) && "text-rose-500")}>{record.rbs} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('rbs').unit}</span></p></div>}
                           {record.tg && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">TG</p><p className={cn("font-black text-sm", isOutOfRange('tg', record.tg) && "text-rose-500")}>{record.tg} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('tg').unit}</span></p></div>}
                           {record.ldl && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">LDL</p><p className={cn("font-black text-sm", isOutOfRange('ldl', record.ldl) && "text-rose-500")}>{record.ldl} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('ldl').unit}</span></p></div>}
                           {record.hdl && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">HDL</p><p className={cn("font-black text-sm", isOutOfRange('hdl', record.hdl) && "text-rose-500")}>{record.hdl} <span className="text-[10px] text-slate-400 font-medium">{getRangeInfo('hdl').unit}</span></p></div>}
                           {record.hba1c && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">HbA1c</p><p className={cn("font-black text-sm", isOutOfRange('hba1c', record.hba1c) && "text-rose-500")}>{record.hba1c}%</p></div>}
                           
                           {/* Electrolytes */}
                           {record.ka && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Ka</p><p className={cn("font-black text-sm", isOutOfRange('ka', record.ka) && "text-rose-500")}>{record.ka}</p></div>}
                           {record.na && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Na</p><p className={cn("font-black text-sm", isOutOfRange('na', record.na) && "text-rose-500")}>{record.na}</p></div>}
                           {record.cl && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Cl</p><p className={cn("font-black text-sm", isOutOfRange('cl', record.cl) && "text-rose-500")}>{record.cl}</p></div>}
                           {record.ca && <div className="space-y-0.5"><p className="text-[10px] uppercase font-bold text-slate-400">Ca</p><p className={cn("font-black text-sm", isOutOfRange('ca', record.ca) && "text-rose-500")}>{record.ca}</p></div>}
                           {Array.isArray(record.other_labs) && record.other_labs.length > 0 && (
                             <div className="col-span-2 md:col-span-4 lg:col-span-full pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-2 space-y-2">
                                <p className="text-[10px] uppercase font-black text-rose-500/60 tracking-widest">Specialized Results</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                   {record.other_labs.map((lab: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase w-20 truncate">{lab.name || 'Test'}</span>
                                         <span className="text-xs font-black text-teal-600 dark:text-teal-400">{lab.value}</span>
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Reference Ranges / Quick Actions */}
        <div className="space-y-6">
           <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-lg">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Normal Ranges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                 {labRanges.length > 0 ? (
                    // Sort based on clinical relevance: Hematology -> Renal -> Liver -> Metabolism -> Electrolytes
                    [...labRanges].sort((a, b) => {
                      const order = ['wbc', 'hb', 'plt', 'esr', 's_urea', 's_creatinine', 'ast', 'alt', 'alp', 'tsb', 'ka', 'na', 'cl', 'ca', 'rbs', 'hba1c', 'tg', 'ldl', 'hdl'];
                      const idxA = order.indexOf(a.key);
                      const idxB = order.indexOf(b.key);
                      if (idxA === -1 && idxB === -1) return 0;
                      if (idxA === -1) return 1;
                      if (idxB === -1) return -1;
                      return idxA - idxB;
                    }).map((range) => (
                      <div key={range.id} className="flex justify-between text-xs border-b border-slate-50 dark:border-slate-800 pb-2 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors px-1 rounded-sm">
                         <span className="font-bold text-slate-600 dark:text-slate-400">{range.label}</span>
                         <span className="font-mono text-slate-400 dark:text-slate-500">
                           {range.min_value !== null && range.max_value !== null ? `${range.min_value}-${range.max_value}` : range.min_value !== null ? `Min ${range.min_value}` : range.max_value !== null ? `Max ${range.max_value}` : '-'} {range.unit}
                         </span>
                      </div>
                    ))
                 ) : (
                   <p className="text-[10px] font-bold text-slate-300 italic text-center">Loading ranges...</p>
                 )}
              </CardContent>
           </Card>

           <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-[2rem] p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase">
                 <AlertCircle className="h-4 w-4" />
                 MLT Guidelines
              </div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500 leading-relaxed">
                 You are authorized to enter and modify results for **up to 24 hours** from the time of entry. After this period, any corrections must be submitted to the Clinical Administrator for record auditing.
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}
