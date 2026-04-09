"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export function NotificationCenter() {
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchRemindersCount = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await (supabase.from('user_profiles') as any).select('specialty, gender').eq('user_id', user.id).single()
      if (!profile) return

      const today = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0] // Baghdad time
      
      let query = (supabase.from('reminders') as any)
        .select('*', { count: 'exact', head: true })
        .eq('reminder_date', today)
        .eq('status', 'pending')
        .eq('target_specialty', profile.specialty)

      if (profile.specialty === 'internal_medicine' && profile.gender) {
        query = query.or(`target_gender.eq.${profile.gender},target_gender.is.null`)
      }

      const { count, error } = await query
      if (!error && count !== null) {
        setPendingCount(count)
      }
    } catch (e) {
      console.error("Failed to fetch notification count", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRemindersCount()
    // Optional: Set up a periodic poll or use a database listener
    const interval = setInterval(fetchRemindersCount, 30000)
    return () => clearInterval(interval)
  }, [fetchRemindersCount])

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
