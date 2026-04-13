"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Loader2, AlertCircle, RefreshCw, BrainCircuit, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getClinicalAdvice } from "@/app/actions/ai-actions"
import ReactMarkdown from "react-markdown"

interface Message {
  role: "user" | "model"
  parts: { text: string }[]
}

interface Tip {
  emoji: string
  text: string
}

function toSearchStr(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') {
    try { val = JSON.parse(val) } catch { return val.toLowerCase() }
  }
  if (Array.isArray(val)) {
    return val.map((v: any) => (typeof v === 'object' ? Object.values(v).join(' ') : String(v))).join(' ').toLowerCase()
  }
  return String(val).toLowerCase()
}

function generateTips(p: any): Tip[] {
  const tips: Tip[] = []
  const conditions = toSearchStr(p.chronic_diseases)
  const psych = toSearchStr(p.psych_drugs)
  const medical = toSearchStr(p.medical_drugs)
  const hba1c = p.lastHba1c ?? p.investigations?.[0]?.hba1c
  const hb = p.lastHb ?? p.investigations?.[0]?.hb

  // Condition-based
  if (conditions.includes('diabet') || conditions.includes('dm'))
    tips.push({ emoji: '🩸', text: 'Optimize insulin titration & HbA1c targets' })
  if (conditions.includes('hypertens') || conditions.includes('htn'))
    tips.push({ emoji: '💊', text: 'Review HTN medication control & BP targets' })
  if (conditions.includes('renal') || conditions.includes('ckd') || conditions.includes('kidney'))
    tips.push({ emoji: '🧪', text: 'Assess renal precautions & dose adjustments' })
  if (conditions.includes('heart') || conditions.includes('cardiac') || conditions.includes('chf'))
    tips.push({ emoji: '❤️', text: 'Review cardiac medications & fluid status' })
  if (conditions.includes('liver') || conditions.includes('hepat'))
    tips.push({ emoji: '🟡', text: 'Assess hepatic drug metabolism & LFTs' })
  if (conditions.includes('thyroid'))
    tips.push({ emoji: '🦋', text: 'Review thyroid function & levothyroxine dosing' })

  // Drug-based
  if (psych || medical)
    tips.push({ emoji: '⚠️', text: 'Check for drug-drug interactions in current regimen' })
  if (psych.includes('lithium') || psych.includes('clozap'))
    tips.push({ emoji: '🔬', text: 'Monitor drug levels & toxicity signs' })

  // Lab-based
  if (hba1c != null && hba1c > 8)
    tips.push({ emoji: '📈', text: `HbA1c ${hba1c}% — suggest intensification strategy` })
  if (hb != null && hb < 10)
    tips.push({ emoji: '🩺', text: `Hb ${hb} — evaluate anaemia aetiology` })

  // Allergies
  const allergyStr = toSearchStr(p.allergies)
  if (allergyStr)
    tips.push({ emoji: '🚨', text: `Allergy alert: ${allergyStr} — confirm safe alternatives` })

  // Fallbacks
  if (tips.length === 0) {
    tips.push({ emoji: '📋', text: 'Review overall medication appropriateness' })
    tips.push({ emoji: '🔍', text: 'Check for any missed follow-up investigations' })
    tips.push({ emoji: '📊', text: 'Summarize clinical progress to date' })
    tips.push({ emoji: '💡', text: 'Suggest evidence-based management plan' })
  }

  return tips.slice(0, 4)
}

interface AIAdviceSectionProps {
  patientData: any
  aiEnabled: boolean
}

export function AIAdviceSection({ patientData, aiEnabled }: AIAdviceSectionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleStartConsultation = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // The first call doesn't need history, ai-actions will handle the system prompt
      const result = await getClinicalAdvice(patientData, [])
      setMessages([
        { role: "model", parts: [{ text: result }] }
      ])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to connect to AI Advisor.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = { role: "user", parts: [{ text: inputText.trim() }] }
    const newMessages = [...messages, userMessage]
    
    setMessages(newMessages)
    setInputText("")
    setIsLoading(true)
    setError(null)

    try {
      const result = await getClinicalAdvice(patientData, newMessages)
      setMessages(prev => [...prev, { role: "model", parts: [{ text: result }] }])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Connection lost. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!aiEnabled) {
    return (
      <div className="mt-8 p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
          <BrainCircuit className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="max-w-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">AI Advisor Restricted</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            AI-powered clinical consultations are currently disabled for your account. Please contact your system administrator to enable these features.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 italic">
              AI Clinical Advisor
              {messages.length > 0 && <span className="not-italic text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-tighter">Live Session</span>}
            </h3>
            <p className="text-xs text-muted-foreground">Converse with Gemini about optimization & evidence-based management</p>
          </div>
        </div>
        
        {messages.length === 0 && !isLoading && (
          <Button 
            onClick={handleStartConsultation}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg border-none animate-in fade-in zoom-in duration-300"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze & Optimize
          </Button>
        )}

        {messages.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setMessages([]); setError(null); }}
            className="text-xs gap-1.5 h-8 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Chat
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl animate-in shake duration-300">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Consultation Error</p>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-5 ${
              msg.role === "user" 
                ? "bg-slate-800 dark:bg-slate-700 text-white rounded-tr-none shadow-md" 
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm"
            }`}>
              {/* Role Indicator */}
              <div className={`flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-widest ${
                msg.role === "user" ? "text-slate-300" : "text-indigo-600 dark:text-indigo-400"
              }`}>
                {msg.role === "user" ? (
                  <><User className="h-3 w-3" /> Clinician Reflection</>
                ) : (
                  <><Sparkles className="h-3 w-3" /> AI Clinical Feedback</>
                )}
              </div>

              <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === "user" ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                <ReactMarkdown 
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-4 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-md font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mt-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="text-sm leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-indigo-500 dark:text-indigo-300" {...props} />,
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-amber-400 pl-4 bg-amber-50 dark:bg-amber-900/20 py-2 my-2 rounded-r-lg italic" {...props} />
                    )
                  }}
                >
                  {msg.parts[0].text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl rounded-tl-none p-6 shadow-sm flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Gemini is analyzing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {messages.length > 0 && (
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-500">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a follow-up question (e.g., 'What about dose titration?')"
            disabled={isLoading}
            className="h-14 pl-5 pr-14 bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900 focus-visible:ring-indigo-500 rounded-2xl shadow-inner text-sm"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputText.trim()}
            size="icon"
            className={`absolute right-2 h-10 w-10 rounded-xl transition-all ${
              inputText.trim() ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-300 dark:bg-slate-800"
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Empty State Help — dynamic tips from patient data */}
      {messages.length === 0 && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {generateTips(patientData).map(tip => (
            <button
              key={tip.text}
              onClick={() => { setInputText(tip.text); }}
              className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-200 dark:hover:border-teal-800 hover:text-teal-700 dark:hover:text-teal-400 transition-all duration-150 cursor-pointer"
            >
              {tip.emoji} {tip.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
