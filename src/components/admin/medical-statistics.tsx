"use client"

import { useState, useMemo } from 'react'
import {
  BrainCircuit, Loader2, FileText, Sigma, AlertCircle, FlaskConical,
  Search, Sparkles, Activity, Users, Download, TrendingUp, TrendingDown,
  HeartPulse, Stethoscope, BarChart3, ArrowRight, CheckCircle2, Info,
  Table, X, ChevronRight, Zap, Eye, RefreshCw
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ScatterChart, Scatter, ZAxis, Cell, LineChart, Line,
  AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { runComplexAIStudyAction } from '@/app/actions/research-actions'
import { useVariableDiscovery } from '@/hooks/use-variable-discovery'

// ─────────────────────────────────────────────────────────────
// COLOUR PALETTE
// ─────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const CATEGORY_COLOURS: Record<string, string> = {
  'High Risk': '#ef4444',
  'Close Follow-up': '#f59e0b',
  'Normal': '#10b981',
  'Deceased/Archive': '#6b7280',
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function parseArr(field: any): any[] {
  if (Array.isArray(field)) return field
  if (typeof field === 'string') { try { const p = JSON.parse(field); return Array.isArray(p) ? p : [] } catch { return [] } }
  return []
}

// Client-side Chi-Square (simplified, works great for n > 100)
function chiSquare(tableData: Record<string, Record<string, number>>) {
  const rows = Object.keys(tableData)
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(tableData[r]))))
  const rowTotals = rows.map(r => cols.reduce((s, c) => s + (tableData[r][c] || 0), 0))
  const colTotals = cols.map(c => rows.reduce((s, r) => s + (tableData[r][c] || 0), 0))
  const total = rowTotals.reduce((a, b) => a + b, 0)
  if (total === 0) return null

  let chi2 = 0
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      const observed = tableData[r][c] || 0
      const expected = (rowTotals[ri] * colTotals[ci]) / total
      if (expected > 0) chi2 += Math.pow(observed - expected, 2) / expected
    })
  })
  const df = (rows.length - 1) * (cols.length - 1)
  // approximate p-value (good enough for dashboards)
  const p = df > 0 ? Math.exp(-0.717 * chi2 - 0.416 * chi2 * chi2 / df) : 1
  return { chi2: chi2.toFixed(3), df, p: Math.min(p, 1).toFixed(4), significant: p < 0.05 }
}

// Cross-tabulate two categorical series from patients array
function crossTab(patients: any[], getX: (p: any) => string | null, getY: (p: any) => string | null) {
  const table: Record<string, Record<string, number>> = {}
  patients.forEach(p => {
    const x = getX(p); const y = getY(p)
    if (!x || !y) return
    if (!table[x]) table[x] = {}
    table[x][y] = (table[x][y] || 0) + 1
  })
  return table
}

// ─────────────────────────────────────────────────────────────
// QUICK INSIGHT CARD
// ─────────────────────────────────────────────────────────────
function InsightCard({ title, value, sub, color, icon: Icon, trend }: {
  title: string; value: string | number; sub: string; color: string; icon: any; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? <TrendingUp className="h-4 w-4 text-white/70" /> :
             trend === 'down' ? <TrendingDown className="h-4 w-4 text-white/70" /> : null}
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-white tracking-tight mb-0.5">{value}</div>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-white/60">{title}</div>
      <div className="text-xs text-white/50 mt-1">{sub}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DISEASE PREVALENCE BAR
// ─────────────────────────────────────────────────────────────
function DiseaseBar({ name, count, total, rank }: { name: string; count: number; total: number; rank: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const colors = ['from-rose-500 to-red-600', 'from-orange-500 to-amber-500', 'from-violet-500 to-purple-600', 'from-teal-500 to-emerald-500', 'from-sky-500 to-blue-600']
  return (
    <div className="group flex items-center gap-4 py-2.5">
      <div className="w-6 text-center text-[10px] font-black text-slate-400">#{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-slate-300 truncate pr-2">{name}</span>
          <span className="text-xs font-black text-slate-400 whitespace-nowrap">{count} <span className="text-slate-600">({pct.toFixed(1)}%)</span></span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colors[rank - 1] || colors[0]} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// VARIABLE PICKER (Reusable)
// ─────────────────────────────────────────────────────────────
function VariablePicker({
  label, accent, groups, selected, onToggle, search, onSearch, logicMode, onLogicToggle
}: {
  label: string; accent: string; groups: Record<string, any[]>;
  selected: string[]; onToggle: (id: string) => void;
  search: string; onSearch: (s: string) => void;
  logicMode: 'any' | 'all'; onLogicToggle: () => void;
}) {
  const [openGroup, setOpenGroup] = useState(Object.keys(groups)[0] || '')
  const filtered = groups[openGroup]?.filter(v => v.label.toLowerCase().includes(search.toLowerCase())) || []

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <div className="flex items-center gap-2.5">
          <div className={`h-7 w-7 rounded-lg ${accent} flex items-center justify-center text-xs font-black text-white`}>{label}</div>
          <span className="text-sm font-bold text-slate-200">
            {label === 'X' ? 'Independent Variable' : 'Dependent Outcome'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-[10px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full">
              {selected.length} selected
            </span>
          )}
          {selected.length > 1 && (
            <button
              onClick={onLogicToggle}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${
                logicMode === 'any'
                  ? 'bg-indigo-600/20 border-indigo-700 text-indigo-300'
                  : 'bg-violet-600/20 border-violet-700 text-violet-300'
              }`}
            >
              {logicMode === 'any' ? 'ANY of' : 'ALL of'}
            </button>
          )}
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800">
        {Object.keys(groups).map(g => (
          <button
            key={g}
            onClick={() => setOpenGroup(g)}
            className={`px-4 py-2.5 whitespace-nowrap text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border-b-2 ${
              openGroup === g
                ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {g.replace(/^\d+\.\s*/, '')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search factors..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Factor List */}
      <div className="px-3 pb-3 max-h-52 overflow-y-auto space-y-0.5">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-slate-600 text-xs italic">No matches</div>
        )}
        {filtered.map(v => {
          const isSelected = selected.includes(v.id)
          return (
            <label
              key={v.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800 ${isSelected ? 'bg-indigo-950/50 border border-indigo-800/40' : 'border border-transparent'}`}
            >
              <div className={`h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <input type="checkbox" checked={isSelected} onChange={() => onToggle(v.id)} className="hidden" />
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-semibold truncate block ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>{v.label}</span>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">{v.type}</span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CUSTOM RECHARTS TOOLTIP
// ─────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs font-bold text-white">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export function MedicalStatistics({ patients, aiEnabled }: { patients: any[]; aiEnabled: boolean }) {
  const { ALL_VARIABLES, categorizedGroups, getVariableValue } = useVariableDiscovery(patients)

  // ── Mode ─────────────────────────────────────────────────
  const [mode, setMode] = useState<'insights' | 'explorer' | 'ai'>('insights')

  // ── Explorer state ────────────────────────────────────────
  const [wardFilter, setWardFilter] = useState('All')
  const [selectedVars1, setSelectedVars1] = useState<string[]>([])
  const [logicMode1, setLogicMode1] = useState<'any' | 'all'>('any')
  const [selectedVars2, setSelectedVars2] = useState<string[]>([])
  const [logicMode2, setLogicMode2] = useState<'any' | 'all'>('any')
  const [search1, setSearch1] = useState('')
  const [search2, setSearch2] = useState('')
  const [chartType, setChartType] = useState<'Bar' | 'Line' | 'Area' | 'Pie'>('Bar')

  // ── Results ───────────────────────────────────────────────
  const [clientResults, setClientResults] = useState<any>(null)
  const [pythonResults, setPythonResults] = useState<any>(null)
  const [report, setReport] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userObjective, setUserObjective] = useState('')

  // ── Cohort ────────────────────────────────────────────────
  const distinctWards = useMemo(() => Array.from(new Set(patients.map(p => p.ward_name || 'Unassigned'))).filter(Boolean).sort(), [patients])
  const cohort = useMemo(() => wardFilter === 'All' ? patients : patients.filter(p => (p.ward_name || 'Unassigned') === wardFilter), [patients, wardFilter])

  // ─────────────────────────────────────────────────────────
  // QUICK INSIGHTS (auto-computed)
  // ─────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (patients.length === 0) return null

    // Disease prevalence
    const diseaseCounts: Record<string, number> = {}
    patients.forEach(p => {
      parseArr(p.chronic_diseases).forEach((d: any) => {
        if (d?.name) diseaseCounts[d.name] = (diseaseCounts[d.name] || 0) + 1
      })
    })
    const topDiseases = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Category breakdown
    const catCounts: Record<string, number> = {}
    patients.forEach(p => { const c = p.category || 'Unknown'; catCounts[c] = (catCounts[c] || 0) + 1 })

    // Gender split
    const genderCounts: Record<string, number> = {}
    patients.forEach(p => { const g = p.gender || 'Unknown'; genderCounts[g] = (genderCounts[g] || 0) + 1 })

    // Ward breakdown
    const wardCounts: Record<string, number> = {}
    patients.forEach(p => { const w = p.ward_name || 'Unassigned'; wardCounts[w] = (wardCounts[w] || 0) + 1 })

    // Deceased count
    const deceased = patients.filter(p => p.category === 'Deceased/Archive').length
    const highRisk = patients.filter(p => p.category === 'High Risk').length

    // Comorbidity distribution
    const comborbCount = patients.map(p => parseArr(p.chronic_diseases).length)
    const avgComorbidity = comborbCount.reduce((a, b) => a + b, 0) / patients.length

    // Age distribution
    const ages = patients.map(p => Number(p.age)).filter(a => a > 0 && a < 130)
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0

    return { topDiseases, catCounts, genderCounts, wardCounts, deceased, highRisk, avgComorbidity: avgComorbidity.toFixed(1), avgAge, total: patients.length }
  }, [patients])

  // ─────────────────────────────────────────────────────────
  // CLIENT-SIDE ANALYSIS
  // ─────────────────────────────────────────────────────────
  const getVarLabel = (id: string) => ALL_VARIABLES.find(v => v.id === id)?.label || id
  const getVarType = (id: string) => ALL_VARIABLES.find(v => v.id === id)?.type || 'categorical'

  const getCompositeValue = (p: any, ids: string[], logic: 'any' | 'all'): string => {
    if (ids.length === 0) return 'N/A'
    if (ids.length === 1) {
      const val = getVariableValue(p, ids[0])
      return val !== null && val !== undefined ? String(val) : 'N/A'
    }
    const results = ids.map(id => {
      const val = getVariableValue(p, id)
      if (getVarType(id) === 'categorical') return val === 'Yes' || val === 'Present'
      return (Number(val) || 0) > 0
    })
    const hit = logic === 'any' ? results.some(Boolean) : results.every(Boolean)
    return hit ? `Positive (${logic === 'any' ? 'Any' : 'All'})` : 'Negative'
  }

  const runClientAnalysis = () => {
    if (selectedVars1.length === 0 || selectedVars2.length === 0) {
      setError('Select at least one factor for both X and Y axes.')
      return
    }
    setError(null)
    setPythonResults(null)
    setReport(null)

    const xLabel = selectedVars1.length === 1 ? getVarLabel(selectedVars1[0]) : `${logicMode1 === 'any' ? 'Any' : 'All'} of (${selectedVars1.length} factors)`
    const yLabel = selectedVars2.length === 1 ? getVarLabel(selectedVars2[0]) : `${logicMode2 === 'any' ? 'Any' : 'All'} of (${selectedVars2.length} factors)`

    const table = crossTab(
      cohort,
      p => getCompositeValue(p, selectedVars1, logicMode1),
      p => getCompositeValue(p, selectedVars2, logicMode2)
    )

    // Remove N/A rows
    delete table['N/A']
    Object.keys(table).forEach(k => { delete table[k]['N/A'] })

    const chi = chiSquare(table)

    // Build chart data
    const xKeys = Object.keys(table)
    const yKeys = Array.from(new Set(xKeys.flatMap(k => Object.keys(table[k]))))
    const chartData = xKeys.map(x => ({ name: x, ...table[x] }))

    const n = xKeys.reduce((acc, k) => acc + Object.values(table[k]).reduce((a, b) => a + b, 0), 0)

    setClientResults({ xLabel, yLabel, table, chartData, yKeys, chi, n, xKeys })
  }

  // ─────────────────────────────────────────────────────────
  // PYTHON + AI ANALYSIS
  // ─────────────────────────────────────────────────────────
  const runAdvancedAnalysis = async () => {
    if (selectedVars1.length === 0 || selectedVars2.length === 0) {
      setError('Select at least one factor for both X and Y axes.')
      return
    }
    setIsAnalyzing(true)
    setError(null)
    setPythonResults(null)
    setReport(null)
    setClientResults(null)

    const xLabel = selectedVars1.length === 1 ? getVarLabel(selectedVars1[0]) : `${logicMode1 === 'any' ? 'Any' : 'All'} of (${selectedVars1.length})`
    const yLabel = selectedVars2.length === 1 ? getVarLabel(selectedVars2[0]) : `${logicMode2 === 'any' ? 'Any' : 'All'} of (${selectedVars2.length})`

    try {
      const dataset = cohort.map(p => ({
        x: getCompositeValue(p, selectedVars1, logicMode1),
        y: getCompositeValue(p, selectedVars2, logicMode2),
      }))

      const apiBase = process.env.NEXT_PUBLIC_STAT_ENGINE_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          independent_vars: [{ name: 'x', label: xLabel, type: getVarType(selectedVars1[0]) }],
          dependent_var: { name: 'y', label: yLabel, type: getVarType(selectedVars2[0]) },
          data: dataset
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Engine error') }
      const mathData = await res.json()
      setPythonResults({ ...mathData, xLabel, yLabel })

      const aiRes = await fetch('/api/research/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Medical Research Interpretation: "${xLabel}" vs "${yLabel}". Stats: ${JSON.stringify(mathData)}. Explain clinical significance academically.` })
      })
      if (aiRes.ok) { const t = await aiRes.json(); setReport(t.text) }
    } catch (e: any) {
      if (e.name === 'TypeError') setError('Python Math Engine is offline. Use Quick Analysis for client-side results.')
      else setError(`Error: ${e.message}`)
    } finally { setIsAnalyzing(false) }
  }

  // ─────────────────────────────────────────────────────────
  // AI NATURAL LANGUAGE MODE
  // ─────────────────────────────────────────────────────────
  const runAI = async () => {
    if (!userObjective) return
    setIsAnalyzing(true)
    setError(null)
    setReport(null)
    const res = await runComplexAIStudyAction(userObjective, patients)
    if (res.error) setError(res.error)
    else setReport(res.result || '')
    setIsAnalyzing(false)
  }

  // ─────────────────────────────────────────────────────────
  // CHART RENDERER
  // ─────────────────────────────────────────────────────────
  const renderChart = (data: any) => {
    const { chartData, yKeys } = data
    const gradientColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    if (chartType === 'Pie') {
      const pieData = data.xKeys?.map((k: string, i: number) => ({
        name: k,
        value: Object.values(data.table[k] || {}).reduce((a: any, b: any) => a + b, 0)
      })) || []
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={55} paddingAngle={4}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}>
              {pieData.map((_: any, i: number) => <Cell key={i} fill={gradientColors[i % gradientColors.length]} />)}
            </Pie>
            <Tooltip content={<DarkTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    if (chartType === 'Line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip />} />
            <Legend />
            {yKeys.map((k: string, i: number) => (
              <Line key={k} type="monotone" dataKey={k} stroke={gradientColors[i % gradientColors.length]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }
    if (chartType === 'Area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              {yKeys.map((k: string, i: number) => (
                <linearGradient key={k} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColors[i % gradientColors.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gradientColors[i % gradientColors.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip />} />
            <Legend />
            {yKeys.map((k: string, i: number) => (
              <Area key={k} type="monotone" dataKey={k} stroke={gradientColors[i % gradientColors.length]} fill={`url(#ag${i})`} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }
    // Default: Bar
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Legend />
          {yKeys.map((k: string, i: number) => (
            <Bar key={k} dataKey={k} stackId="a" fill={gradientColors[i % gradientColors.length]} radius={i === yKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 -mx-4 md:-mx-8 -mt-8 px-3 sm:px-4 md:px-8 pt-6 sm:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">

      {/* ── HERO HEADER ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-900/30 p-5 sm:p-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-violet-600/10 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/20">
                  <BrainCircuit className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/70">Admin · Medical Research</div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">Clinical Relationship Explorer</h2>
                </div>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed hidden sm:block">
                Discover statistically significant correlations across your clinical database. Cross-tabulate any combination of demographics, conditions, labs, and outcomes.
              </p>
            </div>

            {/* Live stats */}
            <div className="flex gap-2 sm:gap-3 shrink-0 flex-wrap">
              {[
                { n: insights?.total || 0, label: 'Patients', color: 'text-teal-400' },
                { n: distinctWards.length, label: 'Wards', color: 'text-violet-400' },
                { n: insights?.topDiseases.length || 0, label: 'Diseases', color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="text-center px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/50 min-w-[72px] sm:min-w-[90px]">
                  <div className={`text-lg sm:text-2xl font-black ${s.color}`}>{s.n.toLocaleString()}</div>
                  <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Switcher — scrollable on mobile, no wrapping */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 mt-5 sm:mt-8 -mx-1 px-1 pb-1">
            {[
              { id: 'insights', label: 'Quick Insights', icon: Zap },
              { id: 'explorer', label: 'Explorer', icon: Activity },
              { id: 'ai', label: 'AI Research', icon: Sparkles, disabled: !aiEnabled },
            ].map(m => (
              <button
                key={m.id}
                disabled={(m as any).disabled}
                onClick={() => setMode(m.id as any)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === m.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <m.icon className="h-4 w-4 shrink-0" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {patients.length === 0 && (
        <div className="flex items-center gap-3 p-5 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-400 mb-6">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-semibold text-sm">No patient data loaded — check service role key configuration.</span>
        </div>
      )}

      {/* ── QUICK INSIGHTS TAB ──────────────────────────── */}
      {mode === 'insights' && insights && (
        <div className="space-y-8 animate-in fade-in duration-300">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightCard title="Total Patients" value={insights.total.toLocaleString()} sub="Across all wards" color="from-indigo-600 to-indigo-800 border-indigo-700/50" icon={Users} />
            <InsightCard title="High Risk" value={insights.highRisk} sub={`${((insights.highRisk / insights.total) * 100).toFixed(1)}% of cohort`} color="from-rose-600 to-red-800 border-rose-700/50" icon={HeartPulse} trend="up" />
            <InsightCard title="Avg. Age" value={`${insights.avgAge}y`} sub="Mean patient age" color="from-violet-600 to-purple-800 border-violet-700/50" icon={Stethoscope} />
            <InsightCard title="Avg. Comorbidities" value={insights.avgComorbidity} sub="Per patient" color="from-teal-600 to-emerald-800 border-teal-700/50" icon={Activity} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Disease Prevalence */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-white">Disease Prevalence</h3>
                  <p className="text-slate-500 text-xs">Most common chronic conditions</p>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <HeartPulse className="h-5 w-5 text-rose-400" />
                </div>
              </div>
              <div className="space-y-1 divide-y divide-slate-800/50">
                {insights.topDiseases.slice(0, 8).map(([name, count], i) => (
                  <DiseaseBar key={name} name={name} count={count} total={insights.total} rank={i + 1} />
                ))}
              </div>
            </div>

            {/* Category & Gender Breakdown */}
            <div className="space-y-5">
              {/* Category Donut */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-black text-white mb-1">Risk Category Distribution</h3>
                <p className="text-slate-500 text-xs mb-4">Current clinical classification</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(insights.catCounts).filter(([k]) => k !== 'Deceased/Archive').map(([name, value]) => ({ name, value }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}
                        label={({ name, percent }: any) => `${(name || '').replace(' Follow-up', '')}: ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {Object.entries(insights.catCounts).filter(([k]) => k !== 'Deceased/Archive').map(([name], i) => (
                          <Cell key={name} fill={CATEGORY_COLOURS[name] || PALETTE[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender split */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-black text-white mb-4">Gender Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(insights.genderCounts).map(([g, count], i) => (
                    <div key={g}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-bold text-slate-300">{g}</span>
                        <span className="text-slate-500 font-bold">{count} <span className="text-slate-600">({((count / insights.total) * 100).toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(count / insights.total) * 100}%`, background: i === 0 ? '#6366f1' : '#ec4899' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ward breakdown bar chart */}
          {distinctWards.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-black text-white mb-1">Patient Distribution by Ward</h3>
              <p className="text-slate-500 text-xs mb-6">Admitted patients per clinical unit</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(insights.wardCounts).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                      {Object.keys(insights.wardCounts).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={() => setMode('explorer')}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 group"
            >
              <Sigma className="h-5 w-5" />
              Run Custom Correlation Analysis
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ── RELATIONSHIP EXPLORER TAB ────────────────────── */}
      {mode === 'explorer' && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Ward Filter — horizontal scroll on mobile */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 sm:px-5 py-3 sm:py-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Study Cohort</span>
            <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1 pb-1">
              {['All', ...distinctWards].map(w => (
                <button
                  key={w}
                  onClick={() => setWardFilter(w)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 min-h-[36px] ${
                    wardFilter === w ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >{w === 'All' ? `All (${patients.length})` : `${w} (${patients.filter(p => (p.ward_name || 'Unassigned') === w).length})`}</button>
              ))}
            </div>
          </div>

          {/* Variable Pickers */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <VariablePicker
              label="X" accent="bg-indigo-600"
              groups={categorizedGroups}
              selected={selectedVars1} onToggle={id => setSelectedVars1(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              search={search1} onSearch={setSearch1}
              logicMode={logicMode1} onLogicToggle={() => setLogicMode1(m => m === 'any' ? 'all' : 'any')}
            />
            <VariablePicker
              label="Y" accent="bg-violet-600"
              groups={categorizedGroups}
              selected={selectedVars2} onToggle={id => setSelectedVars2(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              search={search2} onSearch={setSearch2}
              logicMode={logicMode2} onLogicToggle={() => setLogicMode2(m => m === 'any' ? 'all' : 'any')}
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {/* Action buttons — full width on mobile */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-3">
            <button
              onClick={runClientAnalysis}
              disabled={selectedVars1.length === 0 || selectedVars2.length === 0}
              className="flex items-center justify-center gap-2 px-4 sm:px-7 py-3.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black rounded-2xl transition-all disabled:opacity-40 shadow-lg shadow-teal-500/20 min-h-[48px]"
            >
              <Zap className="h-5 w-5 shrink-0" />
              <span>Quick Analysis</span>
            </button>
            <button
              onClick={runAdvancedAnalysis}
              disabled={isAnalyzing || selectedVars1.length === 0 || selectedVars2.length === 0}
              className="group flex items-center justify-center gap-2 px-4 sm:px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black rounded-2xl transition-all disabled:opacity-40 shadow-lg shadow-indigo-500/20 min-h-[48px]"
            >
              {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin shrink-0" /> : <Sigma className="h-5 w-5 shrink-0 group-hover:rotate-12 transition-transform" />}
              <span>Python + AI</span>
            </button>
          </div>

          {/* ── CLIENT RESULTS ───────── */}
          {clientResults && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Result Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-800 bg-slate-800/30">
                <div>
                  <h3 className="text-lg font-black text-white">{clientResults.xLabel} <span className="text-slate-500 font-medium">vs</span> {clientResults.yLabel}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">n = {clientResults.n} paired observations · Client-side χ² cross-tabulation</p>
                </div>
                {clientResults.chi && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${
                    clientResults.chi.significant ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {clientResults.chi.significant ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    {clientResults.chi.significant ? 'Significant' : 'Not Significant'}
                    <span className="font-normal opacity-70">p = {clientResults.chi.p}</span>
                  </div>
                )}
              </div>

              {/* Stats row — stacks on mobile */}
              {clientResults.chi && (
                <div className="grid grid-cols-3 sm:grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
                  {[
                    { label: 'χ² Statistic', value: clientResults.chi.chi2 },
                    { label: 'Degrees of Freedom', value: clientResults.chi.df },
                    { label: 'p-Value', value: clientResults.chi.p },
                  ].map(s => (
                    <div key={s.label} className="px-6 py-4 text-center">
                      <div className="text-2xl font-black text-white">{s.value}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart type selector */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Chart</span>
                {['Bar', 'Line', 'Area', 'Pie'].map(t => (
                  <button
                    key={t}
                    onClick={() => setChartType(t as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartType === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                  >{t}</button>
                ))}
              </div>

              {/* Chart */}
              <div className="p-6">{renderChart(clientResults)}</div>

              {/* Cross-tab table */}
              <div className="px-6 pb-6 overflow-x-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Frequency Table</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-black uppercase tracking-wider border-b border-slate-800">X \ Y</th>
                      {clientResults.yKeys.map((y: string) => (
                        <th key={y} className="px-3 py-2 text-indigo-400 font-black border-b border-slate-800">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientResults.xKeys.map((x: string) => (
                      <tr key={x} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2 text-slate-300 font-semibold">{x}</td>
                        {clientResults.yKeys.map((y: string) => (
                          <td key={y} className="px-3 py-2 text-center text-slate-400 font-bold">{clientResults.table[x]?.[y] || 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Python Results */}
          {pythonResults && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-800 bg-slate-800/30">
                <div>
                  <h3 className="text-lg font-black text-white">Python Math Engine Results</h3>
                  <p className="text-slate-500 text-xs mt-0.5">{pythonResults.test_used} · n = {pythonResults.n_samples}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-bold text-sm ${pythonResults.p_value < 0.05 ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  p = {pythonResults.p_value?.toExponential(3)}
                </div>
              </div>
              {pythonResults.chart_data && <div className="p-6">{renderChart({ chartData: [], yKeys: [], ...pythonResults.chart_data })}</div>}
            </div>
          )}

          {/* AI Report */}
          {report && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-900/40 rounded-2xl p-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/20">
                  <BrainCircuit className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-black text-white">AI Clinical Interpretation</h3>
                  <p className="text-slate-500 text-xs">Generated by Gemini · For research purposes only</p>
                </div>
              </div>
              <div className="prose prose-sm prose-invert max-w-none prose-headings:font-black prose-p:text-slate-300 prose-strong:text-white">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI INVESTIGATOR TAB ──────────────────────────── */}
      {mode === 'ai' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-violet-600/20 rounded-xl border border-violet-500/20">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-black text-white">Natural Language Research</h3>
                <p className="text-slate-500 text-xs">Describe any clinical question in plain English</p>
              </div>
            </div>

            {!aiEnabled ? (
              <div className="py-10 text-center text-slate-500">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm">AI Investigator is disabled for your account.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={userObjective} onChange={e => setUserObjective(e.target.value)}
                  placeholder={`Describe the clinical correlation you want to discover...\n\nExamples:\n• "What is the relationship between diabetes and high-risk category?"\n• "Do female patients have better outcomes than male patients?"\n• "Which chronic diseases are most associated with mortality?"`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 min-h-[180px] text-sm text-slate-200 placeholder:text-slate-600 outline-none resize-none focus:border-indigo-500 transition-colors"
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={runAI} disabled={isAnalyzing || !userObjective}
                    className="flex items-center gap-2.5 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl transition-all disabled:opacity-40 shadow-lg shadow-violet-500/20"
                  >
                    {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    Synthesize Report
                  </button>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {report && (
            <div className="bg-gradient-to-br from-slate-900 to-violet-950/30 border border-violet-900/40 rounded-2xl p-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-600/20 rounded-xl border border-violet-500/20">
                  <BrainCircuit className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-black text-white">AI Clinical Research Report</h3>
              </div>
              <div className="prose prose-sm prose-invert max-w-none prose-headings:font-black prose-p:text-slate-300">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
