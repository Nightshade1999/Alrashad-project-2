import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(apiKey)

// User-requested priority: Pro > Thinking > Flash
export const MODEL_PRIORITY = [
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gemini-2.0-flash-thinking-exp",
  "gemini-2.5-flash",
  "gemini-flash-latest"
]

export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ 
    model: modelName,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
    }
  })
}
