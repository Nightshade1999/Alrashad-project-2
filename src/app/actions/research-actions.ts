"use server"

import { getGenerativeModel, MODEL_PRIORITY } from "@/lib/gemini"

export async function runMedicalCorrelationAction(
  var1Def: any, 
  var2Def: any, 
  dataset: any[], 
  userInstruction?: string
) {
  if (!dataset || dataset.length === 0) return { error: 'No data provided.' }

  // Read engine URL from env — defaults to localhost for local dev only
  const engineUrl = process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000'

  // 1. Send data to your Python Engine for pure math
  const pythonResponse = await fetch(`${engineUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      independent_vars: [var1Def],
      dependent_var: var2Def,
      data: dataset
    })
  })

  if (!pythonResponse.ok) throw new Error("Python engine failed to calculate statistics.")
  const statsResult = await pythonResponse.json()

  // 2. Send the MATHEMATICAL TRUTH to Gemini for clinical interpretation
  const prompt = `
    You are an elite Clinical Data Scientist.
    OBJECTIVE: ${userInstruction || `Analyze the correlation between ${var1Def.label} and ${var2Def.label}.`}
    
    STATISTICAL ENGINE RESULTS (ABSOLUTE FACT):
    Test Used: ${statsResult.test_used}
    Statistic: ${statsResult.statistic}
    P-Value: ${statsResult.p_value}
    
    INSTRUCTIONS: Write a professional Clinical Abstract. If P-value > 0.05, explicitly state there is NO statistically significant correlation. Do not invent trends.
  `

  let lastError: any = null
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = getGenerativeModel(modelName)
      const aiResult = await model.generateContent(prompt)
      
      return { 
        result: aiResult.response.text(), 
        chartData: statsResult.chart_data // Pass the chart data straight to Recharts!
      }
    } catch (err: any) {
      console.warn(`[Research-Action] Model ${modelName} failed:`, err.message)
      lastError = err
    }
  }

  return { error: lastError?.message || 'Failed to generate study across all available Gemini models.' }
}

/**
 * Advanced Research Action: Natural Language Query
 * Handles complex multi-variable instructions by allowing Gemini to choose the focus.
 */
export async function runComplexAIStudyAction(instruction: string, fullDataset: any[]) {
  // Pre-process the dataset to a clean CSV-like structure for the AI
  const cleanData = fullDataset.map((p, i) => ({
    id: i + 1,
    age: p.age,
    gender: p.gender,
    ward_number: p.ward_number,
    category: p.category,
    admitted: p.created_at,
    chronic: p.chronic_diseases?.map((d: any) => d.name).join(', ') || 'None',
    psych_meds: p.psych_drugs?.map((d: any) => d.name).join(', ') || 'None',
    int_meds: p.medical_drugs?.map((d: any) => d.name).join(', ') || 'None',
    visits: p.visits?.length || 0,
    labs: p.investigations?.length || 0,
    days_in_ward: Math.floor((new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24))
  }))

  const prompt = `You are a Senior Hospital Administrator and Medical researcher.
A user has requested a complex clinical study: "${instruction}"

Here is the data for all ${cleanData.length} patients in the system:
${JSON.stringify(cleanData, null, 1)}

INSTRUCTIONS:
1. Execute the research objective specified by the user.
2. Select the relevant variables from the data provided to support your argument.
3. If they mention "Summer" or "Winter", look at the 'admitted' field (May-Sept is Summer in Iraq).
4. Perform the statistical breakdown (Percentages, Ward comparisons, Burnout risk, Mortality trends).
5. Output a high-level "Medical Research Paper" summary in Markdown.

BE PRECISE. If you see a trend, highlight it. If you see no trend, state that clearly.`

  let lastError: any = null
  for (const modelName of MODEL_PRIORITY) {
    try {
      console.log(`[Complex-Study-Action] Attempting with model: ${modelName}`)
      const model = getGenerativeModel(modelName)
      const result = await model.generateContent(prompt)
      return { result: result.response.text() }
    } catch (err: any) {
      console.warn(`[Complex-Study-Action] Model ${modelName} failed:`, err.message)
      lastError = err
    }
  }

  return { error: lastError?.message || 'Failed to generate complex study across all available Gemini models.' }
}
