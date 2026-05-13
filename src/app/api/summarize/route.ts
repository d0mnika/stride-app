import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile, getSummaryByMaterial, upsertSummary } from '@/lib/supabase/helpers'
import { summarizeText } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Plan check — summaries are Pro only
  const profile = await getProfile(supabase, user.id)
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'AI summaries require a Pro plan' }, { status: 403 })
  }

  const body = await req.json()
  const { materialId, text, language, mode, preGenerated } = body as {
    materialId?: string
    text?: string
    language?: string
    mode?: 'chunk' | 'save'
    preGenerated?: string
  }

  // ── mode: 'chunk' ── summarize one chunk, no DB save ─────────────────────────
  if (mode === 'chunk') {
    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: 'text must be at least 20 characters' }, { status: 400 })
    }
    try {
      const result = await summarizeText(text.trim(), language ?? 'auto')
      return NextResponse.json({ summary: result.summary })
    } catch (err: unknown) {
      const anyErr = err as { status?: number; headers?: { get?: (k: string) => string | null }; message?: string }
      if (anyErr?.status === 429) {
        const retryAfter = parseInt(anyErr?.headers?.get?.('retry-after') ?? '60', 10)
        return NextResponse.json({ error: 'rate_limited', retryAfter }, { status: 429 })
      }
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[/api/summarize chunk] AI error:', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  // ── mode: 'save' ── save pre-generated summary to DB (appends) ───────────────
  if (mode === 'save') {
    if (!materialId || typeof materialId !== 'string') {
      return NextResponse.json({ error: 'materialId is required' }, { status: 400 })
    }
    if (!preGenerated || typeof preGenerated !== 'string') {
      return NextResponse.json({ error: 'preGenerated is required' }, { status: 400 })
    }
    const existing = await getSummaryByMaterial(supabase, materialId)
    const combined = existing?.summary
      ? `${existing.summary}\n\n---\n\n${preGenerated}`
      : preGenerated
    const saved = await upsertSummary(supabase, {
      material_id: materialId,
      user_id: user.id,
      source_text: '',
      summary: combined,
      model_used: 'llama-3.3-70b',
    })
    return NextResponse.json({ summary: saved.summary, modelUsed: saved.model_used })
  }

  // ── default: single small text ── AI + save in one step ──────────────────────
  if (!materialId || typeof materialId !== 'string') {
    return NextResponse.json({ error: 'materialId is required' }, { status: 400 })
  }
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return NextResponse.json({ error: 'text must be at least 20 characters' }, { status: 400 })
  }

  let result
  try {
    result = await summarizeText(text.trim(), language ?? 'auto')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/summarize] AI error:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const existing = await getSummaryByMaterial(supabase, materialId)
  const combinedSummary = existing?.summary
    ? `${existing.summary}\n\n---\n\n${result.summary}`
    : result.summary

  const saved = await upsertSummary(supabase, {
    material_id: materialId,
    user_id: user.id,
    source_text: text.trim(),
    summary: combinedSummary,
    model_used: result.modelUsed,
  })

  return NextResponse.json({ summary: saved.summary, modelUsed: saved.model_used })
}
