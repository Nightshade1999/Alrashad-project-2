"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Activity, Bell, Search, Settings } from "lucide-react"
import { useDatabase } from "@/hooks/useDatabase"
import { createClient } from "@/lib/supabase"

export function MobileNav() {
  const pathname = usePathname()
  const { profile } = useDatabase()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  
  const role = profile?.role || "doctor"
  const userId = profile?.user_id

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('reminders')
        .select("*", { count: 'exact', head: true })
        .eq("is_resolved", false) // Fixed column name from standard_schema
      
      setUnreadNotifs(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel(`mobile-reminders-${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reminders'
      }, () => fetchUnread())
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Define nav items based on role
  let navItems = [
    { label: "Ward", href: "/dashboard/my-ward", icon: Home },
    { label: "ER", href: "/dashboard/er", icon: Activity },
    { label: "Reminders", href: "/reminders", icon: Bell },
    { label: "Explore", href: "/dashboard", icon: Search },
    { label: "Settings", href: "/dashboard/select-ward", icon: Settings },
  ]

  if (role === 'pharmacist') {
    navItems = [
      { label: "Pharmacy", href: "/pharmacy", icon: Home },
      { label: "Inventory", href: "/pharmacy/inventory", icon: Home },
      { label: "Scanner", href: "/pharmacy/scanner", icon: Home },
    ]
  } else if (role === 'lab_tech') {
    navItems = [
      { label: "Home", href: "/laboratory", icon: Home },
      { label: "Alerts", href: "/laboratory/alerts", icon: Bell },
    ]
  }

  // Hide nav on login page
  if (pathname === "/login" || pathname === "/") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90",
                  isActive 
                    ? "text-teal-600 dark:text-teal-400" 
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                 <div className={cn(
                  "p-1.5 rounded-xl transition-colors relative",
                  isActive && "bg-teal-50 dark:bg-teal-900/30"
                )}>
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                  {item.label === "Reminders" && unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {unreadNotifs}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
