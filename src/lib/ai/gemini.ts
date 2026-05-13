import Groq from 'groq-sdk'

function buildPrompt(text: string, language: string): string {
  const langInstruction = language === 'auto'
    ? 'Respond in the same language as the text being summarized.'
    : `Write the summary in ${language}.`

  return `You are a study assistant helping a student prepare for exams.
Summarize the following study material as structured study notes.
Use ## for section headings (descriptive topic names, not "Section 1" or "Part 2").
Under each heading, use bullet points (- ) for key concepts, definitions, and important details.
Do not add a top-level title — start directly with the first ## heading.
${langInstruction}

Text to summarize:
${text}`
}

export async function summarizeWithGemini(text: string, language = 'auto'): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const groq = new Groq({ apiKey })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildPrompt(text, language) }],
    max_tokens: 600,
  })

  const summary = completion.choices[0]?.message?.content
  if (!summary) throw new Error('Groq returned empty response')
  return summary
}
