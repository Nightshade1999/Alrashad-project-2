"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Props) {
  return (
    <SwitchPrimitive
      data-slot="switch"
      className={cn(
        "group isolate inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-800",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive>
  )
}

export { Switch }
