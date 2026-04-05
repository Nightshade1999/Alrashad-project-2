import { format, parseISO } from "date-fns"

export interface AIPromptTemplate {
  id: string
  label: string
  command: string
}

export const AI_TEMPLATES: AIPromptTemplate[] = [
  {
    id: "general",
    label: "General Clinical Analysis",
    command: "Analyze the following clinical case. Provide a summary of the current health status, identify potential risks, and suggest evidence-based management strategies. Maintain a professional medical tone."
  },
  {
    id: "interactions",
    label: "Drug Interaction Check",
    command: "Review the medication list for this patient (including both psychiatric and internal medical drugs). Identify any potential drug-drug interactions, contraindications, or cumulative side effect risks."
  },
  {
    id: "optimization",
    label: "Treatment Optimization",
    command: "Based on the recent laboratory findings and vital signs, suggest optimizations for the current treatment plan. Focus on achieving target ranges for chronic conditions like Diabetes (HbA1c) and Hypertension (BP)."
  },
  {
    id: "summary",
    label: "Progress Summary",
    command: "Synthesize the recent visit notes and vital signs to summarize the patient's clinical progress over the last few evaluations. Note whether the patient is stable, deteriorating, or improving."
  }
]

export function generateAnonymizedClinicalCase(p: any): string {
  const anonymizedId = `CAS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  
  const sections: string[] = []

  // Header
  sections.push(`### CLINICAL CASE PROFILE: [${anonymizedId}]`)
  sections.push(`**Demographics:** ${p.age} year old ${p.gender}`)
  sections.push(`**Category:** ${p.category}`)
  
  // History
  if (p.chronic_diseases?.length) {
    const diseases = p.chronic_diseases.map((d: any) => typeof d === 'string' ? d : d.name).join(", ")
    sections.push(`**Chronic Conditions:** ${diseases}`)
  }

  if (p.allergies?.length) {
    sections.push(`**Allergies:** ${p.allergies.join(", ")}`)
  }

  // Medications
  if (p.psych_drugs?.length || p.medical_drugs?.length) {
    sections.push(`\n#### CURRENT MEDICATIONS`)
    if (p.psych_drugs?.length) {
      sections.push(`*Psychiatric:* ${p.psych_drugs.map((d: any) => `${d.name} (${d.dosage}, ${d.frequency})`).join("; ")}`)
    }
    if (p.medical_drugs?.length) {
      sections.push(`*Internal Medical:* ${p.medical_drugs.map((d: any) => `${d.name} (${d.dosage}, ${d.frequency})`).join("; ")}`)
    }
  }

  // Labs (Full History)
  if (p.investigations?.length) {
    sections.push(`\n#### LABORATORY HISTORY (Chronological)`)
    p.investigations.forEach((inv: any, idx: number) => {
      const labLines = [
        inv.hba1c != null ? `HbA1c: ${inv.hba1c}%` : null,
        inv.hb != null ? `Hb: ${inv.hb}` : null,
        inv.s_creatinine != null ? `S.Creat: ${inv.s_creatinine}` : null,
        inv.s_urea != null ? `S.Urea: ${inv.s_urea}` : null,
        inv.rbs != null ? `RBS: ${inv.rbs}` : null,
        inv.wbc != null ? `WBC: ${inv.wbc}` : null,
      ].filter(Boolean)
      
      if (labLines.length) {
        sections.push(`[${idx + 1}] Date: ${format(parseISO(inv.date), "dd MMM yyyy")}`)
        sections.push(`   ${labLines.join(" | ")}`)
      }
    })
  }

  // Vitals & Notes (Full History)
  if (p.visits?.length) {
    sections.push(`\n#### CLINICAL EVALUATIONS (Chronological)`)
    p.visits.forEach((v: any, idx: number) => {
      const vitals = [
         v.bp_sys ? `BP: ${v.bp_sys}/${v.bp_dia}` : null,
         v.pr ? `Pulse: ${v.pr}bpm` : null,
         v.spo2 ? `SpO2: ${v.spo2}%` : null,
         v.temp ? `Temp: ${v.temp}°C` : null,
      ].filter(Boolean).join(" | ")
      
      sections.push(`[${idx + 1}] Date: ${format(parseISO(v.visit_date), "dd MMM yyyy")}`)
      if (vitals) sections.push(`   Vitals: ${vitals}`)
      if (v.exam_notes) sections.push(`   Note: ${v.exam_notes}`)
    })
  }

  return sections.join("\n")
}

export function buildAIPrompt(patient: any, template: AIPromptTemplate): string {
  const caseData = generateAnonymizedClinicalCase(patient)
  
  return `Act as a senior clinical consultant. ${template.command}

Here is the anonymized patient data:
---
${caseData}
---
Please provide your clinical response in a structured format.`
}
