'use server'

// Server actions para la integración FUB.
// - Solo admin puede disparar resync / subscribe webhooks / link profiles
// - Todas las escrituras a fub_* usan createAdminClient() (bypasea RLS)
// - Lecturas para UI agente usan createClient() (respeta RLS)

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fub } from '@/lib/fub/client'
import {
  personToRow,
  dealToRow,
  callToRow,
  textMessageToRow,
  emailToRow,
  appointmentToRow,
  taskToRow,
  noteToRow,
  eventToRow,
  stageToRow,
  pipelineToRow,
} from '@/lib/fub/mapper'
import { normalizeEmail } from '@/lib/fub/normalize'
import { subscribeAllWebhooks, unsubscribeAllWebhooks } from '@/lib/fub/webhooks'
import { getSiteUrl } from '@/lib/site-url'
import { audit } from '@/lib/audit'

// ============================================================
// Guards
// ============================================================

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, user: null }

  const admin = createAdminClient()
  const { data: map } = await admin
    .from('fub_user_map')
    .select('is_admin, fub_user_id')
    .eq('cbi_user_id', user.id)
    .maybeSingle()

  // Fallback: si todavía no está en fub_user_map, comprobar profiles.role
  if (!map?.is_admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return { error: 'forbidden' as const, user: null }
    }
  }

  return { error: null, user }
}

// ============================================================
// Backfill / sync
// ============================================================

export interface SyncResult {
  ok: boolean
  counts: Record<string, number>
  errors: string[]
  duration_ms: number
}

interface SyncOptions {
  sinceDays?: number  // por defecto 90
  includePeople?: boolean
  includeDeals?: boolean
  includeCalls?: boolean
  includeTexts?: boolean
  includeEmails?: boolean
  includeAppointments?: boolean
  includeTasks?: boolean
  includeNotes?: boolean
  includeEvents?: boolean
  includeMetadata?: boolean
}

export async function syncFubFromZero(opts: SyncOptions = {}): Promise<SyncResult> {
  const auth = await requireAdmin()
  if (auth.error) return { ok: false, counts: {}, errors: [auth.error], duration_ms: 0 }

  const started = Date.now()
  const counts: Record<string, number> = {}
  const errors: string[] = []

  const sinceDays = opts.sinceDays ?? 90
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString()
  const admin = createAdminClient()

  try {
    await audit({
      actor_id: auth.user!.id,
      actor_email: auth.user!.email,
      action: 'fub.syncFromZero.start',
      entity_type: 'fub_sync',
      metadata: { sinceDays },
    })

    // Metadata (siempre por defecto en backfill inicial)
    if (opts.includeMetadata !== false) {
      const pipelines = await fub.listPipelines()
      const pipelineRows = (pipelines.pipelines || []).map(pipelineToRow)
      if (pipelineRows.length) {
        await admin.from('fub_pipelines').upsert(pipelineRows, { onConflict: 'id' })
      }
      counts.pipelines = pipelineRows.length

      const stages = await fub.listStages()
      const stageRows = (stages.stages || []).map((s) => stageToRow(s))
      if (stageRows.length) {
        await admin.from('fub_stages').upsert(stageRows, { onConflict: 'id' })
      }
      counts.stages = stageRows.length
    }

    // People
    if (opts.includePeople !== false) {
      let total = 0
      for await (const page of fub.listPeople({ updatedSince: sinceIso, sort: 'updated' })) {
        const rows = page.map(personToRow)
        const { error } = await admin.from('fub_people').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`people upsert: ${error.message}`)
        total += rows.length
      }
      counts.people = total
    }

    // Deals
    if (opts.includeDeals !== false) {
      let total = 0
      for await (const page of fub.listDeals({ updatedSince: sinceIso })) {
        const rows = page.map(dealToRow)
        const { error } = await admin.from('fub_deals').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`deals upsert: ${error.message}`)
        total += rows.length
      }
      counts.deals = total
    }

    // Calls
    if (opts.includeCalls !== false) {
      let total = 0
      for await (const page of fub.listCalls({ createdSince: sinceIso })) {
        const rows = page.map(callToRow)
        const { error } = await admin.from('fub_calls').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`calls upsert: ${error.message}`)
        total += rows.length
      }
      counts.calls = total
    }

    // Text messages
    if (opts.includeTexts !== false) {
      let total = 0
      for await (const page of fub.listTextMessages({ createdSince: sinceIso })) {
        const rows = page.map(textMessageToRow)
        const { error } = await admin.from('fub_text_messages').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`texts upsert: ${error.message}`)
        total += rows.length
      }
      counts.text_messages = total
    }

    // Emails
    if (opts.includeEmails !== false) {
      let total = 0
      try {
        for await (const page of fub.listEmails({ createdSince: sinceIso })) {
          const rows = page.map(emailToRow)
          const { error } = await admin.from('fub_emails').upsert(rows, { onConflict: 'id' })
          if (error) errors.push(`emails upsert: ${error.message}`)
          total += rows.length
        }
      } catch (err) {
        errors.push(`emails fetch: ${(err as Error).message}`)
      }
      counts.emails = total
    }

    // Appointments
    if (opts.includeAppointments !== false) {
      let total = 0
      for await (const page of fub.listAppointments({ updatedSince: sinceIso })) {
        const rows = page.map(appointmentToRow)
        const { error } = await admin.from('fub_appointments').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`appointments upsert: ${error.message}`)
        total += rows.length
      }
      counts.appointments = total
    }

    // Tasks
    if (opts.includeTasks !== false) {
      let total = 0
      for await (const page of fub.listTasks({ updatedSince: sinceIso })) {
        const rows = page.map(taskToRow)
        const { error } = await admin.from('fub_tasks').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`tasks upsert: ${error.message}`)
        total += rows.length
      }
      counts.tasks = total
    }

    // Notes
    if (opts.includeNotes !== false) {
      let total = 0
      for await (const page of fub.listNotes({ createdSince: sinceIso })) {
        const rows = page.map(noteToRow)
        const { error } = await admin.from('fub_notes').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`notes upsert: ${error.message}`)
        total += rows.length
      }
      counts.notes = total
    }

    // Events
    if (opts.includeEvents !== false) {
      let total = 0
      for await (const page of fub.listEvents({ createdSince: sinceIso })) {
        const rows = page.map(eventToRow)
        const { error } = await admin.from('fub_events').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`events upsert: ${error.message}`)
        total += rows.length
      }
      counts.events = total
    }

    await audit({
      actor_id: auth.user!.id,
      actor_email: auth.user!.email,
      action: 'fub.syncFromZero.done',
      entity_type: 'fub_sync',
      metadata: { counts, errors },
    })

    revalidatePath('/admin/fub')
    revalidatePath('/dashboard')

    return {
      ok: errors.length === 0,
      counts,
      errors,
      duration_ms: Date.now() - started,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, counts, errors: [...errors, msg], duration_ms: Date.now() - started }
  }
}

// ============================================================
// Refetch puntual (usado por webhook)
// Esta función NO valida admin: la llaman el webhook handler y el cron.
// Su acceso está protegido por HMAC / CRON_SECRET, no por auth de usuario.
// ============================================================

export async function refetchResource(
  type: 'person' | 'deal' | 'call' | 'text' | 'email' | 'appointment' | 'task' | 'note' | 'event',
  id: number
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  try {
    switch (type) {
      case 'person': {
        const p = await fub.getPerson(id)
        await admin.from('fub_people').upsert(personToRow(p), { onConflict: 'id' })
        break
      }
      case 'deal': {
        const d = await fub.getDeal(id)
        await admin.from('fub_deals').upsert(dealToRow(d), { onConflict: 'id' })
        break
      }
      case 'call': {
        const c = await fub.getCall(id)
        await admin.from('fub_calls').upsert(callToRow(c), { onConflict: 'id' })
        break
      }
      case 'text': {
        const t = await fub.getTextMessage(id)
        await admin.from('fub_text_messages').upsert(textMessageToRow(t), { onConflict: 'id' })
        break
      }
      case 'email': {
        const e = await fub.getEmail(id)
        await admin.from('fub_emails').upsert(emailToRow(e), { onConflict: 'id' })
        break
      }
      case 'appointment': {
        const a = await fub.getAppointment(id)
        await admin.from('fub_appointments').upsert(appointmentToRow(a), { onConflict: 'id' })
        break
      }
      case 'task': {
        const t = await fub.getTask(id)
        await admin.from('fub_tasks').upsert(taskToRow(t), { onConflict: 'id' })
        break
      }
      case 'note': {
        const n = await fub.getNote(id)
        await admin.from('fub_notes').upsert(noteToRow(n), { onConflict: 'id' })
        break
      }
      case 'event': {
        const e = await fub.getEvent(id)
        await admin.from('fub_events').upsert(eventToRow(e), { onConflict: 'id' })
        // Si el evento crea/menciona una persona, refetchearla también
        if (e.personId) {
          try {
            const p = await fub.getPerson(e.personId)
            await admin.from('fub_people').upsert(personToRow(p), { onConflict: 'id' })
          } catch {
            // silent — la persona puede no existir si fue trash
          }
        }
        break
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ============================================================
// Webhook management
// ============================================================

export async function subscribeFubWebhooks() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const url = `${getSiteUrl()}/api/webhooks/fub`
  const result = await subscribeAllWebhooks(url)
  await audit({
    actor_id: auth.user!.id,
    actor_email: auth.user!.email,
    action: 'fub.webhooks.subscribe',
    entity_type: 'fub_webhooks',
    metadata: result,
  })
  revalidatePath('/admin/fub')
  return { success: true, ...result }
}

export async function unsubscribeFubWebhooks() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const result = await unsubscribeAllWebhooks()
  await audit({
    actor_id: auth.user!.id,
    actor_email: auth.user!.email,
    action: 'fub.webhooks.unsubscribe',
    entity_type: 'fub_webhooks',
    metadata: result,
  })
  revalidatePath('/admin/fub')
  return { success: true, ...result }
}

export async function listFubWebhooks() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }
  const res = await fub.listWebhooks()
  return { success: true, webhooks: res.webhooks || [] }
}

// ============================================================
// Mapping de profiles ↔ fub_user_map
// ============================================================

export async function linkProfilesToFub() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  const { data: maps } = await admin
    .from('fub_user_map')
    .select('fub_user_id, fub_email')
    .is('cbi_user_id', null)

  if (!maps || !maps.length) {
    return { success: true, linked: 0, unmatched: [] }
  }

  let linked = 0
  const unmatched: string[] = []

  for (const m of maps) {
    const email = normalizeEmail(m.fub_email)
    if (!email) {
      unmatched.push(m.fub_email)
      continue
    }
    // Match contra profiles.email (case-insensitive)
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    const cbiUserId = profile?.id ?? null
    if (!cbiUserId) {
      unmatched.push(email)
      continue
    }
    const { error } = await admin
      .from('fub_user_map')
      .update({ cbi_user_id: cbiUserId, updated_at: new Date().toISOString() })
      .eq('fub_user_id', m.fub_user_id)
    if (!error) linked += 1
  }

  await audit({
    actor_id: auth.user!.id,
    actor_email: auth.user!.email,
    action: 'fub.linkProfiles',
    entity_type: 'fub_user_map',
    metadata: { linked, unmatched },
  })

  revalidatePath('/admin/fub')
  return { success: true, linked, unmatched }
}

export async function updateFubUserMapping(input: {
  fub_user_id: number
  cbi_user_id?: string | null
  is_admin?: boolean
  active?: boolean
}) {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.cbi_user_id !== undefined) patch.cbi_user_id = input.cbi_user_id
  if (input.is_admin !== undefined) patch.is_admin = input.is_admin
  if (input.active !== undefined) patch.active = input.active

  const { error } = await admin.from('fub_user_map').update(patch).eq('fub_user_id', input.fub_user_id)
  if (error) return { error: error.message }

  await audit({
    actor_id: auth.user!.id,
    actor_email: auth.user!.email,
    action: 'fub.updateMapping',
    entity_type: 'fub_user_map',
    entity_id: String(input.fub_user_id),
    metadata: patch,
  })
  revalidatePath('/admin/fub')
  return { success: true }
}

// ============================================================
// Health / observabilidad
// ============================================================

export async function getFubHealth() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()

  const [
    { count: peopleCount },
    { count: dealsCount },
    { count: callsCount },
    { count: webhookLogCount },
    { data: lastWebhook },
    { count: pendingWebhooks },
    { count: errorWebhooks },
  ] = await Promise.all([
    admin.from('fub_people').select('id', { count: 'exact', head: true }).eq('deleted', false),
    admin.from('fub_deals').select('id', { count: 'exact', head: true }).eq('deleted', false),
    admin.from('fub_calls').select('id', { count: 'exact', head: true }),
    admin.from('fub_webhook_log').select('id', { count: 'exact', head: true }),
    admin
      .from('fub_webhook_log')
      .select('event_type, received_at, processed_at, status')
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('fub_webhook_log').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('fub_webhook_log').select('id', { count: 'exact', head: true }).eq('status', 'error'),
  ])

  return {
    success: true,
    counts: {
      people: peopleCount ?? 0,
      deals: dealsCount ?? 0,
      calls: callsCount ?? 0,
      webhook_log_total: webhookLogCount ?? 0,
      webhooks_pending: pendingWebhooks ?? 0,
      webhooks_error: errorWebhooks ?? 0,
    },
    last_webhook: lastWebhook ?? null,
  }
}

export async function listWebhookLog(limit = 100) {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('fub_webhook_log')
    .select('id, event_id, event_type, resource_ids, received_at, processed_at, status, error_message')
    .order('received_at', { ascending: false })
    .limit(limit)
  if (error) return { error: error.message }
  return { success: true, log: data ?? [] }
}
