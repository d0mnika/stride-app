import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a study assistant helping a student prepare for exams.
Summarize study material clearly and concisely.
Focus on key concepts, definitions, and important points a student needs to remember.
Use bullet points for main ideas. Keep the summary under 400 words.`

export async function summarizeWithOpenAI(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const client = new OpenAI({ apiKey })

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Summarize this study material:\n\n${text}` },
    ],
    max_tokens: 600,
  })

  const summary = completion.choices[0]?.message?.content
  if (!summary) throw new Error('OpenAI returned empty response')
  return summary
}
