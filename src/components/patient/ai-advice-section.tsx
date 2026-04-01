"use client"

import { useState } from "react"
import { Sparkles, Loader2, AlertCircle, RefreshCw, BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getClinicalAdvice } from "@/app/actions/ai-actions"
import ReactMarkdown from "react-markdown"

interface AIAdviceSectionProps {
  patientData: any
}

export function AIAdviceSection({ patientData }: AIAdviceSectionProps) {
  const [advice, setAdvice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetAdvice = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getClinicalAdvice(patientData)
      setAdvice(result)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to generate clinical advice. Please check your API key.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 italic">AI Clinical Advisor</h3>
            <p className="text-xs text-muted-foreground">Personalized management strategy based on hospital formulary</p>
          </div>
        </div>
        
        {!advice && !isLoading && (
          <Button 
            onClick={handleGetAdvice}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md border-none"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze & Optimize
          </Button>
        )}

        {advice && !isLoading && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGetAdvice}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Re-generate
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 animate-pulse">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Consulting with Gemini AI Advisor...</p>
          <p className="text-xs text-muted-foreground mt-1">Reviewing clinical history and lab trends</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Analysis Error</p>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {advice && !isLoading && (
        <div className="relative group overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-violet-500 to-purple-500 rounded-full" />
          
          <div className="pl-6 py-1 bg-white dark:bg-slate-900 rounded-r-2xl border-y border-r border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none p-5 text-slate-700 dark:text-slate-300">
              <ReactMarkdown 
                components={{
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-4 mb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-md font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mt-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-sm leading-relaxed" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-indigo-600 dark:text-indigo-300" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-amber-400 pl-4 bg-amber-50 dark:bg-amber-900/20 py-2 my-4 rounded-r-lg italic" {...props} />
                  )
                }}
              >
                {advice}
              </ReactMarkdown>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                AI Generated Clinical Suggestion
              </span>
              <p className="text-[10px] italic text-muted-foreground italic">Always verify with clinical judgement.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
