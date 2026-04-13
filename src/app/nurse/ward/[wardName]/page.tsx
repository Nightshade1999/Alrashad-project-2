import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NursePatientList } from '@/components/nurse/NursePatientList'
import { NurseInstructionHub } from '@/components/nurse/NurseInstructionHub'
import { NurseNameModal } from '@/components/nurse/NurseNameModal'

export default async function NurseWardPage({ 
  params 
}: { 
  params: Promise<{ wardName: string }> 
}) {
  const { wardName: encodedWardName } = await params
  const wardName = decodeURIComponent(encodedWardName)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, accessible_wards')
    .eq('user_id', user.id)
    .single()

  if (profile?.role?.toLowerCase() !== 'nurse') redirect('/dashboard')
  
  // Verify ward access
  const hasAccess = profile.accessible_wards?.includes(wardName)
  if (!hasAccess) redirect('/dashboard/select-ward')

  // 1. Fetch patients for this ward
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('ward_name', wardName)
    .order('name', { ascending: true })

  // 2. Fetch active instructions for this ward (unread OR repetitive and not expired)
  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: instructions } = await supabase
    .from('nurse_instructions')
    .select(`
      *,
      patient:patients(name)
    `)
    .eq('ward_name', wardName)
    .or(`is_read.eq.false,and(instruction_type.eq.repetitive,expires_at.gt.${now})`)
    .gt('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <NurseNameModal />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Notification Hub */}
        <div className="flex items-center justify-end">
           <NurseInstructionHub 
             wardName={wardName} 
             initialInstructions={instructions || []} 
           />
        </div>

        {/* Patient List */}
        <NursePatientList 
          initialPatients={patients || []} 
          wardName={wardName} 
          instructions={instructions || []}
        />
      </div>
    </div>
  )
}
