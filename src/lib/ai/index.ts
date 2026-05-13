import { summarizeWithGemini } from './gemini'
import { summarizeWithOpenAI } from './openai'

export interface SummarizeResult {
  summary: string
  modelUsed: string
}

// Tries Groq (Llama 3.3 70B) first — free tier, no billing required.
// Falls back to GPT-4o mini if Groq is unavailable or errors.
export async function summarizeText(text: string, language = 'auto'): Promise<SummarizeResult> {
  if (process.env.GROQ_API_KEY) {
    try {
      const summary = await summarizeWithGemini(text, language)
      return { summary, modelUsed: 'llama-3.3-70b' }
    } catch (err) {
      console.error('[AI] Groq failed, falling back to OpenAI:', err)
    }
  }

  const summary = await summarizeWithOpenAI(text)
  return { summary, modelUsed: 'gpt-4o-mini' }
}
