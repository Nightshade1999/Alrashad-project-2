"use server"

import { model } from "@/lib/gemini"

export async function getClinicalAdvice(patientData: any) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.")
  }

  const {
    name, age, gender, category, 
    chronic_diseases, medical_drugs, psych_drugs, allergies,
    investigations, visits
  } = patientData

  const labsSummary = investigations?.slice(0, 5).map((inv: any) => 
    `- Date: ${inv.date}, HbA1c: ${inv.hba1c}%, Hb: ${inv.hb}, RBS: ${inv.rbs}, S.Creat: ${inv.s_creatinine}`
  ).join("\n")

  const visitsSummary = visits?.slice(0, 3).map((v: any) => 
    `- Date: ${v.visit_date}, Notes: ${v.exam_notes}`
  ).join("\n")

  const prompt = `
You are an expert Clinical Consultant in a Medical Ward. 
Provide professional, evidence-based advice for optimizing the management of this patient's chronic diseases (specifically Diabetes and Hypertension if applicable).

### Hospital Formulary (Available Medications ONLY):
- Hypertension: Amlodipine, Capoten (Captopril).
- Diabetes (Oral): Metformin, Daonil (Glibenclamide).
- Diabetes (Insulin): Soluble Insulin, Mixtard Insulin, Lente Insulin.

### Patient Data:
- Name: ${name}
- Age: ${age}
- Gender: ${gender}
- Clinical Category: ${category}
- Chronic Diseases: ${chronic_diseases || "None"}
- Current Medical Drugs: ${medical_drugs || "None"}
- Current Psych Drugs: ${psych_drugs || "None"}
- Allergies: ${allergies || "None"}

### Recent Lab Results (Investigations):
${labsSummary || "No lab records found."}

### Recent Clinical Visits/Notes:
${visitsSummary || "No visit notes found."}

### Requirements for your response:
1. Provide a brief clinical assessment based on the latest data (e.g., is diabetes/HTN controlled?).
2. Suggest specific dose optimizations or medication additions using ONLY the hospital formulary listed above.
3. Include precautions (e.g., renal function, potential drug interactions with psych meds).
4. Tone: Professional, clinical, and concise. Use Markdown formatting.
5. If some data is missing, provide general guidance based on the available information.

Response:
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    if (!text) {
      console.error("Gemini AI: Empty response received.")
      throw new Error("Empty response from AI.")
    }
    
    return text
  } catch (error: any) {
    console.error("Gemini AI Clinical Advisor Error:", {
      message: error.message,
      stack: error.stack,
      prompt: prompt.substring(0, 200) + "..."
    })
    
    if (error.message?.includes("SAFETY")) {
      throw new Error("AI advice was blocked due to safety filters. Please review the patient data for sensitive content.")
    }
    
    throw new Error("The AI Clinical Advisor is currently unavailable. Please try again in a few moments.")
  }
}
