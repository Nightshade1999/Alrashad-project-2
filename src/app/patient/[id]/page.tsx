import { createClient } from "@/lib/supabase-server"
import { PatientDetail } from "@/components/patient/PatientDetail"
import { notFound } from "next/navigation"

export default async function PatientPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const sParams = await searchParams
  const supabase = await createClient()

  // Parallel fetch for optimal performance
  const [
    { data: patient },
    { data: visits },
    { data: investigations },
    { data: { user } }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('visits').select('*').eq('patient_id', id).order('visit_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('investigations').select('*').eq('patient_id', id).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.auth.getUser()
  ])

  if (!patient) notFound()

  let profile = null
  if (user) {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    profile = userProfile
  }

  return (
    <PatientDetail
      initialPatient={patient as any}
      initialVisits={(visits as any[]) || []}
      initialInvestigations={(investigations as any[]) || []}
      initialProfile={profile as any}
      view={sParams.view as string}
    />
  )
}
