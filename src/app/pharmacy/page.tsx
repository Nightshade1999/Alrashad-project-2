import { Suspense } from "react"
import { PharmacyDashboard } from "@/components/pharmacy/PharmacyDashboard"

export const dynamic = 'force-dynamic'

export default async function PharmacyPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center font-black">Loading Pharmacy System...</div>}>
        <PharmacyDashboard />
      </Suspense>
    </div>
  )
}
