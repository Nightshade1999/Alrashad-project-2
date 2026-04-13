import { Suspense } from "react"
import { FullNotificationHistory } from "@/components/dashboard/FullNotificationHistory"

export const dynamic = 'force-dynamic'

export default function NotificationsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center font-black animate-pulse text-slate-400">Loading Clinical Records...</div>}>
        <FullNotificationHistory />
      </Suspense>
    </div>
  )
}
