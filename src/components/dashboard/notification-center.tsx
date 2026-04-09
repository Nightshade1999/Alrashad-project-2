"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

export function NotificationCenter() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const supabase = createClient()
        const { count } = await supabase
          .from('reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        
        setPendingCount(count || 0)
      } catch (e) {
        console.error("Notification fetch error:", e)
      }
    }

    fetchCount()
    // Optional: Add a standard real-time subscription here later if needed.
  }, [])

  return (
    <Link href="/reminders" className="relative group" prefetch={true}>
      <Button
        variant="ghost"
        size="icon"
        className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl transition-all duration-300 ${
          pendingCount > 0 
            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 shadow-sm shadow-amber-500/10 ring-1 ring-amber-200/50 dark:ring-amber-800/50" 
            : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
        }`}
      >
        <Bell className={`h-5 w-5 sm:h-5.5 sm:w-5.5 ${pendingCount > 0 ? "animate-wiggle" : ""}`} />
        
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-rose-600 text-[10px] sm:text-[11px] font-black text-white border-2 border-white dark:border-slate-900 shadow-xl animate-in zoom-in-50 duration-300">
            {pendingCount}
          </span>
        )}
      </Button>
      
      {/* Tooltip hint on hover (pc only) */}
      <span className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap shadow-2xl z-[100] hidden sm:block">
        Manage Ward Tasks
      </span>
    </Link>
  )
}
