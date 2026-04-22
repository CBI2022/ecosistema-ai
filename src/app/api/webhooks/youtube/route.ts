import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookRateLimit } from '@/lib/rate-limit'

/**
 * YouTube PubSubHubbub webhook con verificación HMAC.
 *
 * Configuración requerida:
 *   - Variable env YOUTUBE_WEBHOOK_SECRET = secreto compartido con hub.secret al suscribir
 *
 * Suscripción (una vez):
 *   POST https://pubsubhubbub.appspot.com/subscribe
 *     hub.mode=subscribe
 *     hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID
 *     hub.callback=https://app.costablancainvestments.com/api/webhooks/youtube
 *     hub.secret=<YOUTUBE_WEBHOOK_SECRET>
 *     hub.verify=async
 */

function verifyHmac(body: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha1=')) return false
  const expected = createHmac('sha1', secret).update(body).digest('hex')
  const received = signatureHeader.slice(5)
  if (expected.length !== received.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const challenge = url.searchParams.get('hub.challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const rl = webhookRateLimit(request, 'youtube')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const body = await request.text()

  const secret = process.env.YOUTUBE_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('x-hub-signature')
    if (!verifyHmac(body, signature, secret)) {
      console.warn('[youtube webhook] firma HMAC invalida — rechazado')
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[youtube webhook] YOUTUBE_WEBHOOK_SECRET no configurado — peticion aceptada sin verificar firma')
  }

  const videoIdMatch = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
  const titleMatch = body.match(/<title>([^<]+)<\/title>/)
  const publishedMatch = body.match(/<published>([^<]+)<\/published>/)

  if (!videoIdMatch) {
    return NextResponse.json({ error: 'video_id not found' }, { status: 400 })
  }

  const videoId = videoIdMatch[1]
  const title = titleMatch?.[1] || null
  const publishedAt = publishedMatch?.[1] || null

  const admin = createAdminClient()

  const { data: source, error } = await admin
    .from('video_sources')
    .upsert(
      {
        source: 'youtube',
        external_id: videoId,
        title,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        published_at: publishedAt,
        opus_status: 'pending',
      },
      { onConflict: 'external_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[youtube webhook] error saving video:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await sendToOpusClip(videoId, source?.id)
  } catch (err) {
    console.error('[youtube webhook] opus send failed:', err)
  }

  return NextResponse.json({ ok: true, videoId })
}

async function sendToOpusClip(videoId: string, sourceId: string | undefined) {
  if (!sourceId) return
  const admin = createAdminClient()
  await admin
    .from('video_sources')
    .update({ opus_status: 'processing', opus_job_id: `job_${videoId}` })
    .eq('id', sourceId)
}
