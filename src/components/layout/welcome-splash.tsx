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
      {/* Premium Light Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-tr from-emerald-50 via-white to-teal-50 pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center text-center px-6 max-w-5xl">
        
        {/* Official Logos Side-by-Side - Using lightweight <img> for performance */}
        <div className="flex items-center gap-10 sm:gap-20 mb-16 animate-splash-scale">
          {/* Iraqi MOH Logo */}
          <div className="flex flex-col items-center gap-4 group">
             <div className="h-32 w-32 sm:h-48 sm:w-48 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center p-4 ring-1 ring-emerald-950/5 transition-all group-hover:scale-105 duration-700">
                <img 
                   src="/iraq_moh.png" 
                   alt="Iraqi Ministry of Health" 
                   className="h-full w-full object-contain drop-shadow-xl"
                />
             </div>
             <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/40">
                Ministry of Health
             </p>
          </div>

          {/* Al-Rashad Hospital Logo */}
          <div className="flex flex-col items-center gap-4 group">
             <div className="h-32 w-32 sm:h-48 sm:w-48 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center p-4 ring-1 ring-emerald-950/5 transition-all group-hover:scale-105 duration-700">
                <img 
                   src="/al_rashad.png" 
                   alt="Al-Rashad Hospital" 
                   className="h-full w-full object-contain drop-shadow-xl saturate-[1.1]"
                />
             </div>
             <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/40">
                Al-Rashad Hospital
             </p>
          </div>
        </div>

        {/* Main Title Section */}
        <div className="space-y-6 mb-24">
          <div className="flex flex-col items-center animate-reveal-text [animation-delay:0.8s]">
             <span className="px-4 py-1.5 bg-emerald-100/50 text-emerald-900 text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] rounded-full border border-emerald-200/50 mb-4 backdrop-blur-sm text-nowrap">
                Clinical Excellence Since 1920
             </span>
             <h2 className="text-emerald-900/40 font-bold uppercase tracking-[0.3em] text-xs sm:text-sm">
                Electronic Clinical System
             </h2>
          </div>

          <h1 className="font-playfair text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight animate-reveal-text [animation-delay:1.1s] text-slate-900">
            Welcome to <br />
            <span className="bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
              Al-Rashad Hospital
            </span>
          </h1>
        </div>

      </div>

      {/* Footer Branding - Light Theme Elegant */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2 animate-slide-up-fade [animation-delay:2.2s]">
        <div className="flex items-center gap-3 mb-1 opacity-60">
          <div className="h-[1px] w-12 bg-emerald-900/10" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <div className="h-[1px] w-12 bg-emerald-900/10" />
        </div>
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-slate-400">
          Designed and created by
        </p>
        <p className="font-playfair text-xl sm:text-2xl font-black italic text-emerald-900 tracking-wide drop-shadow-sm">
          Dr. Ahmed Safaa
        </p>
      </div>
    </div>
  )
}
