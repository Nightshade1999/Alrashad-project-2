import { LabHistory } from "@/components/laboratory/LabHistory"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lab Test Log | Alrashad Clinical System",
  description: "Daily log of laboratory investigations performed."
}

export default function LabHistoryPage() {
  return (
    <div className="container py-8 max-w-6xl mx-auto px-4">
      <LabHistory />
    </div>
  )
}
