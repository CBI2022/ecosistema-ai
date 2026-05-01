import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Cron de Vercel: ejecuta cada minuto y publica los scheduled_posts cuya
// scheduled_at ya ha llegado y estén en status 'queued'.
//
// Configurar en vercel.json:
//   "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" }]
//
// Vercel Cron firma cada petición con el header `authorization: Bearer <CRON_SECRET>`.
// Validamos esa firma para que nadie pueda ejecutar el cron manualmente.

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Obtener posts pendientes
  const { data: pending, error: queryErr } = await admin
    .from('scheduled_posts')
    .select('id, agent_id, platforms, scheduled_at, content, media_urls')
    .lte('scheduled_at', now)
    .eq('status', 'queued')
    .limit(20)

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const results: Array<{ id: string; status: string; reason?: string }> = []

  for (const post of pending) {
    try {
      // Marcar como 'running' para evitar doble proceso
      await admin
        .from('scheduled_posts')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', post.id)

      // TODO: cuando IG/TikTok/YouTube estén conectados, llamar al servicio de publicación
      // de cada plataforma con post.platforms[]. De momento marcamos como pending_integration.
      const platforms = (post.platforms as string[] | null) ?? []
      const hasConnections = false // TODO: leer social_accounts del agente

      if (!hasConnections) {
        await admin
          .from('scheduled_posts')
          .update({
            status: 'pending_integration',
            error_message: 'No hay plataformas conectadas (IG/TikTok/YouTube). Conectarlas en /social.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'pending_integration', reason: 'no platforms connected' })
        continue
      }

      // Lugar para futuras llamadas: publishToInstagram(post), publishToTikTok(post), etc.
      // Sin integraciones, lo marcamos como done con metadata explicativa.
      await admin
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'published' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      await admin
        .from('scheduled_posts')
        .update({
          status: 'error',
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'error', reason: msg })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
