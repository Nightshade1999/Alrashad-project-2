import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Activity, HeartPulse } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function GenderErPage({ params }: { params: Promise<{ gender: string }> }) {
  const { gender } = await params
  
  // Validate gender to be Male or Female
  if (gender !== 'Male' && gender !== 'Female') {
    return <div className="p-8 text-center text-red-500 font-bold">Invalid ER specified.</div>
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // 1. Fetch wards configured for this gender
  const { data: wards } = await supabase
    .from('ward_settings')
    .select('ward_name')
    .eq('gender', gender)
    
  const validWards = wards?.map(w => w.ward_name) || []

  // 2. Fetch patients who are in ER AND whose ward is in the validWards array. 
  // If validWards is empty, it means no wards of this gender are configured.
  let patients: any[] = []
  
  if (validWards.length > 0) {
    const { data: p } = await supabase
      .from('patients')
      .select('id, name, age, category, ward_name, room_number, chronic_diseases, er_admission_date, er_admission_doctor, er_chief_complaint')
      .eq('is_in_er', true)
      .in('ward_name', validWards)
      .order('created_at', { ascending: false })
      
    patients = p || []
  }

  const colorConfig = gender === 'Male' ? 'blue' : 'pink'
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Top Bar */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/dashboard/er">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className={`h-6 w-6 text-${colorConfig}-500`} />
            {gender} Emergency Room
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} from {gender.toLowerCase()} wards currently admitted to ER.
          </p>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className={`p-12 border border-dashed border-${colorConfig}-200 dark:border-${colorConfig}-900/50 rounded-3xl bg-${colorConfig}-50/30 dark:bg-${colorConfig}-950/10 text-center animate-fade-in-up`}>
          <div className={`mx-auto w-16 h-16 bg-${colorConfig}-100 dark:bg-${colorConfig}-900/30 rounded-2xl flex items-center justify-center mb-4`}>
            <HeartPulse className={`h-8 w-8 text-${colorConfig}-500 opacity-80`} />
          </div>
          <h3 className={`text-xl font-bold text-${colorConfig}-900 dark:text-${colorConfig}-100 mb-2`}>No Patients in ER</h3>
          <p className={`text-${colorConfig}-600 dark:text-${colorConfig}-400 max-w-md mx-auto`}>
            There are currently no patients originating from {gender} wards in the Emergency Room. Great job keeping the ER clear!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
           {patients.map((p) => (
             <Link key={p.id} href={`/patient/${p.id}`}>
               <div className={`group bg-white dark:bg-slate-900 border border-${colorConfig}-100 dark:border-${colorConfig}-900/40 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}>
                 <div className={`absolute top-0 right-0 h-16 w-16 bg-${colorConfig}-50 dark:bg-${colorConfig}-900/20 rounded-bl-[4rem] flex items-start justify-end p-3 transition-colors`}>
                   <AlertCircle className={`h-5 w-5 text-${colorConfig}-500 group-hover:scale-110 transition-transform`} />
                 </div>
                 
                 <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 pr-10 truncate">{p.name}</h3>
                 <p className="text-sm font-semibold text-slate-500 mb-4">{p.age} years old</p>
                 
                 <div className="space-y-1.5 mt-2">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">Origin Ward:</span>
                     <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{p.ward_name}</span>
                   </div>
                   
                   {p.chronic_diseases && Array.isArray(p.chronic_diseases) && p.chronic_diseases.length > 0 && (
                     <div className="flex justify-between items-start text-xs pt-0.5">
                       <span className="text-slate-400 shrink-0">Chronic:</span>
                       <div className="flex flex-wrap gap-1 justify-end ml-2">
                         {p.chronic_diseases.map((d: any, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">{d.name}</span>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 dark:border-slate-800/50 mt-1.5">
                     <span className="text-slate-400">Admitted:</span>
                     <span className="font-semibold text-slate-700 dark:text-slate-200">{p.er_admission_date ? new Date(p.er_admission_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Unknown'}</span>
                   </div>
                   
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">Doctor:</span>
                     <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{p.er_admission_doctor || 'Unknown'}</span>
                   </div>
                   
                   <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg mt-2 border border-rose-100 dark:border-rose-900/30">
                     <p className="text-[9px] font-black uppercase text-rose-500 mb-0.5">Chief Complaint</p>
                     <p className="text-xs font-bold text-rose-900 dark:text-rose-100 italic">"{p.er_chief_complaint || 'No complaint recorded'}"</p>
                   </div>
                 </div>
                 
                 <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center">
                    <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                      View full details →
                    </span>
                 </div>
               </div>
             </Link>
           ))}
        </div>
      )}
    </div>
  )
}
