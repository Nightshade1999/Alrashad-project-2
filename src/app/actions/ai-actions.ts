"use server"

import { getGenerativeModel, MODEL_PRIORITY } from "@/lib/gemini"

export async function getClinicalAdvice(patientData: any, history: { role: "user" | "model", parts: { text: string }[] }[] = []) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY")
    throw new Error("GEMINI_API_KEY is not configured. Please check your environment variables.")
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

  const systemContext = `
You are an expert Clinical Consultant in a Medical Ward. 
Provide professional, evidence-based advice for optimizing the management of this patient's chronic diseases (specifically Diabetes and Hypertension if applicable).

### Hospital Formulary (Available Medications ONLY):
- Hypertension: Amlodipine, Capoten (Captopril).
- Diabetes (Oral): Metformin, Daonil (Glibenclamide).
- Diabetes (Insulin): Soluble Insulin, Mixtard Insulin, Lente Insulin.

### Patient Profile:
- Name: ${name} (Age: ${age}, Gender: ${gender})
- Clinical Category: ${category}
- Chronic Diseases: ${chronic_diseases || "None"}
- Current Medical Drugs: ${medical_drugs || "None"}
- Current Psych Drugs: ${psych_drugs || "None"}
- Allergies: ${allergies || "None"}

### Clinical History:
- Labs: ${labsSummary || "No lab records found."}
- Visits: ${visitsSummary || "No visit notes found."}

### Requirements:
1. Provide a brief assessment.
2. Suggest dose optimizations using ONLY the hospital formulary.
3. Tone: Professional, clinical, and concise. Use Markdown.
4. If some data is missing, provide general guidance based on the available information.
5. In multi-turn chat, stay in character as the ward clinical advisor.
`

  let lastError: any = null

  // Try models in order of priority: Pro > Thinking > Flash
  for (const modelName of MODEL_PRIORITY) {
    try {
      console.log(`Attempting clinical advice with model: ${modelName}`)
      const model = getGenerativeModel(modelName)
      const chat = model.startChat({
        history: history.length > 0 ? history : [],
      })

      const result = await chat.sendMessage(history.length === 0 ? systemContext : history[history.length - 1].parts[0].text)
      const response = await result.response
      const text = response.text()
      
      if (text) {
        return text
      }
    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message)
      lastError = error
      // If it's a 404 or unsupported error, continue to next model
      // If it's a SAFETY error, we might want to stop early, but let's try other models just in case
      if (error.message?.includes("SAFETY")) {
          // Safety blocks are often model-specific, but if all block it, we'll see it at the end
      }
    }
  }

  // If we reach here, all models failed
  console.error("All Gemini models failed:", {
    message: lastError?.message,
    status: lastError?.status,
  })
  
  if (lastError?.message?.includes("429")) {
    throw new Error("API Quota exceeded across all models. Please wait a minute.")
  }
  if (lastError?.message?.includes("SAFETY")) {
    throw new Error("AI advice blocked by clinical safety filters. Review patient data.")
  }
  
  throw new Error(`Gemini AI Error: ${lastError?.message || "Connection to clinical advisor failed across all available models."}`)
}
