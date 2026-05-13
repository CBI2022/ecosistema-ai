import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fub } from '@/lib/fub/client'
import { personToRow, dealToRow } from '@/lib/fub/mapper'
import { audit } from '@/lib/audit'

/**
 * Cron diario (04:00 Madrid) que repesca de FUB cualquier delta perdido
 * por webhooks fallidos. Estrategia:
 *
 *  1. Lista los últimos N people actualizados en FUB (últimas 24h)
 *  2. Verifica que cada uno existe en Supabase con `updated_at_fub >= remote.updated`
 *  3. Si falta o está desactualizado → upsert
 *
 * Misma idea para deals. Calls/texts/emails/etc se cubren por webhooks +
 * sync semanal manual desde /admin/fub.
 *
 * Configurar en vercel.json:
 *   { "path": "/api/cron/fub-reconcile", "schedule": "0 4 * * *" }
 *
 * Vercel Cron firma con `authorization: Bearer <CRON_SECRET>`.
 */

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const summary = { people_resynced: 0, deals_resynced: 0, errors: [] as string[] }

  // ============================================================
  // People reconcile
  // ============================================================
  try {
    for await (const page of fub.listPeople({ updatedSince: since, sort: 'updated' })) {
      // Trae lo que YA tenemos en Supabase de este batch
      const ids = page.map((p) => p.id)
      const { data: existing } = await admin
        .from('fub_people')
        .select('id, updated_at_fub')
        .in('id', ids)

      const existingMap = new Map<number, string | null>()
      for (const e of existing || []) existingMap.set(e.id, e.updated_at_fub)

      const stale = page.filter((p) => {
        const localUpdated = existingMap.get(p.id)
        if (!localUpdated) return true
        if (!p.updated) return false
        return new Date(p.updated).getTime() > new Date(localUpdated).getTime()
      })

      if (stale.length) {
        const rows = stale.map(personToRow)
        const { error } = await admin.from('fub_people').upsert(rows, { onConflict: 'id' })
        if (error) summary.errors.push(`people upsert: ${error.message}`)
        else summary.people_resynced += stale.length
      }
    }
  } catch (err) {
    summary.errors.push(`people fetch: ${(err as Error).message}`)
  }

  // ============================================================
  // Deals reconcile
  // ============================================================
  try {
    for await (const page of fub.listDeals({ updatedSince: since })) {
      const ids = page.map((d) => d.id)
      const { data: existing } = await admin
        .from('fub_deals')
        .select('id, updated_at_fub')
        .in('id', ids)

      const existingMap = new Map<number, string | null>()
      for (const e of existing || []) existingMap.set(e.id, e.updated_at_fub)

      const stale = page.filter((d) => {
        const localUpdated = existingMap.get(d.id)
        if (!localUpdated) return true
        if (!d.updated) return false
        return new Date(d.updated).getTime() > new Date(localUpdated).getTime()
      })

      if (stale.length) {
        const rows = stale.map(dealToRow)
        const { error } = await admin.from('fub_deals').upsert(rows, { onConflict: 'id' })
        if (error) summary.errors.push(`deals upsert: ${error.message}`)
        else summary.deals_resynced += stale.length
      }
    }
  } catch (err) {
    summary.errors.push(`deals fetch: ${(err as Error).message}`)
  }

  // ============================================================
  // Cleanup: webhook log > 30 días
  // ============================================================
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    await admin.from('fub_webhook_log').delete().lt('received_at', cutoff)
  } catch (err) {
    summary.errors.push(`log cleanup: ${(err as Error).message}`)
  }

  await audit({
    actor_id: null,
    actor_email: 'cron@system',
    action: 'fub.reconcile',
    entity_type: 'fub_sync',
    metadata: summary,
  })

  return NextResponse.json({ ok: summary.errors.length === 0, ...summary })
}
