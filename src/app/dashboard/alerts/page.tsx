import { Suspense } from "react"
import { LabAlertHistory } from "@/components/laboratory/LabAlertHistory"

export const dynamic = 'force-dynamic'

export default function DoctorAlertsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center font-black animate-pulse text-slate-400 italic">Syncing Highlighted Records...</div>}>
        <LabAlertHistory />
      </Suspense>
    </div>
  )
}
