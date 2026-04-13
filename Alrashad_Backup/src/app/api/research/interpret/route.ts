import { NextResponse } from 'next/server'
import { getGenerativeModel, MODEL_PRIORITY } from "@/lib/gemini"

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const systemPrompt = `You are a Senior Hospital Administrator and Medical researcher.
    You will be given the output of rigorous statistical tests (like t-tests, ANOVA, Chi-Square).
    Your job is to read these metrics (P-values, Confidence Intervals, Sample Sizes, Group Means) and write out the "Results" and "Conclusion" section of a medical publication.
    - Format output in beautiful Markdown.
    - Explicitly state the statistical test used and the p-value.
    - Keep patient data completely abstract.
    - If the p-value > 0.05, boldly state that there is NO statistically significant evidence. Do not hallucinate a correlation.
    
    Here is the request:
    ${prompt}
    `

    let lastError: any = null
    for (const modelName of MODEL_PRIORITY) {
      try {
        console.log(`[Research-Interpret] Attempting with model: ${modelName}`)
        const model = getGenerativeModel(modelName)
        const result = await model.generateContent(systemPrompt)
        const responseText = result.response.text()

        if (responseText) {
          return NextResponse.json({ text: responseText })
        }
      } catch (err: any) {
        console.warn(`[Research-Interpret] Model ${modelName} failed:`, err.message)
        lastError = err
        // Continue to next model if it's a 4xx error (quota, not found) or 5xx
      }
    }

    // If we reach here, all models failed
    const finalErrorMsg = lastError?.message || "All Gemini models failed to interpret research."
    return NextResponse.json(
      { text: `AI Interpretation failed across all models: ${finalErrorMsg}` },
      { status: lastError?.status || 500 }
    )

  } catch (error: any) {
    console.error("AI Route Critical Error:", error)
    return NextResponse.json(
      { text: `AI Route Critical Error: ${error.message}` },
      { status: 500 }
    )
  }
}
