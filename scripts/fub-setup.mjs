#!/usr/bin/env node
// FUB Integration — Setup automatizado.
//
// Uso:
//   node scripts/fub-setup.mjs <comando>
//
// Comandos:
//   migrate       Aplica fub_integration.sql + fub_seed.sql a Supabase
//   verify        Verifica que tablas + seed están bien
//   link          Linka profiles ↔ fub_user_map por email
//   sync          Backfill inicial (90 días)
//   subscribe     Subscribe los 15 webhooks a la URL de producción
//   all           Ejecuta migrate → verify → link → sync → subscribe en orden
//
// Pre-requisitos en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   FUB_API_KEY
//   NEXT_PUBLIC_SITE_URL (para subscribe — debe ser HTTPS público accesible)

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Cargar .env.local (no auto-cargado por dotenv/config)
dotenv.config({ path: resolve(ROOT, '.env.local') })
dotenv.config({ path: resolve(ROOT, '.env') })

// ---------- Config ----------
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUB_KEY = process.env.FUB_API_KEY
const FUB_BASE = process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1'
const FUB_SYSTEM = process.env.FUB_X_SYSTEM || 'CBI-ECO-AI'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.costablancainvestments.com'

function need(name, value) {
  if (!value) {
    console.error(`❌ Falta variable de entorno: ${name}`)
    process.exit(1)
  }
}

function fubAuth() {
  need('FUB_API_KEY', FUB_KEY)
  return {
    Authorization: `Basic ${Buffer.from(`${FUB_KEY}:`).toString('base64')}`,
    'X-System': FUB_SYSTEM,
    Accept: 'application/json',
  }
}

async function fub(path, init = {}) {
  const url = path.startsWith('http') ? path : `${FUB_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: { ...fubAuth(), ...(init.headers || {}) },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`FUB ${path} → ${res.status}: ${text.slice(0, 300)}`)
  return json
}

function getSupabase() {
  need('NEXT_PUBLIC_SUPABASE_URL', SUPA_URL)
  need('SUPABASE_SERVICE_ROLE_KEY', SUPA_KEY)
  return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })
}

// ---------- Commands ----------

async function cmdSeed() {
  console.log('🌱 Aplicando seed (pipelines, stages, users, sources)…')
  const supabase = getSupabase()

  // Pipelines
  const { error: pErr } = await supabase.from('fub_pipelines').upsert([
    { id: 1, name: 'Buyers' },
    { id: 2, name: 'Sellers' },
  ], { onConflict: 'id' })
  if (pErr) { console.error('   ❌ pipelines:', pErr); process.exit(1) }
  console.log('   ✅ pipelines (2)')

  // Stages reales descubiertos en la API
  const stages = [
    { id: 2,  name: 'Lead',                position: 1,  is_branch: false },
    { id: 48, name: 'A - Hot 1-3 Months',  position: 2,  is_branch: false },
    { id: 49, name: 'B - Warm 3-6 Months', position: 3,  is_branch: false },
    { id: 50, name: 'C - Cold 6+ Months',  position: 4,  is_branch: false },
    { id: 17, name: 'Viewings',            position: 5,  is_branch: false },
    { id: 56, name: 'Pending',             position: 6,  is_branch: false },
    { id: 8,  name: 'Closed',              position: 7,  is_branch: false },
    { id: 51, name: 'Sphere',              position: 8,  is_branch: true  },
    { id: 52, name: 'Unresponsive',        position: 9,  is_branch: true  },
    { id: 11, name: 'Trash',               position: 10, is_branch: true  },
  ]
  const { error: sErr } = await supabase.from('fub_stages').upsert(stages, { onConflict: 'id' })
  if (sErr) { console.error('   ❌ stages:', sErr); process.exit(1) }
  console.log(`   ✅ stages (${stages.length})`)

  // Users — los 17 reales (admin override: Bruno, Darcy, Sofia)
  const users = [
    { fub_user_id: 1,  fub_email: 'darcy@costablancainvestments.com',       fub_role: 'Broker', is_admin: true  },
    { fub_user_id: 2,  fub_email: 'info@costablancainvestments.com',        fub_role: 'Broker', is_admin: true  },
    { fub_user_id: 3,  fub_email: 'bruno@costablancainvestments.com',       fub_role: 'Broker', is_admin: true  },
    { fub_user_id: 4,  fub_email: 'dajana@costablancainvestments.com',      fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 5,  fub_email: 'alejandro@costablancainvestments.com',   fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 6,  fub_email: 'karina@costablancainvestments.com',      fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 9,  fub_email: 'timmy@costablancainvestments.com',       fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 11, fub_email: 'sofia@costablancainvestments.com',       fub_role: 'Broker', is_admin: true  },
    { fub_user_id: 12, fub_email: 'ivana@costablancainvestments.com',       fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 15, fub_email: 'joanna@costablancainvestments.com',      fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 16, fub_email: 'leticia@costablancainvestments.com',     fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 17, fub_email: 'marek@costablancainvestments.com',       fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 18, fub_email: 'suzanne@costablancainvestments.com',     fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 19, fub_email: 'steven@costablancainvestments.com',      fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 20, fub_email: 'doris@costablancainvestments.com',       fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 21, fub_email: 'clementine@costablancainvestments.com',  fub_role: 'Agent',  is_admin: false },
    { fub_user_id: 22, fub_email: 'ines@costablancainvestments.com',        fub_role: 'Agent',  is_admin: false },
  ].map((u) => ({ ...u, active: true }))
  // No tocar is_admin si ya existe (preserva overrides manuales)
  const { data: existing } = await supabase.from('fub_user_map').select('fub_user_id, is_admin')
  const existingMap = new Map((existing || []).map((e) => [e.fub_user_id, e.is_admin]))
  const usersToUpsert = users.map((u) =>
    existingMap.has(u.fub_user_id) ? { ...u, is_admin: existingMap.get(u.fub_user_id) } : u
  )
  const { error: uErr } = await supabase.from('fub_user_map').upsert(usersToUpsert, { onConflict: 'fub_user_id' })
  if (uErr) { console.error('   ❌ users:', uErr); process.exit(1) }
  console.log(`   ✅ users (${users.length})`)

  // Source canonical aliases
  const sources = [
    ['Idealista', 'idealista'], ['idealista', 'idealista'], ['idealista.com', 'idealista'],
    ['IDEALISTA', 'idealista'], ['Idealista BE', 'idealista'],
    ['Imoluc', 'imoluc'], ['imoluc', 'imoluc'], ['Imoluc.com', 'imoluc'],
    ['Rightmove', 'rightmove'], ['Zoopla', 'zoopla'],
    ['Facebook', 'facebook'], ['Facebook Ads', 'facebook'],
    ['Instagram', 'instagram'], ['TikTok', 'tiktok'], ['YouTube', 'youtube'],
    ['Google', 'google'], ['Google Ads', 'google'],
    ['Referral', 'referral'], ['Referido', 'referral'],
    ['Sphere', 'sphere'], ['Repeat Client', 'sphere'],
    ['Walk-in', 'walk-in'],
    ['CBI Website', 'cbi-web'], ['costablancainvestments.com', 'cbi-web'],
  ].map(([raw, canonical]) => ({ raw, canonical }))
  const { error: srcErr } = await supabase.from('fub_source_canonical').upsert(sources, { onConflict: 'raw' })
  if (srcErr) { console.error('   ❌ sources:', srcErr); process.exit(1) }
  console.log(`   ✅ source aliases (${sources.length})`)
}

async function cmdMigrate() {
  console.log('📜 Aplicando migraciones SQL…')
  const supabase = getSupabase()
  const sqlFiles = ['docs/sql/fub_integration.sql', 'docs/sql/fub_seed.sql']
  for (const f of sqlFiles) {
    const sql = readFileSync(resolve(ROOT, f), 'utf8')
    console.log(`   → ${f} (${sql.length} bytes)`)
    // Supabase JS no permite ejecutar SQL multi-statement directamente.
    // Usamos el endpoint REST de PostgREST sólo si existe RPC `exec_sql`.
    // Como fallback: imprimir instrucciones manuales.
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: 'NO_RPC' }))
    if (error === 'NO_RPC' || (error && typeof error === 'object' && error.message?.includes('does not exist'))) {
      console.error(`
   ⚠️  Tu Supabase no tiene la función RPC \`exec_sql\` instalada.
   Aplica manualmente desde el SQL Editor del Dashboard Supabase:
      ${f}
   O instala temporalmente esta RPC:
      create or replace function public.exec_sql(sql text) returns void
      language plpgsql security definer as $$ begin execute sql; end; $$;
      `)
      process.exit(1)
    }
    if (error) {
      console.error(`   ❌ Error en ${f}:`, error)
      process.exit(1)
    }
    console.log(`   ✅ ${f} aplicado`)
  }
}

async function cmdVerify() {
  console.log('🔎 Verificando estado…')
  const supabase = getSupabase()
  const tables = [
    'fub_user_map', 'fub_pipelines', 'fub_stages', 'fub_source_canonical',
    'fub_people', 'fub_deals', 'fub_calls', 'fub_text_messages', 'fub_emails',
    'fub_appointments', 'fub_tasks', 'fub_notes', 'fub_events',
    'fub_stage_transitions', 'fub_webhook_log',
  ]
  let ok = true
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`   ❌ ${t.padEnd(25)} → ${error.message}`)
      ok = false
    } else {
      console.log(`   ✅ ${t.padEnd(25)} → ${count ?? 0} filas`)
    }
  }
  if (!ok) {
    console.error('\nAlguna tabla falta. Aplica primero `node scripts/fub-setup.mjs migrate`.')
    process.exit(1)
  }
}

async function cmdLink() {
  console.log('🔗 Linkeando profiles ↔ fub_user_map…')
  const supabase = getSupabase()
  const { data: maps } = await supabase
    .from('fub_user_map')
    .select('fub_user_id, fub_email')
    .is('cbi_user_id', null)

  if (!maps?.length) {
    console.log('   Todas las filas ya linkeadas o seed no aplicado.')
    return
  }

  let linked = 0
  const unmatched = []
  for (const m of maps) {
    const email = m.fub_email.toLowerCase().trim()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    if (!profile?.id) {
      unmatched.push(email)
      continue
    }
    const { error } = await supabase
      .from('fub_user_map')
      .update({ cbi_user_id: profile.id, updated_at: new Date().toISOString() })
      .eq('fub_user_id', m.fub_user_id)
    if (!error) linked++
  }
  console.log(`   ✅ Linked: ${linked}`)
  if (unmatched.length) console.log(`   ⚠️  Sin profile: ${unmatched.join(', ')}`)
}

async function cmdSync({ sinceDays = 90 } = {}) {
  console.log(`⚡ Backfill ${sinceDays}d…`)
  const supabase = getSupabase()
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString()
  const counts = {}

  async function paginate(path, key, query = {}) {
    const items = []
    let offset = 0
    while (true) {
      const params = new URLSearchParams({ limit: '100', offset: String(offset), ...query })
      const res = await fub(`${path}?${params}`)
      const page = res[key] || []
      if (!page.length) break
      items.push(...page)
      const next = res._metadata?.next
      if (!next) break
      offset += page.length
    }
    return items
  }

  // Pipelines
  const pipelines = (await fub('/pipelines')).pipelines || []
  if (pipelines.length) {
    await supabase.from('fub_pipelines').upsert(pipelines.map((p) => ({ id: p.id, name: p.name })), { onConflict: 'id' })
  }
  counts.pipelines = pipelines.length

  // Stages
  const stages = (await fub('/stages')).stages || []
  if (stages.length) {
    await supabase.from('fub_stages').upsert(
      stages.map((s) => ({
        id: s.id,
        name: s.name,
        pipeline_id: s.pipelineId ?? null,
        position: s.order ?? null,
        is_branch: ['sphere', 'unresponsive', 'trash'].some((b) => s.name?.toLowerCase().includes(b)),
      })),
      { onConflict: 'id' }
    )
  }
  counts.stages = stages.length

  // People
  const people = await paginate('/people', 'people', { updatedSince: since, sort: 'updated' })
  if (people.length) {
    const rows = people.map((p) => ({
      id: p.id,
      assigned_user_id: p.assignedUserId ?? null,
      stage_id: p.stageId ?? null,
      source: p.source ?? null,
      source_canonical: canonicalSource(p.source),
      first_name: p.firstName ?? null,
      last_name: p.lastName ?? null,
      email: pickPrimaryEmail(p.emails),
      phone: pickPrimaryPhone(p.phones),
      tags: Array.isArray(p.tags) ? p.tags : [],
      custom_fields: p.customFields || {},
      last_activity_at: p.lastActivity || p.lastCommunication || null,
      created_at_fub: p.created || null,
      updated_at_fub: p.updated || null,
      deleted: p.deleted === true,
      synced_at: new Date().toISOString(),
    }))
    // Upsert en batches de 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase.from('fub_people').upsert(batch, { onConflict: 'id' })
      if (error) console.error(`   people batch ${i}: ${error.message}`)
    }
  }
  counts.people = people.length

  // Deals
  const deals = await paginate('/deals', 'deals', { updatedSince: since })
  if (deals.length) {
    const rows = deals.map((d) => ({
      id: d.id,
      pipeline_id: d.pipelineId ?? null,
      stage_id: d.stageId ?? null,
      person_id: d.personId ?? null,
      assigned_user_id: d.assignedUserId ?? null,
      name: d.name ?? null,
      value_cents: d.price ? Math.round(d.price * 100) : null,
      currency: 'EUR',
      created_at_fub: d.created || null,
      updated_at_fub: d.updated || null,
      closed_at_fub: d.closedAt || null,
      deleted: false,
      synced_at: new Date().toISOString(),
    }))
    await supabase.from('fub_deals').upsert(rows, { onConflict: 'id' })
  }
  counts.deals = deals.length

  // Calls, texts, emails, appointments, tasks, notes, events — versión rápida sin tipar
  for (const [endpoint, key, mapper, table] of [
    ['/calls', 'calls', mapCall, 'fub_calls'],
    ['/textMessages', 'textMessages', mapText, 'fub_text_messages'],
    ['/emails', 'emails', mapEmail, 'fub_emails'],
    ['/appointments', 'appointments', mapAppt, 'fub_appointments'],
    ['/tasks', 'tasks', mapTask, 'fub_tasks'],
    ['/notes', 'notes', mapNote, 'fub_notes'],
    ['/events', 'events', mapEvent, 'fub_events'],
  ]) {
    try {
      const items = await paginate(endpoint, key, { [endpoint === '/calls' || endpoint === '/textMessages' || endpoint === '/emails' || endpoint === '/notes' || endpoint === '/events' ? 'createdSince' : 'updatedSince']: since })
      if (items.length) {
        for (let i = 0; i < items.length; i += 500) {
          const batch = items.slice(i, i + 500).map(mapper)
          const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
          if (error) console.error(`   ${table} batch: ${error.message}`)
        }
      }
      counts[table] = items.length
    } catch (err) {
      console.error(`   ⚠️  ${endpoint}: ${err.message}`)
      counts[table] = `ERROR: ${err.message}`
    }
  }

  console.log('   ✅ Backfill completo:', counts)
}

async function cmdSubscribe() {
  console.log('🔔 Suscribiendo webhooks…')
  const callbackUrl = `${SITE_URL}/api/webhooks/fub`
  console.log(`   URL callback: ${callbackUrl}`)

  if (callbackUrl.startsWith('http://localhost')) {
    console.error('   ❌ SITE_URL apunta a localhost. Cambia NEXT_PUBLIC_SITE_URL a la URL pública HTTPS antes de suscribir.')
    process.exit(1)
  }

  const events = [
    'peopleCreated', 'peopleUpdated', 'peopleTagsCreated', 'peopleDeleted',
    'notesCreated', 'callsCreated', 'textMessagesCreated', 'emailsCreated',
    'appointmentsCreated', 'appointmentsUpdated',
    'dealsCreated', 'dealsUpdated', 'tasksCreated', 'tasksUpdated', 'eventsCreated',
  ]

  const existing = await fub('/webhooks')
  const existingByEvent = new Map((existing.webhooks || []).map((w) => [w.event, w.id]))

  let created = 0, skipped = 0, errored = 0
  let secret = null
  for (const ev of events) {
    if (existingByEvent.has(ev)) {
      console.log(`   ⏭  ${ev} (ya existe id=${existingByEvent.get(ev)})`)
      skipped++
      continue
    }
    try {
      const res = await fub('/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: ev, url: callbackUrl }),
      })
      console.log(`   ✅ ${ev} (id=${res.id})`)
      created++
      // FUB devuelve un secret en algunos casos
      if (res.secret && !secret) secret = res.secret
    } catch (err) {
      console.error(`   ❌ ${ev}: ${err.message}`)
      errored++
    }
  }

  console.log(`\n   Resumen: ${created} creados · ${skipped} ya existían · ${errored} fallaron`)
  if (secret) {
    console.log(`\n   🔐 IMPORTANTE — añade a tus env vars (Vercel + .env.local):`)
    console.log(`      FUB_WEBHOOK_SECRET=${secret}\n`)
  } else if (created > 0) {
    console.log(`\n   ⚠️  FUB no devolvió un secret en las respuestas.`)
    console.log(`      Esto es normal en algunas cuentas. Recupera el secret de un webhook con:`)
    console.log(`      curl -u "$FUB_API_KEY:" "${FUB_BASE}/webhooks" | jq`)
  }
}

// ---------- Mappers (espejo de src/lib/fub/mapper.ts) ----------

function canonicalSource(raw) {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (s.includes('idealista')) return 'idealista'
  if (s.includes('immo') || s.includes('imoluc')) return 'imoluc'
  if (s.includes('rightmove')) return 'rightmove'
  if (s.includes('facebook')) return 'facebook'
  if (s.includes('instagram')) return 'instagram'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('youtube')) return 'youtube'
  if (s.includes('google')) return 'google'
  if (s.includes('referral') || s.includes('referido')) return 'referral'
  if (s.includes('sphere') || s.includes('repeat')) return 'sphere'
  return s
}

function pickPrimaryEmail(emails) {
  if (!emails?.length) return null
  const primary = emails.find((e) => e.isPrimary) || emails[0]
  return primary.value?.toLowerCase().trim() || null
}
function pickPrimaryPhone(phones) {
  if (!phones?.length) return null
  return (phones.find((p) => p.isPrimary) || phones[0]).value?.trim() || null
}

const now = () => new Date().toISOString()

function mapCall(c) {
  return { id: c.id, person_id: c.personId ?? null, user_id: c.userId ?? null, duration_seconds: c.duration ?? 0, outcome: c.outcome ?? null, occurred_at: c.created || null, synced_at: now() }
}
function mapText(t) {
  return { id: t.id, person_id: t.personId ?? null, user_id: t.userId ?? null, direction: t.direction === 'outbound' ? 'out' : t.direction === 'inbound' ? 'in' : null, occurred_at: t.created || null, synced_at: now() }
}
function mapEmail(e) {
  return { id: e.id, person_id: e.personId ?? null, user_id: e.userId ?? null, direction: e.direction === 'outbound' ? 'out' : e.direction === 'inbound' ? 'in' : null, occurred_at: e.created || null, synced_at: now() }
}
function mapAppt(a) {
  const raw = (a.outcome || a.status || '').toLowerCase()
  let status = 'scheduled'
  if (raw.includes('held') || raw.includes('completed')) status = 'held'
  else if (raw.includes('cancel')) status = 'canceled'
  else if (raw.includes('no_show') || raw.includes('noshow')) status = 'no_show'
  return { id: a.id, person_id: a.personId ?? null, user_id: a.userId ?? null, title: a.title ?? null, status, starts_at: a.start || null, ends_at: a.end || null, synced_at: now() }
}
function mapTask(t) {
  const due = t.dueDate || null
  const done = t.completedAt || null
  let status = 'pending'
  if (done || t.isCompleted) status = 'done'
  else if (due && new Date(due).getTime() < Date.now()) status = 'overdue'
  return { id: t.id, person_id: t.personId ?? null, user_id: t.userId ?? null, type: t.type ?? null, description: t.description ?? null, due_at: due, completed_at: done, status, synced_at: now() }
}
function mapNote(n) {
  return { id: n.id, person_id: n.personId ?? null, user_id: n.userId ?? null, body: n.body ?? null, occurred_at: n.created || null, synced_at: now() }
}
function mapEvent(e) {
  return { id: e.id, person_id: e.personId ?? null, type: e.type ?? null, source: e.source ?? null, occurred_at: e.created || null, payload: e.property || {}, synced_at: now() }
}

// ---------- Main ----------

const cmd = process.argv[2]
const map = {
  migrate: cmdMigrate,
  seed: cmdSeed,
  verify: cmdVerify,
  link: cmdLink,
  sync: () => cmdSync({ sinceDays: 90 }),
  'sync-year': () => cmdSync({ sinceDays: 365 }),
  subscribe: cmdSubscribe,
  all: async () => {
    await cmdSeed()
    await cmdVerify()
    await cmdLink()
    await cmdSync({ sinceDays: 90 })
    await cmdSubscribe()
  },
}

if (!map[cmd]) {
  console.log(`
FUB Integration — Setup automatizado

Uso: node scripts/fub-setup.mjs <comando>

Comandos:
  migrate       Aplica fub_integration.sql + fub_seed.sql
  verify        Verifica que las 15 tablas existen
  link          Linka profiles ↔ fub_user_map por email
  sync          Backfill 90 días
  sync-year     Backfill 365 días
  subscribe     Subscribe los 15 webhooks (requiere NEXT_PUBLIC_SITE_URL público)
  all           Ejecuta todo en orden

Pre-requisitos en .env.local:
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  FUB_API_KEY
  NEXT_PUBLIC_SITE_URL (https público, NO localhost)
`)
  process.exit(0)
}

map[cmd]().catch((err) => {
  console.error('\n❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})
