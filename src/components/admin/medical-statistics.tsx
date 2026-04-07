"use client"

import { useState, useMemo } from 'react'
import { 
  BrainCircuit, Database, FileText, Loader2, ArrowRight, Table, 
  Sigma, Info, AlertCircle, CheckCircle2, FlaskConical, Calendar, 
  Search, Filter, Sparkles, Activity, Divide, Users, LucideIcon, Download
} from 'lucide-react'
import { exportResearchToWord, exportResearchToExcel } from '@/lib/export-utils'
import ReactMarkdown from 'react-markdown'
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts'
import { runComplexAIStudyAction } from '@/app/actions/research-actions'
import { COMMON_DISEASES, ALL_SURGERIES } from '@/lib/medical-dictionary'

import { useVariableDiscovery, type Variable, type Measure } from '@/hooks/use-variable-discovery'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Demographics': Users,
  'Clinical Status': Activity,
  'Social': Users,
  'Scale Counts': Sigma,
  'Temporal': Calendar,
  'Outcome': FileText,
  'Chronic Diseases': Activity,
  'Medical Drugs': FlaskConical,
  'Psych Drugs': BrainCircuit,
  'Laboratory': Database,
  'Facilities': Table
}

export function MedicalStatistics({ patients, aiEnabled }: { patients: any[]; aiEnabled: boolean }) {
  const { ALL_VARIABLES, categorizedGroups, getVariableValue } = useVariableDiscovery(patients)

  // UI STATE
  const [researchMode, setResearchMode] = useState<'Standard' | 'AI Investigator'>('Standard')
  const [wardFilter, setWardFilter] = useState('All Wards')
  
  // Independent Var State (Multi-selection)
  const [cat1, setCat1] = useState<string>('1. Demographics')
  const [selectedVars1, setSelectedVars1] = useState<string[]>([])
  const [logicMode1, setLogicMode1] = useState<'any' | 'all'>('any')
  
  // Dependent Var State (Target for correlation - Now Multi-select)
  const [cat2, setCat2] = useState<string>('2. Clinical Risk & Status')
  const [selectedVars2, setSelectedVars2] = useState<string[]>([])
  const [logicMode2, setLogicMode2] = useState<'any' | 'all'>('any')

  const [userObjective, setUserObjective] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [pythonResults, setPythonResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm1, setSearchTerm1] = useState('')
  const [searchTerm2, setSearchTerm2] = useState('')

  // Helper to compute value for a patient
  const getPatientValue = (p: any, vId: string) => {
    let patientVal: any = null
    const v = ALL_VARIABLES.find(x => x.id === vId)
    if (!v) return null

    if (vId === 'doctor_ward') patientVal = p.doctor_ward
    else if (vId === 'is_deceased') patientVal = p.category === 'Deceased/Archive' ? 'Yes' : 'No'
    else if (vId === 'high_risk_season') {
      if (!p.high_risk_date) patientVal = 'N/A'
      else {
        const month = new Date(p.high_risk_date).getMonth() + 1
        patientVal = (month >= 5 && month <= 9) ? 'Summer' : (month >= 11 || month <= 2) ? 'Winter' : 'Shoulder'
      }
    }
    else if (vId === 'death_season') {
      if (!p.date_of_death) patientVal = 'N/A'
      else {
        const month = new Date(p.date_of_death).getMonth() + 1
        patientVal = (month >= 5 && month <= 9) ? 'Summer' : (month >= 11 || month <= 2) ? 'Winter' : 'Shoulder'
      }
    }
    else if (vId === 'days_to_high_risk') {
      if (!p.high_risk_date) patientVal = null
      else {
        const start = new Date(p.created_at).getTime()
        const end = new Date(p.high_risk_date).getTime()
        patientVal = Math.floor((end - start) / (1000 * 60 * 60 * 24))
      }
    }
    else if (vId === 'clinical_duration') {
      const start = new Date(p.created_at).getTime()
      const end = p.date_of_death ? new Date(p.date_of_death).getTime() : Date.now()
      patientVal = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    }
    else if (vId.startsWith('disease_')) {
      const dName = v.label
      patientVal = Array.isArray(p.chronic_diseases) && p.chronic_diseases.some((cd: any) => cd.name === dName) ? 'Yes' : 'No'
    }
    else if (vId.startsWith('int_drug_')) {
      const dName = v.label
      patientVal = Array.isArray(p.medical_drugs) && p.medical_drugs.some((d: any) => d.name === dName) ? 'Yes' : 'No'
    }
    else if (vId.startsWith('psych_drug_')) {
      const dName = v.label
      patientVal = Array.isArray(p.psych_drugs) && p.psych_drugs.some((d: any) => d.name === dName) ? 'Yes' : 'No'
    }
    else if (vId.startsWith('ward_')) {
      const wName = v.label
      patientVal = p.doctor_ward === wName ? 'Yes' : 'No'
    }
    else if (vId.startsWith('surgery_')) {
       const sName = v.label
       patientVal = Array.isArray(p.past_surgeries) && p.past_surgeries.some((s: any) => s === sName) ? 'Yes' : 'No'
    }
    else if (vId.startsWith('lab_')) {
       const labKey = vId.replace('lab_', '')
       if (Array.isArray(p.investigations) && p.investigations.length > 0) {
          const sortedInvs = [...p.investigations].sort((a,b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
          });
         for (const inv of sortedInvs) {
           if (inv[labKey] !== undefined && inv[labKey] !== null) {
             patientVal = parseFloat(inv[labKey])
             break
           }
         }
       }
    }
    else if (vId.startsWith('vital_')) {
       const vitalKey = vId.replace('vital_', '')
       if (Array.isArray(p.visits) && p.visits.length > 0) {
          const sortedVisits = [...p.visits].sort((a,b) => {
            const da = a.visit_date ? new Date(a.visit_date).getTime() : 0;
            const db = b.visit_date ? new Date(b.visit_date).getTime() : 0;
            return db - da;
          });
         for (const visit of sortedVisits) {
           if (visit[vitalKey] !== undefined && visit[vitalKey] !== null) {
             patientVal = parseFloat(visit[vitalKey])
             break
           }
         }
       }
    }
    else if (vId === 'total_surgeries') patientVal = Array.isArray(p.past_surgeries) ? p.past_surgeries.length : 0
    else if (vId === 'total_chronic') patientVal = Array.isArray(p.chronic_diseases) ? p.chronic_diseases.length : 0
    else if (vId === 'total_visits') patientVal = Array.isArray(p.visits) ? p.visits.length : 0
    else if (vId === 'age') patientVal = parseFloat(p.age) || null
    else patientVal = p[vId] || null

    return patientVal
  }

  const computeCompositeVal = (p: any, ids: string[], logic: 'any' | 'all') => {
    const results = ids.map(vid => {
      const val = getPatientValue(p, vid)
      const v = ALL_VARIABLES.find(x => x.id === vid)
      if (v?.type === 'categorical') return val === 'Yes' || val === true
      if (v?.type === 'continuous') return (Number(val) || 0) > 0
      return !!val
    })
    if (logic === 'any') return results.some(r => r) ? 'Positive (Any)' : 'Negative'
    return results.every(r => r) ? 'Positive (All)' : 'Negative'
  }

  // Clean data extraction mapping
  const buildFlatDataset = (cohort: any[], compositeId1: string, compositeId2: string) => {
    return cohort.map(patient => {
      const flatRecord: any = {}
      
      if (selectedVars1.length === 1) {
        const v = ALL_VARIABLES.find(x => x.id === selectedVars1[0])
        if (v?.type === 'continuous') flatRecord[v.id] = getPatientValue(patient, v.id)
      }
      if (selectedVars2.length === 1) {
        const v = ALL_VARIABLES.find(x => x.id === selectedVars2[0])
        if (v?.type === 'continuous') flatRecord[v.id] = getPatientValue(patient, v.id)
      }

      // X Calculation
      flatRecord[compositeId1] = computeCompositeVal(patient, selectedVars1, logicMode1)
      
      // Y Calculation
      flatRecord[compositeId2] = computeCompositeVal(patient, selectedVars2, logicMode2)

      // Add individual values for numerical correlations if single selection
      if (selectedVars1.length === 1) {
        const v = ALL_VARIABLES.find(x => x.id === selectedVars1[0])
        if (v?.type === 'continuous') {
           // We repeat the extraction but for direct value
           let val: any = null
           if (v.id.startsWith('lab_')) {
              const key = v.id.replace('lab_', '')
              const lastInv = Array.isArray(patient.investigations) ? [...patient.investigations].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null
              val = lastInv ? parseFloat(lastInv[key]) : null
           } else if (v.id.startsWith('vital_')) {
              const key = v.id.replace('vital_', '')
              const lastVisit = Array.isArray(patient.visits) ? [...patient.visits].sort((a,b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0] : null
              val = lastVisit ? parseFloat(lastVisit[key]) : null
           } else if (v.id === 'age') val = parseFloat(patient.age)
           flatRecord[v.id] = val
        }
      }

      if (selectedVars2.length === 1) {
        const v = ALL_VARIABLES.find(x => x.id === selectedVars2[0])
        if (v?.type === 'continuous') {
           let val: any = null
           if (v.id.startsWith('lab_')) {
              const key = v.id.replace('lab_', '')
              const lastInv = Array.isArray(patient.investigations) ? [...patient.investigations].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null
              val = lastInv ? parseFloat(lastInv[key]) : null
           } else if (v.id.startsWith('vital_')) {
              const key = v.id.replace('vital_', '')
              const lastVisit = Array.isArray(patient.visits) ? [...patient.visits].sort((a,b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0] : null
              val = lastVisit ? parseFloat(lastVisit[key]) : null
           } else if (v.id === 'age') val = parseFloat(patient.age)
           flatRecord[v.id] = val
        }
      }

      return flatRecord
    })
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    setPythonResults(null)
    setReport(null)

    const filteredPatients = wardFilter === 'All Wards' 
      ? patients 
      : patients.filter(p => p.doctor_ward === wardFilter)

    if (filteredPatients.length === 0) {
      setError(`No patients found in ${wardFilter}.`)
      setIsAnalyzing(false)
      return
    }

    if (researchMode === 'AI Investigator') {
      if (!aiEnabled) {
        setError("AI Research features are disabled for your account.")
        setIsAnalyzing(false)
        return
      }
      const aiRes = await runComplexAIStudyAction(userObjective, filteredPatients)
      if (aiRes.error) setError(aiRes.error)
      else setReport(aiRes.result || "No conclusion.")
      setIsAnalyzing(false)
      return
    }

    if (selectedVars1.length === 0 || selectedVars2.length === 0) {
      setError("Please select at least one Variable for X and one for Y.")
      setIsAnalyzing(false)
      return
    }

    const compositeId1 = "independent_composite"
    const compositeLabel1 = selectedVars1.length > 1 
      ? `${logicMode1 === 'any' ? 'ANY' : 'ALL'} of (${selectedVars1.length} factors)`
      : ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label || "Indep Factor"

    const compositeId2 = "dependent_composite"
    const compositeLabel2 = selectedVars2.length > 1
      ? `${logicMode2 === 'any' ? 'ANY' : 'ALL'} of (${selectedVars2.length} factors)`
      : ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label || "Dep Factor"

    const payloadDataset = buildFlatDataset(filteredPatients, compositeId1, compositeId2)

    const indepType = selectedVars1.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.type : 'categorical'
    const depType = selectedVars2.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.type : 'categorical'

    const payload = {
      independent_vars: [{ 
        name: selectedVars1.length === 1 ? (indepType === 'continuous' ? selectedVars1[0] : compositeId1) : compositeId1, 
        label: compositeLabel1, 
        type: indepType 
      }],
      dependent_var: { 
        name: selectedVars2.length === 1 ? (depType === 'continuous' ? selectedVars2[0] : compositeId2) : compositeId2, 
        label: compositeLabel2, 
        type: depType 
      },
      data: payloadDataset
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_STAT_ENGINE_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Math Engine Failed")
      }
      
      const mathData = await res.json()
      setPythonResults(mathData)

      const finalPrompt = `Write a Medical Research Results interpretation for: "${compositeLabel1}" (Independent) vs "${compositeLabel2}" (Dependent). 
      Math Engine Output: ${JSON.stringify(mathData)}
      Explain the clinical significance, keeping the tone strictly academic.`
      
      const aiRes = await fetch('/api/research/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt })
      })

      if (aiRes.ok) {
         const aiTxt = await aiRes.json()
         setReport(aiTxt.text)
      } else {
         const errorPayload = await aiRes.json().catch(() => ({ text: "Unknown AI Error" }))
         setReport(`### Statistical Output Successful\n\n**Test Performed:** ${mathData.test_used}\n**P-Value:** ${mathData.p_value}\n**Statistic:** ${mathData.statistic}\n\n*Note: AI Interpretation engine failed (${errorPayload.text}). Raw statistical output shown above.*`)
      }

    } catch (e: any) {
      console.error("AI Error:", e)
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
         setError("Medical Research Engine is currently OFFLINE. Please ensure the Python analytics server is running on port 8000.")
      } else {
         setError(`Research Engine Error: ${e.message}`)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const distinctWards = useMemo(() => Array.from(new Set(patients.map(p => p.doctor_ward))).filter(Boolean), [patients])

  // --- CHART RENDERING LOGIC ---
  const renderChart = () => {
    if (!pythonResults || !pythonResults.chart_data) return null
    const { type, groups, values, data, x, y } = pythonResults.chart_data

    if (type === 'boxplot' || (pythonResults.test_used && pythonResults.test_used.includes('T-Test') || pythonResults.test_used.includes('ANOVA'))) {
      // For boxplot/ANOVA data, we'll show a Bar chart of means since Recharts doesn't have a native boxplot
      const chartData = (groups || []).map((name: string, i: number) => {
        const groupDesc = pythonResults.descriptives?.groups?.[name]
        return {
          name,
          mean: groupDesc?.mean || 0,
          n: groupDesc?.n || values?.[i]?.length || 0
        }
      })

      return (
        <div className="h-[350px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} label={{ value: pythonResults.dep_label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#64748b' } }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
              />
              <Bar dataKey="mean" name="Mean Value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'bar' || pythonResults.test_used === 'Chi-Square') {
      // Flatten contingency table for Recharts
      // data looks like { IndepVal1: { DepValA: 10, DepValB: 2 }, IndepVal2: { ... } }
      const indepKeys = Object.keys(data || {})
      if (indepKeys.length === 0) return null
      
      const depKeys = Object.keys(data[indepKeys[0]] || {})
      const chartData = indepKeys.map(indepVal => ({
        name: indepVal,
        ...data[indepVal]
      }))

      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

      return (
        <div className="h-[350px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
              {depKeys.map((k, idx) => (
                <Bar key={k} dataKey={k} stackId="a" fill={colors[idx % colors.length]} radius={idx === depKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'scatter' || pythonResults.test_used === 'Pearson Correlation') {
      const chartData = (x || []).map((val: number, i: number) => ({
        x: val,
        y: y[i]
      }))

      return (
        <div className="h-[350px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" dataKey="x" name={pythonResults.indep_label} fontSize={12} tickLine={false} axisLine={false} label={{ value: pythonResults.indep_label, position: 'insideBottom', offset: -5, fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name={pythonResults.dep_label} fontSize={12} tickLine={false} axisLine={false} label={{ value: pythonResults.dep_label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10 }, offset: 10 }} />
              <ZAxis type="number" range={[64, 64]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Scatter name="Data Points" data={chartData} fill="#6366f1" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Title & Modes */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Advanced Medical Research Hub</h2>
          <p className="text-slate-500 font-medium">Python-powered statistical tests and AI interpretation.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
           <button 
             onClick={() => setResearchMode('Standard')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition ${researchMode === 'Standard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
           >
             Scientific Mode
           </button>
           <button 
             onClick={() => setResearchMode('AI Investigator')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition ${researchMode === 'AI Investigator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
           >
             NLP Mode
           </button>
        </div>
      </div>

      {/* Dataset Status Indicator */}
      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
         <div className={`h-2 w-2 rounded-full ${patients.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
         <div className="flex-1 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
            <span className="text-slate-500">Loaded Cohort: {patients.length} Clinical Records</span>
            {patients.length === 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Data Access Restricted or Database Empty
              </span>
            )}
         </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
           <AlertCircle className="h-5 w-5" />
           <span className="font-semibold">{error}</span>
        </div>
      )}

      {researchMode === 'Standard' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
             <Filter className="h-5 w-5 text-slate-400" />
             <div>
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Study Cohort Filter</label>
               <select 
                 value={wardFilter} 
                 onChange={e => setWardFilter(e.target.value)} 
                 className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
               >
                 <option value="All Wards">All Global Wards</option>
                 {distinctWards.map(w => <option key={w} value={w}>{w}</option>)}
               </select>
             </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative">
            {/* Variable X Selector */}
            <div className="space-y-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 p-6 rounded-[2rem] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold">
                   <div className="h-8 w-8 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm shadow-inner">X</div>
                   <span className="tracking-tight text-lg">Independent Factors</span>
                </div>
                
                {selectedVars1.length > 1 && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-black uppercase ring-1 ring-slate-200 dark:ring-slate-700">
                    <button 
                      onClick={() => setLogicMode1('any')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${logicMode1 === 'any' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      Any Of
                    </button>
                    <button 
                      onClick={() => setLogicMode1('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${logicMode1 === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      All Of
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">1. Choose Category</label>
                   <select 
                     value={cat1} 
                     onChange={e => {
                       setCat1(e.target.value)
                       setSelectedVars1([categorizedGroups[e.target.value]?.[0]?.id || ''])
                       setSearchTerm1('') // Reset search on category change for clarity
                     }}
                     className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                   >
                     {Object.keys(categorizedGroups).map(cat => (
                       <option key={`c1-${cat}`} value={cat}>{cat}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div>
                   <div className="flex items-center justify-between mb-2 px-1">
                     <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">2. Select Factors</label>
                     <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-bold">{selectedVars1.length} selected</span>
                   </div>

                   {/* Search Bar for Factors */}
                   <div className="relative mb-3 group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                     <input 
                       type="text"
                       placeholder={`Search in ${cat1}...`}
                       value={searchTerm1}
                       onChange={e => setSearchTerm1(e.target.value)}
                       className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                     />
                   </div>

                   <div className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100/60 dark:border-slate-700/60 rounded-2xl max-h-[220px] overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                     {categorizedGroups[cat1]?.filter(v => v.label.toLowerCase().includes(searchTerm1.toLowerCase())).map(v => (
                       <label key={`v1-chk-${v.id}`} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl transition-all border border-transparent hover:bg-white dark:hover:bg-slate-700 ${selectedVars1.includes(v.id) ? 'bg-white dark:bg-slate-700 border-indigo-100 dark:border-indigo-900/30 shadow-xs' : ''}`}>
                         <div className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedVars1.includes(v.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-200 dark:border-slate-600'}`}>
                           <input 
                             type="checkbox"
                             checked={selectedVars1.includes(v.id)}
                             onChange={e => {
                               if (e.target.checked) setSelectedVars1(prev => [...prev, v.id])
                               else setSelectedVars1(prev => prev.filter(x => x !== v.id))
                             }}
                             className="hidden"
                           />
                           {selectedVars1.includes(v.id) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                         </div>
                         <div className="flex flex-col">
                           <span className={`text-sm font-semibold transition-colors ${selectedVars1.includes(v.id) ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                             {v.label}
                           </span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.type}</span>
                         </div>
                       </label>
                     ))}
                     {categorizedGroups[cat1]?.filter(v => v.label.toLowerCase().includes(searchTerm1.toLowerCase())).length === 0 && (
                       <div className="py-8 text-center text-slate-400 text-xs font-medium italic">No matches for "{searchTerm1}"</div>
                     )}
                   </div>
                 </div>
              </div>
            </div>

            {/* Variable Y Selector (Now Symmetrical) */}
            <div className="space-y-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 p-6 rounded-[2rem] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400 font-bold">
                   <div className="h-8 w-8 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-sm shadow-inner">Y</div>
                   <span className="tracking-tight text-lg">Dependent Outcomes</span>
                </div>
                
                {selectedVars2.length > 1 && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-black uppercase ring-1 ring-slate-200 dark:ring-slate-700">
                    <button 
                      onClick={() => setLogicMode2('any')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${logicMode2 === 'any' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      Any Of
                    </button>
                    <button 
                      onClick={() => setLogicMode2('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${logicMode2 === 'all' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      All Of
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">1. Choose Category</label>
                   <select 
                     value={cat2} 
                     onChange={e => {
                       setCat2(e.target.value)
                       setSelectedVars2([categorizedGroups[e.target.value]?.[0]?.id || ''])
                       setSearchTerm2('')
                     }}
                     className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer"
                   >
                     {Object.keys(categorizedGroups).map(cat => (
                       <option key={`c2-${cat}`} value={cat}>{cat}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div>
                   <div className="flex items-center justify-between mb-2 px-1">
                     <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">2. Select Factors</label>
                     <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-bold">{selectedVars2.length} selected</span>
                   </div>

                   {/* Search Bar for Factors */}
                   <div className="relative mb-3 group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                     <input 
                       type="text"
                       placeholder={`Search in ${cat2}...`}
                       value={searchTerm2}
                       onChange={e => setSearchTerm2(e.target.value)}
                       className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-violet-500/10 transition-all"
                     />
                   </div>

                   <div className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100/60 dark:border-slate-700/60 rounded-2xl max-h-[220px] overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                     {categorizedGroups[cat2]?.filter(v => v.label.toLowerCase().includes(searchTerm2.toLowerCase())).map(v => (
                       <label key={`v2-chk-${v.id}`} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl transition-all border border-transparent hover:bg-white dark:hover:bg-slate-700 ${selectedVars2.includes(v.id) ? 'bg-white dark:bg-slate-700 border-violet-100 dark:border-violet-900/30 shadow-xs' : ''}`}>
                         <div className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedVars2.includes(v.id) ? 'bg-violet-500 border-violet-500' : 'border-slate-200 dark:border-slate-600'}`}>
                           <input 
                             type="checkbox"
                             checked={selectedVars2.includes(v.id)}
                             onChange={e => {
                               if (e.target.checked) setSelectedVars2(prev => [...prev, v.id])
                               else setSelectedVars2(prev => prev.filter(x => x !== v.id))
                             }}
                             className="hidden"
                           />
                           {selectedVars2.includes(v.id) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                         </div>
                         <div className="flex flex-col">
                           <span className={`text-sm font-semibold transition-colors ${selectedVars2.includes(v.id) ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                             {v.label}
                           </span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.type}</span>
                         </div>
                       </label>
                     ))}
                     {categorizedGroups[cat2]?.filter(v => v.label.toLowerCase().includes(searchTerm2.toLowerCase())).length === 0 && (
                       <div className="py-8 text-center text-slate-400 text-xs font-medium italic">No matches for "{searchTerm2}"</div>
                     )}
                   </div>
                 </div>
              </div>
            </div>
          </div>

            {/* Action Bar (Run Analysis & Export) */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-12 mb-8">
               {pythonResults && (
                 <>
                   <button 
                     onClick={() => exportResearchToExcel({
                       objective: userObjective || "Statistical Analysis",
                       varX: selectedVars1.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label || "Indep" : "Composite (X)",
                       varY: selectedVars2.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label || "Dep" : "Composite (Y)",
                       math: pythonResults,
                       data: patients.map(p => ({
                         name: p.name,
                         doctor_ward: p.doctor_ward,
                         age: p.age,
                         x_val: computeCompositeVal(p, selectedVars1, logicMode1),
                         y_val: computeCompositeVal(p, selectedVars2, logicMode2)
                       }))
                     })}
                     className="flex items-center gap-2.5 px-6 py-4 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all shadow-sm"
                   >
                     <Table className="h-4 w-4" />
                     Download Tables (Excel)
                   </button>

                   <button 
                     onClick={() => exportResearchToWord({
                       objective: userObjective || "Doctor Narrative Report",
                       varX: selectedVars1.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars1[0])?.label || "Indep" : "Composite (X)",
                       varY: selectedVars2.length === 1 ? ALL_VARIABLES.find(v => v.id === selectedVars2[0])?.label || "Dep" : "Composite (Y)",
                       math: pythonResults,
                       aiReport: report,
                       data: [] // Narrative doesn't need raw data
                     })}
                     className="flex items-center gap-2.5 px-6 py-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-bold text-xs border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all shadow-sm"
                   >
                     <FileText className="h-4 w-4" />
                     Download Narrative (Word)
                   </button>
                 </>
               )}

               <button 
                 onClick={runAnalysis} 
                 disabled={isAnalyzing || selectedVars1.length === 0 || selectedVars2.length === 0}
                 className="group relative overflow-hidden bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-10 py-4.5 rounded-[2rem] font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-xl hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
               >
                  <div className="flex items-center gap-3 relative z-10">
                     {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sigma className="h-5 w-5 group-hover:rotate-12 transition-transform" />}
                     <span>{pythonResults ? 'Refresh Computation' : 'Run Advanced Computation'}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
               </button>
            </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
           {!aiEnabled ? (
             <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <BrainCircuit className="h-8 w-8" />
                </div>
                <div className="text-center max-w-sm">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">AI Investigator Restricted</h4>
                  <p className="text-sm text-slate-500 mt-2">Natural language research synthesis is currently disabled for your account by the administrator.</p>
                </div>
             </div>
           ) : (
             <>
               <textarea 
                 value={userObjective} onChange={e => setUserObjective(e.target.value)}
                 placeholder="Describe the clinical correlation you wish to discover in plain English..."
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 min-h-[160px] font-medium outline-none resize-none focus:border-indigo-500 transition"
               />
               <div className="mt-4 flex justify-end">
                 <button 
                   onClick={runAnalysis} disabled={isAnalyzing || !userObjective}
                   className="bg-slate-900 dark:bg-violet-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition"
                 >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Synthesize Report
                 </button>
               </div>
             </>
           )}
        </div>
      )}

      {pythonResults && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 mt-8 shadow-sm">
           <div className="flex flex-wrap items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Math Engine Results</h3>
              <div className={`px-4 py-1.5 rounded-lg text-sm font-bold ${pythonResults.p_value < 0.05 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                 p = {pythonResults.p_value !== null ? pythonResults.p_value.toExponential(3) : 'N/A'}
              </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl">
                 <div className="text-xs font-bold text-slate-500 mb-1">Applied Test</div>
                 <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{pythonResults.test_used}</div>
              </div>
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl">
                 <div className="text-xs font-bold text-slate-500 mb-1">Statistic Matrix</div>
                 <div className="text-lg font-bold text-slate-900 dark:text-white">{pythonResults.statistic !== null ? pythonResults.statistic.toFixed(4) : 'N/A'}</div>
              </div>
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl">
                 <div className="text-xs font-bold text-slate-500 mb-1">Valid Sample Pairs</div>
                 <div className="text-lg font-bold text-slate-900 dark:text-white">n = {pythonResults.n_samples}</div>
              </div>
           </div>

           {/* HIGH-IMPACT VISUALIZATION */}
           <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                 <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                 <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Visual Correlation Map</h4>
              </div>
              {renderChart()}
           </div>
        </div>
      )}

      {report && (
        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 mt-8 shadow-2xl">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">AI Clinical Interpretation</h3>
           </div>
           <div className="prose prose-invert max-w-none prose-headings:font-bold prose-a:text-indigo-400">
              <ReactMarkdown>{report}</ReactMarkdown>
           </div>
        </div>
      )}
    </div>
  )
}
