"use client"

import { useEffect, useState } from "react"
import { Award } from "lucide-react"

export function WelcomeSplash() {
  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    // Check if splash was already shown in this session
    // Using try-catch to handle potential restricted environment issues
    try {
      const hasShown = sessionStorage.getItem("splash_shown")
      if (hasShown) return
    } catch (e) {
      console.warn("sessionStorage not available", e)
    }

    setIsRendered(true)
    
    // Hide the static shell immediately when React hydrates
    const shell = document.getElementById('initial-splash-shell')
    if (shell) shell.style.display = 'none'

    // Small delay to start animations
    const showTimer = setTimeout(() => setIsVisible(true), 100)
    
    // Total duration of splash (entrance + hold + exit)
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      try {
        sessionStorage.setItem("splash_shown", "true")
      } catch (e) {}
      
      // Remove from DOM after exit animation
      setTimeout(() => setIsRendered(false), 1000)
    }, 4500)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!isRendered) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-1000 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Premium Light Gradient Background with animated dynamic blurs */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 pointer-events-none transition-colors duration-1000" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-400/10 dark:bg-emerald-900/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-400/10 dark:bg-teal-900/20 rounded-full blur-[140px] animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative flex flex-col items-center text-center px-6 max-w-5xl z-10 w-full">
        
        {/* Official Logos Side-by-Side - Ultra smooth entering scale */}
        <div className="flex items-center gap-12 sm:gap-24 mb-16 animate-splash-scale">
          {/* Iraqi MOH Logo */}
          <div className="flex flex-col items-center gap-5 group">
             <div className="h-32 w-32 sm:h-44 sm:w-44 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-full flex items-center justify-center p-5 ring-1 ring-emerald-900/5 dark:ring-emerald-100/5 shadow-2xl transition-all duration-1000 group-hover:scale-110">
                <img 
                   src="/iraq_moh.png" 
                   alt="Iraqi Ministry of Health" 
                   className="h-full w-full object-contain drop-shadow-xl"
                />
             </div>
             <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-emerald-900/60 dark:text-emerald-100/40 font-mono">
                Ministry of Health
             </p>
          </div>

          {/* Al-Rashad Hospital Logo */}
          <div className="flex flex-col items-center gap-5 group">
             <div className="h-32 w-32 sm:h-44 sm:w-44 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-full flex items-center justify-center p-5 ring-1 ring-emerald-900/5 dark:ring-emerald-100/5 shadow-2xl transition-all duration-1000 group-hover:scale-110">
                <img 
                   src="/al_rashad.png" 
                   alt="Al-Rashad Hospital" 
                   className="h-full w-full object-contain drop-shadow-xl saturate-[1.1] scale-105"
                />
             </div>
             <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-emerald-900/60 dark:text-emerald-100/40 font-mono">
                Al-Rashad Hospital
             </p>
          </div>
        </div>

        {/* Main Title Section - smooth elegant fade up */}
        <div className="space-y-6 mb-24 w-full max-w-2xl">
          <div className="flex flex-col items-center animate-reveal-text [animation-delay:0.8s] opacity-0 [animation-fill-mode:forwards]">
             <span className="px-5 py-2 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] rounded-full border border-emerald-500/20 mb-6 backdrop-blur-md text-nowrap shadow-sm">
                Clinical Excellence Since 1920
             </span>
             <div className="h-0.5 w-12 bg-emerald-500/20 rounded-full mb-6" />
          </div>

          <h1 className="font-playfair text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-tight animate-reveal-text [animation-delay:1.1s] opacity-0 [animation-fill-mode:forwards] text-slate-900 dark:text-slate-50">
            Welcome to <br />
            <span className="bg-linear-to-r from-teal-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
              Al-Rashad
            </span>
          </h1>
        </div>

      </div>

      {/* Footer Branding - Light Theme Elegant */}
      <div className="absolute bottom-10 sm:bottom-12 flex flex-col items-center gap-2 animate-slide-up-fade [animation-delay:2.2s] opacity-0 [animation-fill-mode:forwards] pb-safe z-20">
        <div className="flex items-center gap-4 mb-2 opacity-60">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-emerald-900/20 dark:to-emerald-100/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-emerald-900/20 dark:to-emerald-100/20" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500 mb-1">
          Designed and created by
        </p>
        <p className="font-playfair text-lg sm:text-xl font-black italic text-slate-800 dark:text-slate-200 tracking-wider">
          Dr. Ahmed Safaa
        </p>
      </div>
    </div>
  )
}
