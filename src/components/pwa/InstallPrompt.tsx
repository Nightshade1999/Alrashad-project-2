"use client"

import { useState, useEffect, useCallback } from 'react'
import { Download, X, Smartphone, Shield, Share, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const INSTALL_PROMPT_KEY = 'ward_install_prompt'
const VISIT_COUNT_KEY = 'ward_visit_count'

function getStoredData() {
  try {
    const raw = localStorage.getItem(INSTALL_PROMPT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveStoredData(data: object) {
  try { localStorage.setItem(INSTALL_PROMPT_KEY, JSON.stringify(data)) } catch {}
}

function isDismissedForNow(): boolean {
  const d = getStoredData()
  if (!d) return false
  if (d.neverShow) return true
  if (d.dismissedUntil && new Date(d.dismissedUntil) > new Date()) return true
  return false
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const maybeShowPrompt = useCallback(() => {
    if (isDismissedForNow()) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Increment visit count — show only after 2+ visits
    try {
      const count = parseInt(sessionStorage.getItem(VISIT_COUNT_KEY) || '0') + 1
      sessionStorage.setItem(VISIT_COUNT_KEY, String(count))
      if (count < 2) return
    } catch {}

    setShowPrompt(true)
  }, [])

  useEffect(() => {
    // Detect installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Detect platform — MOBILE ONLY
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)
    const isMobile = isIOS || isAndroid
    
    // Don't show on desktop at all
    if (!isMobile) return

    if (isIOS) setPlatform('ios')
    else setPlatform('android')

    // Android / Chrome — wait for browser prompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(maybeShowPrompt, 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — show manual instructions after a delay
    if (isIOS) {
      setTimeout(maybeShowPrompt, 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [maybeShowPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remind again in 3 days
    const dismissedUntil = new Date()
    dismissedUntil.setDate(dismissedUntil.getDate() + 3)
    saveStoredData({ dismissedUntil: dismissedUntil.toISOString() })
  }

  const handleNeverShow = () => {
    setShowPrompt(false)
    saveStoredData({ neverShow: true })
  }

  if (isInstalled || !showPrompt || !platform) return null

  return (
    /* Bottom sheet — slides up from screen bottom */
    <div className="fixed inset-0 z-[80] flex items-end justify-center" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg mx-auto animate-in slide-in-from-bottom-6 duration-400 ease-out">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden">

          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-12 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Header band */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <img src="/icon.png" alt="Ward App" className="h-8 w-8 rounded-xl" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Install Ward App</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Offline-first clinical management</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Benefits row */}
          <div className="grid grid-cols-3 gap-2 px-6 pb-4">
            {[
              { icon: '⚡', label: 'Instant Launch' },
              { icon: '📴', label: 'Works Offline' },
              { icon: '🔒', label: 'Encrypted Data' },
            ].map(b => (
              <div key={b.label} className="flex flex-col items-center gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xl">{b.icon}</span>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wide text-center">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Platform-specific action */}
          <div className="px-6 pb-2">
            {platform === 'android' ? (
              <Button
                onClick={handleInstall}
                className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-teal-600/25 text-sm uppercase tracking-widest"
              >
                <Download className="h-4 w-4 mr-2" />
                Add to Home Screen
              </Button>
            ) : (
              /* iOS manual steps */
              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest">
                  To install on iPhone / iPad:
                </p>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                    <Share className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug">
                    Tap the <strong>Share</strong> button at the bottom of Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dismiss options */}
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={handleNeverShow}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
            >
              Don't show again
            </button>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Shield className="h-3 w-3" />
              <span className="font-bold uppercase tracking-widest">Secure & Private</span>
            </div>
          </div>

          {/* Bottom safe area spacer for iPhone home bar */}
          <div className="pb-safe" />
        </div>
      </div>
    </div>
  )
}
