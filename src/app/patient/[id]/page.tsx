"use client"

import { use } from "react"
import { OfflinePatientDetail } from "@/components/patient/OfflinePatientDetail"

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  // Pass empty arrays/null. OfflinePatientDetail's internal useEffect
  // will instantly fetch the data from the local PowerSync SQLite database.
  return (
    <OfflinePatientDetail
      initialPatient={{ id } as any}
      initialVisits={[]}
      initialInvestigations={[]}
    />
  )
}
