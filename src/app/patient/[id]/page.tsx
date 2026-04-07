import { notFound } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { WardPatientDetail } from "@/components/patient/ward-patient-detail"
import { ErPatientDetail } from "@/components/patient/er-patient-detail"

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

  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single()
  if (!patient) notFound()

  // Safely normalize all JSONB arrays
  function safeParse(val: any) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }
  
  patient.allergies = safeParse(patient.allergies);
  patient.past_surgeries = safeParse(patient.past_surgeries);
  patient.chronic_diseases = safeParse(patient.chronic_diseases);
  patient.psych_drugs = safeParse(patient.psych_drugs);
  patient.medical_drugs = safeParse(patient.medical_drugs);
  patient.er_treatment = safeParse(patient.er_treatment);

  const { data: visits } = await supabase
    .from("visits").select("*").eq("patient_id", id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: investigations } = await supabase
    .from("investigations").select("*").eq("patient_id", id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })

  // Fetch current user profile for AI permission check
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('ai_enabled, ward_name')
    .eq('user_id', authUser?.id)
    .single()

  const aiEnabled = userProfile?.ai_enabled ?? true
  const wardName = userProfile?.ward_name || patient.ward_name || 'General Ward'

  // Decide which view to render
  // If explicitly 'ward', show ward. If in ER and not explicitly 'ward', show ER.
  const isErView = patient.is_in_er && view !== 'ward'

  if (isErView) {
    return (
      <ErPatientDetail 
        patient={patient}
        visits={visits || []}
        investigations={investigations || []}
        aiEnabled={aiEnabled}
        wardName={wardName}
      />
    )
  }

  return (
    <WardPatientDetail 
      patient={patient}
      visits={visits || []}
      investigations={investigations || []}
      aiEnabled={aiEnabled}
      wardName={wardName}
    />
  )
}
