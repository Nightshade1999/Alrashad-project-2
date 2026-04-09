"use client"

import { useState } from "react"
import { RefreshCw, ShieldAlert, Database, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPowerSync } from "@/lib/powersync/db"
import { SCHEMA_VERSION } from "@/lib/powersync/schema"

export function UpdatePrompt({ onUpdate }: { onUpdate: () => void }) {
  const [isUpdating, setIsUpdating] = useState(false)
  
  const handleFinalizeUpdate = async () => {
    setIsUpdating(true)
    try {
      const ps = getPowerSync()
      // 1. Perform the heavy lifting manually
      console.log("UpdatePrompt: Clearing old database...")
      await ps.disconnectAndClear()
      
      // 2. Commit the new version to storage
      localStorage.setItem('powersync_schema_version', SCHEMA_VERSION)
      
      // 3. Final one-time reload
      console.log("UpdatePrompt: Finalizing...")
      onUpdate()
    } catch (err) {
      console.error("UpdatePrompt: Fatal failure", err)
      // If we reach here, the database is severely corrupted or storage is blocked
      alert("System Update Failed. Please clear your browser cache manually.")
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-red-500/10 opacity-50" />
      
      <div className="relative space-y-8 max-w-sm">
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-xl shadow-teal-500/30">
            <RefreshCw className={`h-10 w-10 text-white ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-red-500 border-4 border-slate-950 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Update Required</h2>
          <div className="h-1 w-12 bg-teal-500 mx-auto rounded-full" />
          <p className="text-slate-400 font-medium leading-relaxed">
            The clinical database structure has been upgraded to <span className="text-teal-400 font-bold">{SCHEMA_VERSION}</span>. 
            A manual reset is needed to ensure medical record integrity.
          </p>
        </div>

        {/* Action Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Database className="h-3.5 w-3.5" /> What happens now?
          </div>
          <ul className="space-y-2">
            {[
              "Clear local SQLite cache",
              "Purge stale service worker",
              "Recalibrate patient streams"
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-slate-300">
                <div className="h-1 w-1 bg-teal-500 rounded-full" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleFinalizeUpdate}
          disabled={isUpdating}
          className="w-full h-14 bg-white hover:bg-slate-100 text-slate-950 font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 group"
        >
          {isUpdating ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Click to Apply Update
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
        
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          * This will break the refresh loop on iPhone/iPad 
        </p>
      </div>
    </div>
  )
}
