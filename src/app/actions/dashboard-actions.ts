"use server"

import { getGenerativeModel, MODEL_PRIORITY } from "@/lib/gemini"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getUrgentInsights() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // Fetch all patients
  const { data: patients } = await supabase.from("patients").select("*").limit(5000)
  if (!patients || patients.length === 0) return "No patients found to analyze."

  // Fetch all latest investigations
  const { data: invs } = await supabase
    .from("investigations")
    .select("*")
    .order("date", { ascending: false })

  // Fetch all latest visits
  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .order("visit_date", { ascending: false })

  // Summarize for AI
  const summary = patients.map(p => {
    const lastInv = invs?.find(i => i.patient_id === p.id)
    const lastVisit = visits?.find(v => v.patient_id === p.id)
    
    return `
PATIENT: ${p.name} (Category: ${p.category})
- Meds: ${p.medical_drugs || "None"} | ${p.psych_drugs || "None"}
- Last Labs: WBC ${lastInv?.wbc}, Hb ${lastInv?.hb}, RBS ${lastInv?.rbs}, Creat ${lastInv?.s_creatinine}, Urea ${lastInv?.s_urea}
- Last Visit Date: ${lastVisit?.visit_date || "Never"}
`
  }).join("\n---\n")

  const prompt = `
You are a Ward Clinical Supervisor. Analyze this patient list from the medical ward and identify patients requiring URGENT ATTENTION today.

Consider:
1. **Critical Labs**: WBC (>11 or <4), Hb (<10), RBS (>250), S.Creat (>1.5), S.Urea (>50).
2. **Follow-up Gaps**: High Risk patients not seen in >7 days.
3. **Safety Risks**: Potential interactions or high-risk demographics.

### Format your response as follows:
- Use Markdown.
- **Urgent Cases**: List patient name and the specific clinical reason for urgency.
- **Recommendations**: Brief action items for the morning round.
- **Safety Alerts**: Highlight any potential drug interactions or ward-level risks.

Ward Data:
${summary}
`

  let lastError: any = null
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = getGenerativeModel(modelName)
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      if (text) return text
    } catch (error: any) {
      console.warn(`Urgent Insights: Model ${modelName} failed:`, error.message)
      lastError = error
    }
  }

  throw new Error(`Failed to generate insights: ${lastError?.message || "Unknown error"}`)
}

export async function updateErTreatmentAction(patientId: string, treatments: any[], actingDoctorName?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { error } = await supabase
    .from('patients')
    .update({ 
      er_treatment: treatments,
      er_treatment_last_edit_by: actingDoctorName || null,
      er_treatment_last_edit_at: new Date().toISOString()
    })
    .eq('id', patientId)

  if (error) return { error: error.message }
  return { success: true }
}

