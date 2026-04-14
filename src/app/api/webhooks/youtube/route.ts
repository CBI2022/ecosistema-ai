import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * YouTube PubSubHubbub webhook.
 *
 * Flujo:
 * 1. YouTube envía GET con hub.challenge (verificación) → devolvemos challenge en texto plano
 * 2. YouTube envía POST con XML/ATOM cuando hay nuevo vídeo → parseamos video_id y creamos video_source
 *
 * Para activar:
 *   POST a https://pubsubhubbub.appspot.com/subscribe con:
 *     hub.mode=subscribe
 *     hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=CBI_CHANNEL_ID
 *     hub.callback=https://tu-dominio.com/api/webhooks/youtube
 *     hub.verify=async
 */

// Verificación de suscripción
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const challenge = url.searchParams.get('hub.challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ ok: true })
}

// Notificación de nuevo vídeo
export async function POST(request: NextRequest) {
  const text = await request.text()

  // Parse muy simple de Atom feed
  const videoIdMatch = text.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
  const titleMatch = text.match(/<title>([^<]+)<\/title>/)
  const publishedMatch = text.match(/<published>([^<]+)<\/published>/)
  const channelMatch = text.match(/<yt:channelId>([^<]+)<\/yt:channelId>/)

  if (!videoIdMatch) {
    return NextResponse.json({ error: 'video_id not found' }, { status: 400 })
  }

  const videoId = videoIdMatch[1]
  const title = titleMatch?.[1] || null
  const publishedAt = publishedMatch?.[1] || null

  const admin = createAdminClient()

  // Upsert por external_id
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

  // Disparar envío a Opus Clip (stub — reemplazar con API real)
  try {
    await sendToOpusClip(videoId, source?.id)
  } catch (err) {
    console.error('[youtube webhook] opus send failed:', err)
  }

  return NextResponse.json({ ok: true, videoId })
}

async function sendToOpusClip(videoId: string, sourceId: string | undefined) {
  const admin = createAdminClient()
  if (!sourceId) return

  // TODO: Integrar con Opus Clip real cuando haya API/credenciales
  // Por ahora marcamos como "processing"
  await admin
    .from('video_sources')
    .update({ opus_status: 'processing', opus_job_id: `job_${videoId}` })
    .eq('id', sourceId)

  // Si Opus Clip tuviera API:
  // const res = await fetch('https://api.opus.pro/v1/clips', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.OPUS_CLIP_API_KEY}` },
  //   body: JSON.stringify({ video_url: `https://youtube.com/watch?v=${videoId}`, callback_url: 'https://tu-dominio.com/api/webhooks/opus-clip' }),
  // })
}
