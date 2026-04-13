import { notFound } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { OfflinePatientDetail } from "@/components/patient/OfflinePatientDetail"
import type { Patient, Visit, Investigation } from "@/types/database.types"

export const dynamic = 'force-dynamic'

export default async function PatientPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const { view } = await searchParams

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // Fetch initial data from Supabase for SSR (Instant load)
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single()
  if (!patient) notFound()

  const { data: visits } = await supabase
    .from("visits").select("*").eq("patient_id", id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: investigations } = await supabase
    .from("investigations").select("*").eq("patient_id", id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })

  return (
    <OfflinePatientDetail 
      initialPatient={patient as any}
      initialVisits={(visits || []) as any[]}
      initialInvestigations={(investigations || []) as any[]}
      view={view}
    />
  )
}
