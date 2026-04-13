import { Suspense } from "react"
import { LabAlertHistory } from "@/components/laboratory/LabAlertHistory"

export const dynamic = 'force-dynamic'

export default function LabAlertsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center font-black animate-pulse">Syncing Critical Records...</div>}>
        <LabAlertHistory />
      </Suspense>
    </div>
  )
}
