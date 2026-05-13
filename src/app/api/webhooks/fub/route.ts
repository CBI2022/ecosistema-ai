import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookRateLimit } from '@/lib/rate-limit'
import { verifyFubSignature, deriveEventId } from '@/lib/fub/webhooks'
import { refetchResource } from '@/actions/fub'

/**
 * Webhook de Follow Up Boss.
 *
 * Pattern copiado de `webhooks/youtube/route.ts` (HMAC-SHA1 + timingSafeEqual)
 * y `webhooks/opus-clip/route.ts` (idempotencia con tabla log).
 *
 * Configurar:
 *   - Variable env FUB_WEBHOOK_SECRET (autogenerado al suscribir)
 *   - Suscripción inicial vía /admin/fub → "Subscribe Webhooks"
 *
 * Payload típico de FUB:
 *   {
 *     "event": "peopleUpdated",
 *     "resourceIds": [123, 456],
 *     "eventId": "evt_xxx",
 *     "uri": "https://api.followupboss.com/v1/people/123",
 *     "created": "2026-05-13T10:00:00Z"
 *   }
 *
 * El webhook SOLO incluye el ID — debemos refetch el recurso completo.
 */

const PayloadSchema = z.object({
  event: z.string(),
  resourceIds: z.array(z.number()).optional().default([]),
  eventId: z.string().optional(),
  uri: z.string().optional(),
  created: z.string().optional(),
})

const EVENT_TO_RESOURCE: Record<
  string,
  'person' | 'deal' | 'call' | 'text' | 'email' | 'appointment' | 'task' | 'note' | 'event'
> = {
  peopleCreated: 'person',
  peopleUpdated: 'person',
  peopleTagsCreated: 'person',
  peopleDeleted: 'person',
  dealsCreated: 'deal',
  dealsUpdated: 'deal',
  callsCreated: 'call',
  textMessagesCreated: 'text',
  emailsCreated: 'email',
  appointmentsCreated: 'appointment',
  appointmentsUpdated: 'appointment',
  tasksCreated: 'task',
  tasksUpdated: 'task',
  notesCreated: 'note',
  eventsCreated: 'event',
}

export async function POST(request: NextRequest) {
  // Rate limit por IP — FUB no debería disparar más de 30/min desde una IP
  const rl = webhookRateLimit(request, 'fub')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const body = await request.text()

  // Verificar firma HMAC-SHA1 (header: FUB-Signature)
  const secret = process.env.FUB_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('fub-signature') || request.headers.get('FUB-Signature')
    if (!verifyFubSignature(body, signature, secret)) {
      console.warn('[fub webhook] firma HMAC invalida — rechazado')
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[fub webhook] FUB_WEBHOOK_SECRET no configurado — aceptado sin firma')
  }

  let parsed: z.infer<typeof PayloadSchema>
  try {
    parsed = PayloadSchema.parse(JSON.parse(body))
  } catch (err) {
    console.error('[fub webhook] payload inválido', err)
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const eventId = deriveEventId(parsed)
  const admin = createAdminClient()

  // Idempotencia: insertar con event_id UNIQUE — si ya existe, skip
  const { error: insertErr } = await admin.from('fub_webhook_log').insert({
    event_id: eventId,
    event_type: parsed.event,
    resource_ids: parsed.resourceIds,
    raw_body: parsed as unknown as Record<string, unknown>,
    status: 'pending',
  })

  if (insertErr) {
    // 23505 = unique_violation → ya procesado, idempotent skip
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, deduped: true, eventId })
    }
    console.error('[fub webhook] error logging:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Procesar (refetch para cada resourceId)
  const resourceType = EVENT_TO_RESOURCE[parsed.event]
  const errors: string[] = []

  if (!resourceType) {
    await admin
      .from('fub_webhook_log')
      .update({ status: 'skipped', processed_at: new Date().toISOString(), error_message: 'unknown event type' })
      .eq('event_id', eventId)
    return NextResponse.json({ ok: true, skipped: true, reason: 'unknown event' })
  }

  for (const id of parsed.resourceIds) {
    const r = await refetchResource(resourceType, id)
    if (!r.ok) errors.push(`${resourceType}#${id}: ${r.error}`)
  }

  // Manejo especial: peopleDeleted → marcar soft delete
  if (parsed.event === 'peopleDeleted') {
    for (const id of parsed.resourceIds) {
      await admin
        .from('fub_people')
        .update({ deleted: true, synced_at: new Date().toISOString() })
        .eq('id', id)
    }
  }

  await admin
    .from('fub_webhook_log')
    .update({
      status: errors.length === 0 ? 'processed' : 'error',
      processed_at: new Date().toISOString(),
      error_message: errors.length ? errors.join('; ') : null,
    })
    .eq('event_id', eventId)

  return NextResponse.json({
    ok: errors.length === 0,
    eventId,
    processed: parsed.resourceIds.length,
    errors: errors.length ? errors : undefined,
  })
}

// GET para health check + verificación manual de suscripción (algunos clientes lo usan)
export async function GET() {
  return NextResponse.json({ ok: true, service: 'fub-webhook' })
}
