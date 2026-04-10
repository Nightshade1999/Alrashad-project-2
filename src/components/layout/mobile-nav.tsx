"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Activity, Bell, Search, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    label: "Ward",
    href: "/dashboard/my-ward",
    icon: Home,
  },
  {
    label: "ER",
    href: "/dashboard/er",
    icon: Activity,
  },
  {
    label: "Reminders",
    href: "/reminders",
    icon: Bell,
  },
  {
    label: "Explore",
    href: "/dashboard",
    icon: Search,
  },
  {
    label: "Settings",
    href: "/dashboard/select-ward",
    icon: Settings,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
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
                  "p-1.5 rounded-xl transition-colors",
                  isActive && "bg-teal-50 dark:bg-teal-900/30"
                )}>
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
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
