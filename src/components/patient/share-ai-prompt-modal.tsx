"use client"

import { useState, useEffect } from "react"
import { Sparkles, Copy, ExternalLink, Check, BrainCircuit, MessageSquare, Terminal, RefreshCw, X, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AI_TEMPLATES, buildAIPrompt, AIPromptTemplate } from "@/lib/prompt-utils"
import { toast } from "sonner"
import { ModalPortal } from '@/components/ui/modal-portal'

interface ShareAIPromptModalProps {
  patient: any
}

export function ShareAIPromptModal({ patient }: ShareAIPromptModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<AIPromptTemplate>(AI_TEMPLATES[0])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)

  // Check for native share support
  useEffect(() => {
    setCanShare(!!navigator.share)
  }, [])

  const prompt = buildAIPrompt(patient, selectedTemplate)

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    toast.success("Prompt copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const openAI = (url: string, type: string) => {
    handleCopy()
    setLoading(type)
    window.open(url, "_blank")
    setTimeout(() => setLoading(null), 3000)
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `Clinical Case [${selectedTemplate.label}]`,
        text: prompt
      })
      toast.success("Shared successfully!")
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error("Sharing failed. Try copying instead.")
      }
    }
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="h-9 px-3 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        AI
      </Button>

      {isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Consult External AI</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Anonymized Case Summary & Prompts</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-500" /> Choose Analysis Objective
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`text-left p-3 rounded-xl border text-sm transition-all ${
                        selectedTemplate.id === t.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700"
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        {t.label}
                        {selectedTemplate.id === t.id && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" /> Final Prompt (Anonymized)
                  </label>
                  <button 
                    onClick={handleCopy}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                  >
                   {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                   {copied ? "Copied!" : "Copy Full Text"}
                  </button>
                </div>
                <div className="relative group">
                  <pre className="w-full h-48 sm:h-64 bg-slate-900 rounded-2xl p-5 overflow-auto text-xs text-slate-300 font-mono border border-slate-800 scrollbar-hide select-all">
                    {prompt}
                  </pre>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700">Anonymized Case</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canShare && (
                  <Button 
                     onClick={handleNativeShare}
                     className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 h-16 rounded-2xl gap-3 shadow-xl font-bold text-lg mb-2"
                  >
                     <Share2 className="h-6 w-6" />
                     Send to AI App (Native)
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                     onClick={() => openAI("https://gemini.google.com/app", "gemini")}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-2xl gap-3 shadow-lg shadow-indigo-100 dark:shadow-none font-bold text-base transition-all active:scale-95"
                  >
                     {loading === "gemini" ? <Check className="h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
                     {loading === "gemini" ? "Opening..." : "Copy & Open Gemini"}
                  </Button>
                  <Button 
                     onClick={() => openAI("https://chatgpt.com", "chatgpt")}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl gap-3 shadow-lg shadow-emerald-100 dark:shadow-none font-bold text-base transition-all active:scale-95"
                  >
                     {loading === "chatgpt" ? <Check className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                     {loading === "chatgpt" ? "Opening..." : "Copy & Open ChatGPT"}
                  </Button>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 text-center font-medium italic">
                * Anonymization removes patients' names and identifiers to protect privacy.
              </p>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  )
}
