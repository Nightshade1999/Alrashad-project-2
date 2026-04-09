"use client"

import { use } from "react"
import { PatientDetail } from "@/components/patient/PatientDetail"

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <PatientDetail
      initialPatient={{ id } as any}
      initialVisits={[]}
      initialInvestigations={[]}
    />
  )
}
