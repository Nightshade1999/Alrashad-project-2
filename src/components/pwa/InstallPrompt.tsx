"use client"

import { useState, useEffect } from "react"
import { Download, X, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "others" | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      const isDismissed = sessionStorage.getItem("pwa_install_dismissed") === "true"
      
      if (isStandalone || isDismissed) return

      // 2. Identify platform
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIos = /iphone|ipad|ipod/.test(userAgent)
      setPlatform(isIos ? "ios" : "others")

      // 3. Listen for Chrome/Android prompt
      const handler = (e: any) => {
        e.preventDefault()
        setDeferredPrompt(e)
        // Only show if not dismissed recently (could add localStorage check here)
        setShow(true)
      }

      window.addEventListener("beforeinstallprompt", handler)
      
      // For iOS, show after a short delay
      if (isIos) {
        setTimeout(() => setShow(true), 3000)
      }

      return () => window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShow(false)
      }
    }
  }

  const handleDontShowAgain = () => {
    sessionStorage.setItem("pwa_install_dismissed", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-2xl shadow-2xl p-5 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-teal-100 dark:bg-teal-900/40 p-3 rounded-xl">
              <Download className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Install Clinical App</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Access the ward manager faster with a dedicated home screen icon.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShow(false)} 
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShow(false)} className="text-xs h-9">
            Not now
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDontShowAgain} className="text-xs h-9 text-slate-400 hover:text-rose-500">
            Don't show again
          </Button>
          
          {platform === "ios" ? (
            <div className="flex items-center gap-2 bg-teal-600 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-md shadow-teal-500/20">
              Tap <Share className="h-3 w-3" /> then "Add to Home Screen"
            </div>
          ) : (
            <Button 
              size="sm" 
              onClick={handleInstallClick}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20 text-xs h-9 font-bold"
            >
              Install Now
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
