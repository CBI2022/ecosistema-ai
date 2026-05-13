// Helpers para webhooks de FUB:
// - Verificación HMAC-SHA1 del header FUB-Signature
// - Suscripción / desuscripción masiva de los 14 eventos relevantes

import { createHmac, timingSafeEqual } from 'crypto'
import { fub } from './client'
import type { FubEventName } from './types'

export const FUB_EVENTS: FubEventName[] = [
  'peopleCreated',
  'peopleUpdated',
  'peopleTagsCreated',
  'peopleDeleted',
  'notesCreated',
  'callsCreated',
  'textMessagesCreated',
  'emailsCreated',
  'appointmentsCreated',
  'appointmentsUpdated',
  'dealsCreated',
  'dealsUpdated',
  'tasksCreated',
  'tasksUpdated',
  'eventsCreated',
]

/**
 * Verifica firma HMAC-SHA1 de FUB.
 * Header esperado: FUB-Signature: sha1=<hex>  (también acepta "<hex>" pelado)
 */
export function verifyFubSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false
  const received = signatureHeader.startsWith('sha1=')
    ? signatureHeader.slice(5)
    : signatureHeader
  const expected = createHmac('sha1', secret).update(body).digest('hex')
  if (expected.length !== received.length) return false
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Suscribe los 14 eventos relevantes al endpoint del dashboard.
 * Si ya existen webhooks para algún evento → los deja como están (no duplica).
 * Devuelve resumen para mostrar en /admin/fub.
 */
export async function subscribeAllWebhooks(callbackUrl: string) {
  const existing = await fub.listWebhooks()
  const existingByEvent = new Map<string, number>()
  for (const w of existing.webhooks || []) {
    existingByEvent.set(w.event, w.id)
  }

  const created: Array<{ event: FubEventName; id: number }> = []
  const skipped: Array<{ event: FubEventName; id: number }> = []
  const errors: Array<{ event: FubEventName; error: string }> = []

  for (const event of FUB_EVENTS) {
    const exists = existingByEvent.get(event)
    if (exists) {
      skipped.push({ event, id: exists })
      continue
    }
    try {
      const sub = await fub.createWebhook({ event, url: callbackUrl })
      created.push({ event, id: sub.id })
    } catch (err) {
      errors.push({ event, error: (err as Error).message })
    }
  }

  return { created, skipped, errors, total: FUB_EVENTS.length }
}

export async function unsubscribeAllWebhooks() {
  const existing = await fub.listWebhooks()
  const deleted: number[] = []
  const errors: Array<{ id: number; error: string }> = []
  for (const w of existing.webhooks || []) {
    try {
      await fub.deleteWebhook(w.id)
      deleted.push(w.id)
    } catch (err) {
      errors.push({ id: w.id, error: (err as Error).message })
    }
  }
  return { deleted, errors }
}

/**
 * Extrae un event_id estable del payload (FUB envía `eventId` en algunos
 * payloads, fallback a `uri` + `created` + resourceIds).
 */
export function deriveEventId(payload: {
  eventId?: string
  uri?: string
  event?: string
  resourceIds?: number[]
  created?: string
}): string {
  if (payload.eventId) return payload.eventId
  const ids = (payload.resourceIds || []).join(',')
  return `${payload.event ?? 'unknown'}:${ids}:${payload.created ?? payload.uri ?? Date.now()}`
}
