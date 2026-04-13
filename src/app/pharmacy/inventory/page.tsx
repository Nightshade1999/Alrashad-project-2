import { Suspense } from "react"
import { PharmacyInventory } from "@/components/pharmacy/PharmacyInventory"

export default function InventoryPage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen pb-20 md:pb-0">
      <Suspense fallback={<div className="p-20 text-center font-black animate-pulse uppercase italic tracking-widest text-slate-400">Loading Inventory...</div>}>
        <PharmacyInventory />
      </Suspense>
    </div>
  )
}
