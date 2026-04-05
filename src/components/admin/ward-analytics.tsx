"use client"

import { useState, useMemo } from 'react'
import { 
  TrendingUp, PieChart, BarChart3, Users, 
  Activity, ActivityIcon, FlaskConical, Search, 
  ChevronDown, ArrowRight, Info, Zap
} from 'lucide-react'
import { 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts'
import { useVariableDiscovery, type Variable } from '@/hooks/use-variable-discovery'
import { exportAnalyticsToExcel } from '@/lib/export-utils'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
const RISK_COLORS = {
  'High Risk': '#ef4444',
  'Close Follow-up': '#f59e0b',
  'Normal': '#10b981',
  'Follow-up': '#6366f1',
  'Routine': '#3b82f6',
  'Deceased/Archive': '#64748b'
}

export function WardAnalytics({ patients }: { patients: any[] }) {
  const { ALL_VARIABLES, categorizedGroups, getVariableValue: baseGetVariableValue } = useVariableDiscovery(patients)

  // -- STATE FOR INTERACTIVE EXPLORER (Upgraded to Multi-Select) --
  const [selectedVars1, setSelectedVars1] = useState<string[]>([])
  const [selectedVars2, setSelectedVars2] = useState<string[]>([])
  const [logicMode1, setLogicMode1] = useState<'any' | 'all'>('any')
  const [logicMode2, setLogicMode2] = useState<'any' | 'all'>('any')
  
  const [isXOpen, setIsXOpen] = useState(false)
  const [isYOpen, setIsYOpen] = useState(false)
  const [searchX, setSearchX] = useState('')
  const [searchY, setSearchY] = useState('')

  // -- 1. WARD PULSE DATA --
  const wardMetrics = useMemo(() => {
    if (!patients.length) return null

    const wardCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    let totalAge = 0
    let survivalCount = 0

    patients.forEach(p => {
      // Ward counts
      const w = p.doctor_ward || 'Unknown'
      wardCounts[w] = (wardCounts[w] || 0) + 1

      // Category counts
      const c = p.category || 'Normal'
      categoryCounts[c] = (categoryCounts[c] || 0) + 1

      // Age
      totalAge += Number(p.age) || 0

      // Survival
      if (!p.date_of_death) survivalCount++
    })

    const wardData = Object.entries(wardCounts).map(([name, value]) => ({ name, value }))
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))

    return {
      wardData,
      categoryData,
      avgAge: (totalAge / patients.length).toFixed(1),
      survivalRate: ((survivalCount / patients.length) * 100).toFixed(1),
      totalPatients: patients.length,
      highRiskCount: categoryCounts['High Risk'] || 0
    }
  }, [patients])

  // -- 2. CORE ANALYTICS ENGINE (COMPOSITE MAPPING) --
  const getVariableValue = (p: any, varId: string): string | number | null => {
    if (!p) return null
    if (varId === 'age') return p.age ?? p.patient_age ?? null
    if (varId === 'gender') return p.gender ?? p.patient_gender ?? null
    if (varId === 'education_level') return p.education_level ?? null
    if (varId === 'relative_status') return p.relative_status ?? null
    if (varId === 'category') return p.category ?? null
    if (varId === 'is_deceased') return p.date_of_death ? 'Deceased' : 'Alive'
    if (varId === 'total_visits') return p.visits?.length || 0
    if (varId === 'total_chronic') return p.chronic_diseases?.length || 0
    if (varId.startsWith('lab_')) {
      const field = varId.replace('lab_', '')
      const investigations = p.investigations || p.latest_investigations || []
      const latest = [...investigations].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      return latest?.[field] ?? null
    }
    if (varId.startsWith('vital_')) {
      const field = varId.replace('vital_', '')
      const visits = p.visits || p.latest_visits || []
      const latest = [...visits].sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]
      return latest?.[field] ?? null
    }
    return baseGetVariableValue(p, varId)
  }

  const computeComposite = (patient: any, selectedIds: string[], logic: 'any' | 'all') => {
    if (selectedIds.length === 0) return null
    if (selectedIds.length === 1) {
      const val = getVariableValue(patient, selectedIds[0])
      return val === undefined || val === null ? null : val
    }
    const results = selectedIds.map(vid => {
      const val = getVariableValue(patient, vid)
      const vObj = ALL_VARIABLES.find(v => v.id === vid)
      if (vObj?.type === 'continuous') return (Number(val) || 0) > 0
      return !!val && val !== 'No' && val !== 'N/A' && val !== 'None'
    })
    return logic === 'any' ? (results.some(r => r) ? 'Positive (Any)' : 'Negative') : (results.every(r => r) ? 'Positive (All)' : 'Negative')
  }

  const { explorerData, explorerType, axisLabels } = useMemo(() => {
    const defaultLabels = { x: 'X Axis', y: 'Y Axis' }
    if (!patients.length || !selectedVars1.length || !selectedVars2.length) {
      return { explorerData: { scatter: [], bar: [], stacked: [], series: [] }, explorerType: 'bar' as const, axisLabels: defaultLabels }
    }
    const v1 = ALL_VARIABLES.find(v => v.id === selectedVars1[0])
    const v2 = ALL_VARIABLES.find(v => v.id === selectedVars2[0])
    const type1 = selectedVars1.length > 1 ? 'categorical' : (v1?.type || 'categorical')
    const type2 = selectedVars2.length > 1 ? 'categorical' : (v2?.type || 'categorical')
    const labels = {
      x: selectedVars1.length > 1 ? `Composite (${logicMode1.toUpperCase()})` : (v1?.label || 'X Axis'),
      y: selectedVars2.length > 1 ? `Composite (${logicMode2.toUpperCase()})` : (v2?.label || 'Y Axis')
    }
    if (type1 === 'continuous' && type2 === 'continuous') {
      const scatter = patients.map(p => {
        const x = computeComposite(p, selectedVars1, logicMode1)
        const y = computeComposite(p, selectedVars2, logicMode2)
        return { x: Number(x), y: Number(y), name: p.name }
      }).filter(d => !isNaN(d.x) && !isNaN(d.y))
      return { explorerData: { scatter, bar: [], stacked: [], series: [] }, explorerType: 'scatter' as const, axisLabels: labels }
    }
    if ((type1 === 'categorical' && type2 === 'continuous') || (type1 === 'continuous' && type2 === 'categorical')) {
      const is1Cat = type1 === 'categorical'
      const catVars = is1Cat ? selectedVars1 : selectedVars2
      const contVars = is1Cat ? selectedVars2 : selectedVars1
      const catLogic = is1Cat ? logicMode1 : logicMode2
      const contLogic = is1Cat ? logicMode2 : logicMode1
      const groups: Record<string, number[]> = {}
      patients.forEach(p => {
        const catVal = String(computeComposite(p, catVars, catLogic) ?? 'N/A')
        const contVal = Number(computeComposite(p, contVars, contLogic))
        if (!isNaN(contVal)) {
          if (!groups[catVal]) groups[catVal] = []
          groups[catVal].push(contVal)
        }
      })
      const bar = Object.entries(groups).map(([name, vals]) => ({ name, value: vals.reduce((a, b) => a + b, 0) / vals.length }))
      return { explorerData: { scatter: [], bar, stacked: [], series: [] }, explorerType: 'bar' as const, axisLabels: labels }
    }
    const groups: Record<string, Record<string, number>> = {}
    const seriesSet = new Set<string>()
    patients.forEach(p => {
      const xVal = String(computeComposite(p, selectedVars1, logicMode1) ?? 'N/A')
      const yVal = String(computeComposite(p, selectedVars2, logicMode2) ?? 'Negative/Unknown')
      if (!groups[xVal]) groups[xVal] = {}
      groups[xVal][yVal] = (groups[xVal][yVal] || 0) + 1
      seriesSet.add(yVal)
    })
    const stacked = Object.entries(groups).map(([name, values]) => ({ name, ...values }))
    return { explorerData: { scatter: [], bar: [], stacked, series: Array.from(seriesSet) }, explorerType: 'stacked' as const, axisLabels: labels }
  }, [patients, selectedVars1, selectedVars2, logicMode1, logicMode2, ALL_VARIABLES])

  const handleExportExcel = () => {
    const exportData = patients.map(p => ({
      name: p.name,
      ward: p.doctor_ward || "Unassigned",
      age: p.age,
      x_val: computeComposite(p, selectedVars1, logicMode1),
      y_val: computeComposite(p, selectedVars2, logicMode2)
    })).filter(row => row.x_val !== null && row.y_val !== null)

    exportAnalyticsToExcel({
      title: `${axisLabels.x} vs ${axisLabels.y}`,
      xLabel: axisLabels.x,
      yLabel: axisLabels.y,
      data: exportData
    })
  }

  return (
    <div className="space-y-8 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Avg Patient Age', value: `${wardMetrics?.avgAge}y`, icon: Users, color: 'text-indigo-600' },
            { label: 'Stability Rate', value: `${wardMetrics?.survivalRate}%`, icon: Zap, color: 'text-emerald-600' },
            { label: 'Active Cohort', value: wardMetrics?.totalPatients, icon: Activity, color: 'text-blue-600' },
            { label: 'High Risk Total', value: wardMetrics?.highRiskCount, icon: Zap, color: 'text-rose-600' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 bg-slate-100 dark:bg-white/5 rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                 <BarChart3 className="h-6 w-6 text-indigo-500" />
                 Ward Occupancy Distribution
              </h3>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={wardMetrics?.wardData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="url(#colorBar)" radius={[10, 10, 0, 0]} barSize={40}>
                       <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                             <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          </linearGradient>
                       </defs>
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
           <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <PieChart className="h-6 w-6 text-emerald-500" />
              Risk Assessment
           </h3>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <RePieChart>
                    <Pie data={wardMetrics?.categoryData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                       {wardMetrics?.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(RISK_COLORS as any)[entry.name] || COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                 </RePieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
         <div className="relative z-10">
            <div className="mb-12">
               <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                  Visual relationship mapper
               </span>
               <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-4 flex items-center gap-4">
                  Clinical Relationship Explorer
               </h2>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Discover correlations across any clinical variables with dynamic visual mapping.</p>
                 <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-lg shadow-emerald-600/20">
                    <BarChart3 className="h-4 w-4" />
                    EXPORT DATA TO EXCEL
                 </button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
               <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-4">Mapping Basis (X Axis)</label>
                  <button onClick={() => { setIsXOpen(!isXOpen); setIsYOpen(false); }} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-400 transition-all font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                     <div className="flex items-center gap-3">
                        <ArrowRight className="h-4 w-4 text-indigo-500" />
                        <span className="truncate max-w-[200px]">
                           {selectedVars1.length === 0 ? 'Select Variable' : (selectedVars1.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label : `${ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label} +${selectedVars1.length - 1} more`)}
                        </span>
                     </div>
                     <ChevronDown className={`h-4 w-4 transition-transform ${isXOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isXOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] max-h-96 overflow-hidden flex flex-col p-2">
                       <div className="p-2 space-y-2 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center justify-between px-1">
                             <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedVars1([]); }} className="text-[9px] font-black text-rose-500 hover:text-rose-600 px-1">CLEAR</button>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedVars1(ALL_VARIABLES.map(v => v.id)); }} className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 px-1">ALL</button>
                             </div>
                             <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button onClick={(e) => { e.stopPropagation(); setLogicMode1('any'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${logicMode1 === 'any' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>ANY</button>
                                <button onClick={(e) => { e.stopPropagation(); setLogicMode1('all'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${logicMode1 === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>ALL</button>
                             </div>
                          </div>
                          <input placeholder="Find factor..." value={searchX} onChange={(e) => setSearchX(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold" />
                       </div>
                       <div className="overflow-y-auto flex-1 p-2 scrollbar-none">
                          {Object.entries(categorizedGroups).map(([group, vars]) => {
                             const filtered = vars.filter(v => v.label.toLowerCase().includes(searchX.toLowerCase()))
                             if (filtered.length === 0) return null
                             return (
                               <div key={group} className="mb-4">
                                 <h4 className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{group}</h4>
                                 {filtered.map(v => (
                                   <label key={v.id} onClick={(e) => e.stopPropagation()} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${selectedVars1.includes(v.id) ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                      <input type="checkbox" checked={selectedVars1.includes(v.id)} onChange={() => { setSelectedVars1(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id]) }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                      <span className="text-xs font-bold">{v.label}</span>
                                   </label>
                                 ))}
                               </div>
                             )
                          })}
                       </div>
                    </div>
                  )}
               </div>
               <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-4">Outcome Factor (Y Axis)</label>
                  <button onClick={() => { setIsYOpen(!isYOpen); setIsXOpen(false); }} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-400 transition-all font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                     <div className="flex items-center gap-3">
                        <ActivityIcon className="h-4 w-4 text-emerald-500" />
                        <span className="truncate max-w-[200px]">
                           {selectedVars2.length === 0 ? 'Select Variable' : (selectedVars2.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label : `${ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label} +${selectedVars2.length - 1} more`)}
                        </span>
                     </div>
                     <ChevronDown className={`h-4 w-4 transition-transform ${isYOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isYOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] max-h-96 overflow-hidden flex flex-col p-2">
                       <div className="p-2 space-y-2 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center justify-between px-1">
                             <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedVars2([]); }} className="text-[9px] font-black text-rose-500 hover:text-rose-600 px-1">CLEAR</button>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedVars2(ALL_VARIABLES.map(v => v.id)); }} className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 px-1">ALL</button>
                             </div>
                             <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <button onClick={(e) => { e.stopPropagation(); setLogicMode2('any'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${logicMode2 === 'any' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>ANY</button>
                                <button onClick={(e) => { e.stopPropagation(); setLogicMode2('all'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition ${logicMode2 === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>ALL</button>
                             </div>
                          </div>
                          <input placeholder="Find factor..." value={searchY} onChange={(e) => setSearchY(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold" />
                       </div>
                       <div className="overflow-y-auto flex-1 p-2 scrollbar-none">
                          {Object.entries(categorizedGroups).map(([group, vars]) => {
                             const filtered = vars.filter(v => v.label.toLowerCase().includes(searchY.toLowerCase()))
                             if (filtered.length === 0) return null
                             return (
                               <div key={group} className="mb-4">
                                 <h4 className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{group}</h4>
                                 {filtered.map(v => (
                                   <label key={v.id} onClick={(e) => e.stopPropagation()} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${selectedVars2.includes(v.id) ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                      <input type="checkbox" checked={selectedVars2.includes(v.id)} onChange={() => { setSelectedVars2(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id]) }} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                      <span className="text-xs font-bold">{v.label}</span>
                                   </label>
                                 ))}
                               </div>
                             )
                          })}
                       </div>
                    </div>
                  )}
               </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-4 lg:p-10 min-h-[500px] flex flex-col justify-center">
               {explorerData.scatter.length === 0 && explorerData.bar.length === 0 && explorerData.stacked.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-center p-12">
                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full mb-4">
                       <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Data Streams...</h4>
                    <p className="text-slate-500 max-w-xs text-sm">
                      Requested: <strong className="text-indigo-600">{axisLabels.x}</strong> vs <strong className="text-emerald-600">{axisLabels.y}</strong>.
                    </p>
                    <button onClick={() => { setSelectedVars1(['age']); setSelectedVars2(['gender']); }} className="mt-6 text-[10px] font-black uppercase text-indigo-500 hover:underline">
                       Reset to Demographics Sample
                    </button>
                 </div>
               ) : (
                 <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     {explorerType === 'scatter' ? (
                       <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            type="number" 
                            dataKey="x" 
                            name={axisLabels.x} 
                            fontSize={10} tickLine={false} axisLine={false} 
                            label={{ 
                              value: axisLabels.x, 
                              position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b', fontWeight: 'bold' 
                            }} 
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name={axisLabels.y} 
                            fontSize={10} tickLine={false} axisLine={false} 
                            label={{ 
                              value: axisLabels.y, 
                              angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b', fontWeight: 'bold' 
                            }} 
                          />
                          <ZAxis type="number" range={[100, 100]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10">
                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mb-1">{payload[0].payload.name}</p>
                                     <p className="text-xs font-bold text-slate-500">{selectedVars1.length > 1 ? 'X Composite' : (ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label)}: {payload[0].value}</p>
                                     <p className="text-xs font-bold text-slate-500">{selectedVars2.length > 1 ? 'Y Outcome' : (ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label)}: {payload[1].value}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Patients" data={explorerData.scatter} fill="#6366f1" fillOpacity={0.6} />
                       </ScatterChart>
                     ) : explorerType === 'stacked' ? (
                        <BarChart data={explorerData.stacked}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                           <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                           <YAxis fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Patient Count', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }} />
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                           <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                           {explorerData.series.map((s, i) => (
                             <Bar 
                               key={s} 
                               dataKey={s} 
                               stackId="a" 
                               fill={s === 'Positive (Any)' || s === 'Positive (All)' ? '#6366f1' : (s === 'Negative' ? '#e2e8f0' : COLORS[i % COLORS.length])} 
                               radius={i === explorerData.series.length -1 ? [6, 6, 0, 0] : [0,0,0,0]} 
                             />
                           ))}
                        </BarChart>
                     ) : (
                       <BarChart data={explorerData.bar}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Average Value', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }} />
                          <Tooltip 
                            formatter={(val: any) => [Number(val).toFixed(2), "Average"]}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                          />
                          <Bar 
                            dataKey="value" 
                            name="Mean Result" 
                            fill="#6366f1" 
                            radius={[10, 10, 0, 0]} 
                            barSize={50}
                          >
                             {explorerData.bar.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Bar>
                       </BarChart>
                     )}
                  </ResponsiveContainer>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  )
}
