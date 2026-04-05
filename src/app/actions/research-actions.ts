"use server"

import { getGenerativeModel, MODEL_PRIORITY } from "@/lib/gemini"

export async function runMedicalCorrelationAction(
  var1Name: string, 
  var2Name: string, 
  dataset: any[], 
  statsContext?: string,
  userInstruction?: string
) {
  if (!dataset || dataset.length === 0) {
    return { error: 'No data provided to analyze.' }
  }

  // Convert the dataset into a strict Markdown Tabular format
  let markdownTable = `| Record (Anon) | ${var1Name} | ${var2Name} |\n|---|---|---|\n`
  dataset.forEach((row, i) => {
    markdownTable += `| #${i + 1} | ${row.val1 ?? 'N/A'} | ${row.val2 ?? 'N/A'} |\n`
  })

  // THE ADVANCED AI RESEARCH PROMPT
  const prompt = `You are an elite Clinical Data Scientist and Medical Research AI.

${userInstruction ? `YOUR SPECIFIC CLINICAL OBJECTIVE: "${userInstruction}"` : `YOUR TASK: Analyze the correlation between "${var1Name}" and "${var2Name}".`}

${statsContext ? `MATH ENGINE CALCULATIONS: \n${statsContext}\n\n` : ''}

Below is the clinical dataset extracted from the Hospital Ward Management System.
The dataset is anonymized for patient privacy.

DATASET:
${markdownTable}

STRICT REPORTING GUIDELINES:
1. Provide a professional "Clinical Abstract" of your findings.
2. Analyze the "Study Group" versus the "Control" baseline patterns.
3. Elaborate on Statistical Trends (Breakdowns, percentages, or frequencies).
4. Address Clinical Significance: Is there a medical reason for this correlation?
5. Formulate a final "Investigative Conclusion" with actionable hospital ward recommendations.

Use formal medical terminology and format your output entirely in rich Markdown (Bold text, Bullet points, Blockquotes, Tables).
`

  let lastError: any = null
  for (const modelName of MODEL_PRIORITY) {
    try {
      console.log(`[Research-Action] Attempting with model: ${modelName}`)
      const model = getGenerativeModel(modelName)
      const result = await model.generateContent(prompt)
      return { result: result.response.text() }
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
