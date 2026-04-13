"use client"

import { useState } from "react"
import { ShieldAlert, Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUrgentInsights } from "@/app/actions/dashboard-actions"
import ReactMarkdown from "react-markdown"

export function UrgentInsights({ aiEnabled = true }: { aiEnabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!aiEnabled) return null;

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setIsOpen(true)
    try {
      const data = await getUrgentInsights()
      setInsights(data)
    } catch (err: any) {
      setError(err.message || "Failed to analyze ward")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ward Safety Monitor</h2>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={loading}
          variant="outline"
          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 gap-2 h-9"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {insights ? "Re-Analyze Ward" : "Analyze Ward Safety"}
        </Button>
      </div>

      {(isOpen || insights) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div 
            className="px-6 py-3 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5" />
              AI Clinical Supervisor Insights
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-red-400" /> : <ChevronDown className="h-4 w-4 text-red-400" />}
          </div>

          {isOpen && (
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4">
                    <ShieldAlert className="h-10 w-10 text-red-200 dark:text-red-900/40 animate-pulse" />
                    <Loader2 className="h-10 w-10 text-red-500 animate-spin absolute inset-0" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Scanning patient records for critical alerts...</p>
                  <p className="text-xs text-muted-foreground mt-1">Analyzing labs, meds, and follow-up schedules</p>
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : insights ? (
                <div className="prose prose-slate dark:prose-invert max-w-none 
                  prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:text-sm prose-p:leading-relaxed
                  prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-headings:mb-2 prose-headings:mt-4
                  prose-strong:text-red-600 dark:prose-strong:text-red-400 prose-strong:font-bold
                  prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:text-sm
                ">
                  <ReactMarkdown>{insights}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Click "Analyze Ward Safety" to start scanning.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
