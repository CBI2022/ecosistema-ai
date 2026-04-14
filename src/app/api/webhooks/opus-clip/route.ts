import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Opus Clip webhook — recibe los clips generados automáticamente.
 *
 * Formato esperado (cuando se conecte Opus Clip real):
 * {
 *   "job_id": "xyz",
 *   "source_video_id": "youtube_id",
 *   "status": "done",
 *   "clips": [
 *     { "id": "...", "title": "...", "preview_url": "...", "video_url": "...", "thumbnail_url": "...", "duration": 45, "virality_score": 8.5, "transcript": "..." },
 *     ...
 *   ]
 * }
 *
 * Seguridad: valida el header `x-opus-signature` con un secret compartido (OPUS_WEBHOOK_SECRET).
 */

export async function POST(request: NextRequest) {
  // Validación de firma si hay secret configurado
  const secret = process.env.OPUS_WEBHOOK_SECRET
  if (secret) {
    const sig = request.headers.get('x-opus-signature')
    if (sig !== secret) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  }

  const body = await request.json().catch(() => null) as {
    job_id?: string
    source_video_id?: string
    status?: string
    clips?: Array<{
      id: string
      title?: string
      preview_url?: string
      video_url?: string
      thumbnail_url?: string
      duration?: number
      virality_score?: number
      transcript?: string
    }>
  } | null

  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const admin = createAdminClient()

  // Buscar video_source por external_id (YouTube id) o por opus_job_id
  const { data: source } = await admin
    .from('video_sources')
    .select('id')
    .or(
      body.source_video_id
        ? `external_id.eq.${body.source_video_id},opus_job_id.eq.${body.job_id}`
        : `opus_job_id.eq.${body.job_id}`
    )
    .maybeSingle()

  if (!source) {
    return NextResponse.json({ error: 'source not found' }, { status: 404 })
  }

  // Actualizar estado del source
  await admin
    .from('video_sources')
    .update({ opus_status: body.status === 'done' ? 'done' : 'error' })
    .eq('id', source.id)

  // Insertar clips
  const clips = body.clips || []
  if (clips.length > 0) {
    const rows = clips.map((c) => ({
      video_source_id: source.id,
      external_clip_id: c.id,
      title: c.title || null,
      preview_url: c.preview_url || null,
      video_url: c.video_url || null,
      thumbnail_url: c.thumbnail_url || null,
      duration_seconds: c.duration || null,
      virality_score: c.virality_score ?? null,
      transcript: c.transcript || null,
      status: 'available' as const,
    }))
    await admin.from('clips').insert(rows)
  }

  return NextResponse.json({ ok: true, stored: clips.length })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'opus-clip webhook' })
}
