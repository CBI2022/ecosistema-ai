'use server'

// Read-only server actions/helpers para los widgets FUB del dashboard.
// Usan createClient() → respetan RLS (agente solo ve sus rows).
// Admin: ve todo porque is_fub_admin() devuelve true en RLS.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STAGE_IDS, PIPELINE_IDS } from '@/lib/fub/constants'

// ============================================================
// Helpers compartidos
// ============================================================

function rangeForScope(scope: 'today' | 'week' | 'month' | 'year'): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)
  switch (scope) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week': {
      // Lunes 00:00 Madrid (aproximación UTC simple; suficiente para agregados)
      const day = start.getDay() || 7
      start.setDate(start.getDate() - (day - 1))
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

async function getCallerFubUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, fubUserId: null }
  const admin = createAdminClient()
  const { data: map } = await admin
    .from('fub_user_map')
    .select('fub_user_id, is_admin')
    .eq('cbi_user_id', user.id)
    .maybeSingle()
  return { user, fubUserId: map?.fub_user_id ?? null, isAdmin: map?.is_admin ?? false }
}

// ============================================================
// Agente: stats de actividad
// ============================================================

export interface AgentActivityStats {
  scope: 'today' | 'week' | 'month'
  calls: number
  conversations: number
  texts: number
  emails: number
  appointmentsScheduled: number
  appointmentsHeld: number
  tasksCompleted: number
  newLeads: number
}

export async function getAgentActivityStats(
  scope: 'today' | 'week' | 'month' = 'today',
  targetUserId?: number
): Promise<AgentActivityStats | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { start, end } = rangeForScope(scope)

  // Si admin pasa targetUserId, filtra por ese; si no, RLS filtra automáticamente
  const callsQ = supabase.from('fub_calls').select('id, duration_seconds', { count: 'exact' })
    .gte('occurred_at', start).lte('occurred_at', end)
  const textsQ = supabase.from('fub_text_messages').select('id', { count: 'exact', head: true })
    .gte('occurred_at', start).lte('occurred_at', end).eq('direction', 'out')
  const emailsQ = supabase.from('fub_emails').select('id', { count: 'exact', head: true })
    .gte('occurred_at', start).lte('occurred_at', end).eq('direction', 'out')
  const apptsQ = supabase.from('fub_appointments').select('id, status', { count: 'exact' })
    .gte('starts_at', start).lte('starts_at', end)
  const tasksQ = supabase.from('fub_tasks').select('id', { count: 'exact', head: true })
    .gte('completed_at', start).lte('completed_at', end).eq('status', 'done')
  const leadsQ = supabase.from('fub_people').select('id', { count: 'exact', head: true })
    .gte('created_at_fub', start).lte('created_at_fub', end)
    .eq('deleted', false)

  if (targetUserId) {
    callsQ.eq('user_id', targetUserId)
    textsQ.eq('user_id', targetUserId)
    emailsQ.eq('user_id', targetUserId)
    apptsQ.eq('user_id', targetUserId)
    tasksQ.eq('user_id', targetUserId)
    leadsQ.eq('assigned_user_id', targetUserId)
  }

  const [calls, texts, emails, appts, tasks, newLeads] = await Promise.all([
    callsQ, textsQ, emailsQ, apptsQ, tasksQ, leadsQ,
  ])

  const callRows = (calls.data || []) as Array<{ duration_seconds: number | null }>
  const conversations = callRows.filter((c) => (c.duration_seconds ?? 0) >= 60).length

  const apptRows = (appts.data || []) as Array<{ status: string | null }>
  const apptHeld = apptRows.filter((a) => a.status === 'held').length

  return {
    scope,
    calls: calls.count ?? 0,
    conversations,
    texts: texts.count ?? 0,
    emails: emails.count ?? 0,
    appointmentsScheduled: appts.count ?? 0,
    appointmentsHeld: apptHeld,
    tasksCompleted: tasks.count ?? 0,
    newLeads: newLeads.count ?? 0,
  }
}

// ============================================================
// Agente: goals (lee user_goals de la tabla existente del onboarding)
// ============================================================

export async function getAgentGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return { error: error.message }
  return { goals: data }
}

// ============================================================
// Agente: pipeline (people agrupados por stage)
// ============================================================

export interface PipelineColumn {
  stage_id: number
  stage_name: string
  is_branch: boolean
  position: number | null
  count: number
  people: Array<{
    id: number
    name: string
    email: string | null
    phone: string | null
    source_canonical: string | null
    last_activity_at: string | null
    tags: string[]
  }>
}

export async function getAgentPipeline(opts?: { includeBranches?: boolean; limitPerStage?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: stages } = await supabase
    .from('fub_stages')
    .select('id, name, position, is_branch')
    .order('position', { ascending: true })

  const limit = opts?.limitPerStage ?? 50

  const { data: people } = await supabase
    .from('fub_people')
    .select('id, first_name, last_name, email, phone, stage_id, source_canonical, last_activity_at, tags')
    .eq('deleted', false)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(2000)

  const byStage = new Map<number, PipelineColumn['people']>()
  for (const p of people || []) {
    if (!p.stage_id) continue
    const row = {
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || `Lead #${p.id}`,
      email: p.email,
      phone: p.phone,
      source_canonical: p.source_canonical,
      last_activity_at: p.last_activity_at,
      tags: p.tags || [],
    }
    const arr = byStage.get(p.stage_id) || []
    if (arr.length < limit) arr.push(row)
    byStage.set(p.stage_id, arr)
  }

  const columns: PipelineColumn[] = (stages || [])
    .filter((s) => opts?.includeBranches !== false || !s.is_branch)
    .map((s) => ({
      stage_id: s.id,
      stage_name: s.name,
      position: s.position,
      is_branch: s.is_branch,
      count: (byStage.get(s.id) || []).length,
      people: byStage.get(s.id) || [],
    }))

  return { columns }
}

// ============================================================
// Agente: hot list (stage A-Hot O última actividad reciente sin appointment)
// ============================================================

export async function getAgentHotList(limit = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

  const { data: people } = await supabase
    .from('fub_people')
    .select('id, first_name, last_name, email, phone, source_canonical, last_activity_at, stage_id')
    .eq('deleted', false)
    .or(`stage_id.eq.${STAGE_IDS.HOT},last_activity_at.gte.${cutoff}`)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  return {
    people: (people || []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || `Lead #${p.id}`,
      email: p.email,
      phone: p.phone,
      source_canonical: p.source_canonical,
      last_activity_at: p.last_activity_at,
      stage_id: p.stage_id,
    })),
  }
}

// ============================================================
// Agente: stalled leads (sin contacto en N días)
// ============================================================

export async function getAgentStalledLeads(days = 14, limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  // Excluir branches (trash, sphere) y closed
  const excludedStages = [STAGE_IDS.CLOSED, STAGE_IDS.SPHERE, STAGE_IDS.UNRESPONSIVE, STAGE_IDS.TRASH]

  const { data: people } = await supabase
    .from('fub_people')
    .select('id, first_name, last_name, email, phone, source_canonical, last_activity_at, stage_id')
    .eq('deleted', false)
    .not('stage_id', 'in', `(${excludedStages.join(',')})`)
    .or(`last_activity_at.lt.${cutoff},last_activity_at.is.null`)
    .order('last_activity_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  return {
    threshold_days: days,
    people: (people || []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || `Lead #${p.id}`,
      email: p.email,
      phone: p.phone,
      source_canonical: p.source_canonical,
      last_activity_at: p.last_activity_at,
      stage_id: p.stage_id,
    })),
  }
}

// ============================================================
// Agente: today's tasks (dueDate hoy/vencidas)
// ============================================================

export async function getAgentTodayTasks(limit = 50) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const { data: tasks } = await supabase
    .from('fub_tasks')
    .select('id, type, description, due_at, status, person_id')
    .neq('status', 'done')
    .lte('due_at', endOfDay.toISOString())
    .order('due_at', { ascending: true })
    .limit(limit)

  if (!tasks || tasks.length === 0) return { tasks: [] }

  // Trae nombres de personas asociadas
  const personIds = Array.from(new Set(tasks.map((t) => t.person_id).filter(Boolean) as number[]))
  const { data: people } = personIds.length
    ? await supabase
        .from('fub_people')
        .select('id, first_name, last_name, email')
        .in('id', personIds)
    : { data: [] as Array<{ id: number; first_name: string | null; last_name: string | null; email: string | null }> }

  const personMap = new Map<number, string>()
  for (const p of people || []) {
    personMap.set(
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || `Lead #${p.id}`
    )
  }

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      due_at: t.due_at,
      status: t.status,
      is_overdue: t.due_at ? new Date(t.due_at).getTime() < Date.now() : false,
      person_id: t.person_id,
      person_name: t.person_id ? personMap.get(t.person_id) : null,
    })),
  }
}

// ============================================================
// Admin: activity leaderboard (por agente, semana)
// ============================================================

export interface LeaderboardRow {
  fub_user_id: number
  name: string
  email: string
  is_admin: boolean
  calls: number
  conversations: number
  texts: number
  emails: number
  appointments_held: number
  new_leads: number
  score: number  // weighted activity score
}

export async function getActivityLeaderboard(
  scope: 'week' | 'month' = 'week'
): Promise<{ rows: LeaderboardRow[] } | { error: string }> {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' }
  if (!isAdmin) return { error: 'forbidden' }

  const admin = createAdminClient()
  const { start, end } = rangeForScope(scope)

  const { data: maps } = await admin
    .from('fub_user_map')
    .select('fub_user_id, fub_email, is_admin')
    .eq('active', true)

  const { data: profiles } = await admin
    .from('profiles')
    .select('email, full_name')

  const nameByEmail = new Map<string, string>()
  for (const p of profiles || []) {
    if (p.email) nameByEmail.set(p.email.toLowerCase(), p.full_name || p.email)
  }

  // Counts en paralelo
  const userIds = (maps || []).map((m) => m.fub_user_id)
  if (!userIds.length) return { rows: [] }

  const [callsRes, textsRes, emailsRes, apptsRes, leadsRes] = await Promise.all([
    admin.from('fub_calls').select('user_id, duration_seconds')
      .gte('occurred_at', start).lte('occurred_at', end)
      .in('user_id', userIds),
    admin.from('fub_text_messages').select('user_id')
      .gte('occurred_at', start).lte('occurred_at', end)
      .eq('direction', 'out')
      .in('user_id', userIds),
    admin.from('fub_emails').select('user_id')
      .gte('occurred_at', start).lte('occurred_at', end)
      .eq('direction', 'out')
      .in('user_id', userIds),
    admin.from('fub_appointments').select('user_id, status')
      .gte('starts_at', start).lte('starts_at', end)
      .eq('status', 'held')
      .in('user_id', userIds),
    admin.from('fub_people').select('assigned_user_id')
      .gte('created_at_fub', start).lte('created_at_fub', end)
      .eq('deleted', false)
      .in('assigned_user_id', userIds),
  ])

  const tally = new Map<
    number,
    { calls: number; conversations: number; texts: number; emails: number; appts: number; leads: number }
  >()
  const inc = (uid: number, field: keyof Omit<NonNullable<ReturnType<typeof tally.get>>, never>, n = 1) => {
    const row = tally.get(uid) || { calls: 0, conversations: 0, texts: 0, emails: 0, appts: 0, leads: 0 }
    row[field] += n
    tally.set(uid, row)
  }

  for (const c of (callsRes.data || []) as Array<{ user_id: number; duration_seconds: number | null }>) {
    if (!c.user_id) continue
    inc(c.user_id, 'calls')
    if ((c.duration_seconds ?? 0) >= 60) inc(c.user_id, 'conversations')
  }
  for (const t of (textsRes.data || []) as Array<{ user_id: number }>) if (t.user_id) inc(t.user_id, 'texts')
  for (const e of (emailsRes.data || []) as Array<{ user_id: number }>) if (e.user_id) inc(e.user_id, 'emails')
  for (const a of (apptsRes.data || []) as Array<{ user_id: number }>) if (a.user_id) inc(a.user_id, 'appts')
  for (const l of (leadsRes.data || []) as Array<{ assigned_user_id: number }>) if (l.assigned_user_id) inc(l.assigned_user_id, 'leads')

  const rows: LeaderboardRow[] = (maps || []).map((m) => {
    const t = tally.get(m.fub_user_id) || { calls: 0, conversations: 0, texts: 0, emails: 0, appts: 0, leads: 0 }
    const score = t.conversations * 3 + t.appts * 5 + t.calls * 1 + t.texts * 0.5 + t.emails * 0.5
    return {
      fub_user_id: m.fub_user_id,
      name: nameByEmail.get(m.fub_email.toLowerCase()) || m.fub_email,
      email: m.fub_email,
      is_admin: m.is_admin,
      calls: t.calls,
      conversations: t.conversations,
      texts: t.texts,
      emails: t.emails,
      appointments_held: t.appts,
      new_leads: t.leads,
      score: Math.round(score * 10) / 10,
    }
  }).sort((a, b) => b.score - a.score)

  return { rows }
}

// ============================================================
// Admin: conversion funnel
// ============================================================

export async function getConversionFunnel(
  scope: 'month' | 'year' = 'month',
  targetUserId?: number
) {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' as const }
  if (!isAdmin) return { error: 'forbidden' as const }

  const admin = createAdminClient()
  const { start, end } = rangeForScope(scope)

  const peopleQuery = admin.from('fub_people').select('id', { count: 'exact', head: true })
    .gte('created_at_fub', start).lte('created_at_fub', end)
    .eq('deleted', false)
  const apptsQuery = admin.from('fub_appointments').select('id', { count: 'exact', head: true })
    .gte('starts_at', start).lte('starts_at', end)
    .eq('status', 'held')
  const dealsActiveQuery = admin.from('fub_deals').select('id', { count: 'exact', head: true })
    .eq('pipeline_id', PIPELINE_IDS.BUYERS)
    .gte('created_at_fub', start).lte('created_at_fub', end)
  const dealsClosedQuery = admin.from('fub_deals').select('id', { count: 'exact', head: true })
    .gte('closed_at_fub', start).lte('closed_at_fub', end)
    .eq('pipeline_id', PIPELINE_IDS.BUYERS)

  if (targetUserId) {
    peopleQuery.eq('assigned_user_id', targetUserId)
    apptsQuery.eq('user_id', targetUserId)
    dealsActiveQuery.eq('assigned_user_id', targetUserId)
    dealsClosedQuery.eq('assigned_user_id', targetUserId)
  }

  const [leadsRes, apptsRes, dealsActive, dealsClosed] = await Promise.all([
    peopleQuery,
    apptsQuery,
    dealsActiveQuery,
    dealsClosedQuery,
  ])

  const leads = leadsRes.count ?? 0
  const appointments = apptsRes.count ?? 0
  const offers = dealsActive.count ?? 0
  const closings = dealsClosed.count ?? 0

  return {
    scope,
    leads,
    appointments,
    offers,
    closings,
    leadToAppt: leads ? Math.round((appointments / leads) * 100) : 0,
    apptToOffer: appointments ? Math.round((offers / appointments) * 100) : 0,
    offerToClosing: offers ? Math.round((closings / offers) * 100) : 0,
  }
}

// ============================================================
// Admin: speed to lead (mediana minutos lead.created → primer touch)
// ============================================================

export async function getSpeedToLead(scope: 'month' | 'year' = 'month') {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' as const }
  if (!isAdmin) return { error: 'forbidden' as const }

  const admin = createAdminClient()
  const { start, end } = rangeForScope(scope)

  // Trae leads creados en el periodo + sus user assigned
  const { data: leads } = await admin
    .from('fub_people')
    .select('id, assigned_user_id, created_at_fub')
    .gte('created_at_fub', start).lte('created_at_fub', end)
    .eq('deleted', false)
    .not('created_at_fub', 'is', null)
    .limit(5000)

  if (!leads || leads.length === 0) {
    return { scope, overall_median_min: null, by_user: [], sample_size: 0 }
  }

  const personIds = leads.map((l) => l.id)

  // Primer touch (call / text / email) por persona
  const [calls, texts, emails] = await Promise.all([
    admin.from('fub_calls').select('person_id, occurred_at').in('person_id', personIds).order('occurred_at', { ascending: true }),
    admin.from('fub_text_messages').select('person_id, occurred_at').in('person_id', personIds).eq('direction', 'out').order('occurred_at', { ascending: true }),
    admin.from('fub_emails').select('person_id, occurred_at').in('person_id', personIds).eq('direction', 'out').order('occurred_at', { ascending: true }),
  ])

  const firstTouchByPerson = new Map<number, string>()
  const consider = (rows: Array<{ person_id: number | null; occurred_at: string | null }> | null) => {
    for (const r of rows || []) {
      if (!r.person_id || !r.occurred_at) continue
      const cur = firstTouchByPerson.get(r.person_id)
      if (!cur || new Date(r.occurred_at).getTime() < new Date(cur).getTime()) {
        firstTouchByPerson.set(r.person_id, r.occurred_at)
      }
    }
  }
  consider(calls.data as never)
  consider(texts.data as never)
  consider(emails.data as never)

  const minsByUser = new Map<number | null, number[]>()
  const allMins: number[] = []
  for (const l of leads) {
    const first = firstTouchByPerson.get(l.id)
    if (!first || !l.created_at_fub) continue
    const mins = (new Date(first).getTime() - new Date(l.created_at_fub).getTime()) / 60_000
    if (mins < 0 || mins > 60 * 24 * 30) continue
    allMins.push(mins)
    const arr = minsByUser.get(l.assigned_user_id) || []
    arr.push(mins)
    minsByUser.set(l.assigned_user_id, arr)
  }

  const median = (arr: number[]) => {
    if (!arr.length) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  // Resolver nombre por fub_user_id
  const ids = Array.from(minsByUser.keys()).filter((id): id is number => id !== null)
  const { data: maps } = ids.length
    ? await admin.from('fub_user_map').select('fub_user_id, fub_email').in('fub_user_id', ids)
    : { data: [] as Array<{ fub_user_id: number; fub_email: string }> }
  const emailById = new Map<number, string>()
  for (const m of maps || []) emailById.set(m.fub_user_id, m.fub_email)

  const by_user = Array.from(minsByUser.entries())
    .filter(([uid]) => uid !== null)
    .map(([uid, mins]) => ({
      fub_user_id: uid as number,
      email: emailById.get(uid as number) || `user#${uid}`,
      median_min: median(mins),
      sample_size: mins.length,
    }))
    .sort((a, b) => (a.median_min ?? Infinity) - (b.median_min ?? Infinity))

  return { scope, overall_median_min: median(allMins), by_user, sample_size: allMins.length }
}

// ============================================================
// Admin: source ROI
// ============================================================

export async function getSourceROI(scope: 'month' | 'year' = 'year') {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' as const }
  if (!isAdmin) return { error: 'forbidden' as const }

  const admin = createAdminClient()
  const { start, end } = rangeForScope(scope)

  // Leads por source canonical
  const { data: leads } = await admin
    .from('fub_people')
    .select('id, source_canonical, source')
    .gte('created_at_fub', start).lte('created_at_fub', end)
    .eq('deleted', false)

  // Closings: deals con closed_at_fub en el período, pipeline Buyers stage Closed
  const { data: dealsClosed } = await admin
    .from('fub_deals')
    .select('person_id, value_cents')
    .gte('closed_at_fub', start).lte('closed_at_fub', end)

  const leadsBySource = new Map<string, number>()
  const personToSource = new Map<number, string>()
  for (const l of leads || []) {
    const key = l.source_canonical || l.source || 'unknown'
    leadsBySource.set(key, (leadsBySource.get(key) ?? 0) + 1)
    personToSource.set(l.id, key)
  }

  const closingsBySource = new Map<string, { count: number; revenue_cents: number }>()
  for (const d of dealsClosed || []) {
    if (!d.person_id) continue
    const source = personToSource.get(d.person_id) || 'unknown'
    const cur = closingsBySource.get(source) || { count: 0, revenue_cents: 0 }
    cur.count += 1
    cur.revenue_cents += d.value_cents ?? 0
    closingsBySource.set(source, cur)
  }

  const rows = Array.from(leadsBySource.entries()).map(([source, count]) => {
    const close = closingsBySource.get(source) || { count: 0, revenue_cents: 0 }
    return {
      source,
      leads: count,
      closings: close.count,
      revenue_eur: Math.round(close.revenue_cents / 100),
      conversion_pct: count ? Math.round((close.count / count) * 100) : 0,
    }
  }).sort((a, b) => b.leads - a.leads)

  return { scope, rows }
}

// ============================================================
// Admin: captaciones pipeline (Sellers)
// ============================================================

export async function getCaptacionesPipeline() {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' as const }
  if (!isAdmin) return { error: 'forbidden' as const }

  const admin = createAdminClient()

  const { data: deals } = await admin
    .from('fub_deals')
    .select('id, stage_id, name, value_cents, created_at_fub, assigned_user_id')
    .eq('pipeline_id', PIPELINE_IDS.SELLERS)
    .eq('deleted', false)

  const { data: stages } = await admin
    .from('fub_stages')
    .select('id, name, position')
    .order('position', { ascending: true })

  // FUB: stages de deals tienen sus propios stage_ids dentro del pipeline.
  // Si no encontramos stage por id en fub_stages, fallback a "Sin stage".
  const stageMap = new Map<number, { name: string; position: number | null }>()
  for (const s of stages || []) stageMap.set(s.id, { name: s.name, position: s.position })

  const byStage = new Map<number | null, { name: string; count: number; value_cents: number }>()
  for (const d of deals || []) {
    const key = d.stage_id ?? null
    const stage = key ? stageMap.get(key) : null
    const cur = byStage.get(key) || { name: stage?.name || 'Sin stage', count: 0, value_cents: 0 }
    cur.count += 1
    cur.value_cents += d.value_cents ?? 0
    byStage.set(key, cur)
  }

  const columns = Array.from(byStage.entries()).map(([stage_id, info]) => ({
    stage_id,
    stage_name: info.name,
    count: info.count,
    total_value_eur: Math.round(info.value_cents / 100),
  }))

  return { columns }
}

// ============================================================
// Admin: stage transitions stats (tiempo medio en cada stage)
// ============================================================

export async function getStageTransitionStats(scope: 'month' | 'year' = 'year') {
  const { user, isAdmin } = await getCallerFubUserId()
  if (!user) return { error: 'Not authenticated' as const }
  if (!isAdmin) return { error: 'forbidden' as const }

  const admin = createAdminClient()
  const { start } = rangeForScope(scope)

  const { data: trans } = await admin
    .from('fub_stage_transitions')
    .select('person_id, from_stage_id, to_stage_id, changed_at')
    .gte('changed_at', start)
    .order('person_id, changed_at', { ascending: true })

  // Calcular tiempo medio que un lead pasa en cada stage
  const durationsByStage = new Map<number, number[]>()
  let prevStage: number | null = null
  let prevTime: number | null = null
  let prevPerson: number | null = null

  for (const t of trans || []) {
    if (prevPerson !== t.person_id) {
      prevStage = t.to_stage_id ?? null
      prevTime = new Date(t.changed_at).getTime()
      prevPerson = t.person_id
      continue
    }
    if (prevStage != null && prevTime != null) {
      const days = (new Date(t.changed_at).getTime() - prevTime) / (1000 * 3600 * 24)
      const arr = durationsByStage.get(prevStage) || []
      arr.push(days)
      durationsByStage.set(prevStage, arr)
    }
    prevStage = t.to_stage_id ?? null
    prevTime = new Date(t.changed_at).getTime()
  }

  const { data: stages } = await admin.from('fub_stages').select('id, name, position').order('position')
  const rows = (stages || []).map((s) => {
    const days = durationsByStage.get(s.id) || []
    const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : null
    return {
      stage_id: s.id,
      stage_name: s.name,
      sample_size: days.length,
      avg_days: avg !== null ? Math.round(avg * 10) / 10 : null,
    }
  })

  return { scope, rows }
}
