"use server"

import { model } from "@/lib/gemini"

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

  // The base context/prompt for the clinical consultant
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

  try {
    // For the first message or if history is empty, start with the system context
    const chat = model.startChat({
      history: history.length > 0 ? history : [],
    })

    // If it's the very first request (no history), we send the full context as the user's first prompt
    const message = history.length === 0 
      ? `System Context: ${systemContext}\n\nClinical Inquiry: Please provide an initial clinical assessment and optimization plan for this patient.`
      : history[history.length - 1].parts[0].text // This isn't quite right for startChat, but good for simple logic

    // Actually, let's just use sendMessage for the last user message
    // If no history, we send the base prompt.
    const result = await chat.sendMessage(history.length === 0 ? systemContext : history[history.length - 1].parts[0].text)
    const response = await result.response
    const text = response.text()
    
    if (!text) {
      throw new Error("AI returned an empty response.")
    }
    
    return text
  } catch (error: any) {
    console.error("Gemini AI API Error:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
    })
    
    // Check for specific error types to help the user
    if (error.message?.includes("429")) {
      throw new Error("API Quota exceeded. Please wait a minute or upgrade your Gemini API tier.")
    }
    if (error.message?.includes("400")) {
      throw new Error(`API Request Error: ${error.message}. Please check patient data formatting.`)
    }
    if (error.message?.includes("SAFETY")) {
      throw new Error("The AI advisor blocked this request due to safety filters. Try refining the patient notes.")
    }
    
    throw new Error(`Gemini AI Error: ${error.message || "Unknown error occurred"}`)
  }
}
