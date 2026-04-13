import { Suspense } from "react"
import { LaboratoryDashboard } from "@/components/laboratory/LaboratoryDashboard"

export const dynamic = 'force-dynamic'

export default async function LaboratoryPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Laboratory...</div>}>
        <LaboratoryDashboard />
      </Suspense>
    </div>
  )
}
