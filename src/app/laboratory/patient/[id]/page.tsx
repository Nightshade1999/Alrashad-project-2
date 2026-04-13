import { Suspense } from "react"
import { LabPatientDetail } from "@/components/laboratory/LabPatientDetail"

export const dynamic = 'force-dynamic'

export default async function LaboratoryPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Patient Data...</div>}>
        <LabPatientDetail patientId={id} />
      </Suspense>
    </div>
  )
}
