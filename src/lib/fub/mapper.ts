// Mappers FUB → filas Supabase. Toda escritura a tablas fub_* debe pasar
// por aquí — garantiza normalización de email, source canonical, timestamps UTC.

import type {
  FubPerson,
  FubDeal,
  FubCall,
  FubTextMessage,
  FubEmail,
  FubAppointment,
  FubTask,
  FubNote,
  FubEvent,
  FubStage,
  FubPipeline,
  FubUser,
} from './types'
import {
  normalizeEmail,
  canonicalSource,
  pickPrimaryEmail,
  pickPrimaryPhone,
  toTimestamptz,
  toCents,
} from './normalize'

const nowIso = () => new Date().toISOString()

export function personToRow(p: FubPerson) {
  return {
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
    custom_fields: (p.customFields as Record<string, unknown>) || {},
    last_activity_at: toTimestamptz(p.lastActivity || p.lastCommunication),
    created_at_fub: toTimestamptz(p.created),
    updated_at_fub: toTimestamptz(p.updated),
    deleted: p.deleted === true,
    synced_at: nowIso(),
  }
}

export function dealToRow(d: FubDeal) {
  return {
    id: d.id,
    pipeline_id: d.pipelineId ?? null,
    stage_id: d.stageId ?? null,
    person_id: d.personId ?? null,
    assigned_user_id: d.assignedUserId ?? null,
    name: d.name ?? null,
    value_cents: toCents(d.price),
    currency: 'EUR',
    created_at_fub: toTimestamptz(d.created),
    updated_at_fub: toTimestamptz(d.updated),
    closed_at_fub: toTimestamptz(d.closedAt),
    deleted: false,
    synced_at: nowIso(),
  }
}

export function callToRow(c: FubCall) {
  return {
    id: c.id,
    person_id: c.personId ?? null,
    user_id: c.userId ?? null,
    duration_seconds: c.duration ?? 0,
    outcome: c.outcome ?? null,
    occurred_at: toTimestamptz(c.created),
    synced_at: nowIso(),
  }
}

export function textMessageToRow(t: FubTextMessage) {
  return {
    id: t.id,
    person_id: t.personId ?? null,
    user_id: t.userId ?? null,
    direction: t.direction === 'outbound' ? 'out' : t.direction === 'inbound' ? 'in' : null,
    occurred_at: toTimestamptz(t.created),
    synced_at: nowIso(),
  }
}

export function emailToRow(e: FubEmail) {
  return {
    id: e.id,
    person_id: e.personId ?? null,
    user_id: e.userId ?? null,
    direction: e.direction === 'outbound' ? 'out' : e.direction === 'inbound' ? 'in' : null,
    occurred_at: toTimestamptz(e.created),
    synced_at: nowIso(),
  }
}

export function appointmentToRow(a: FubAppointment) {
  // FUB usa 'outcome' (held/canceled/no_show) o 'status' (scheduled). Normalizamos.
  const raw = (a.outcome || a.status || '').toLowerCase()
  let status: string
  if (raw.includes('held') || raw.includes('completed')) status = 'held'
  else if (raw.includes('cancel')) status = 'canceled'
  else if (raw.includes('no_show') || raw.includes('no-show') || raw.includes('noshow')) status = 'no_show'
  else status = 'scheduled'

  return {
    id: a.id,
    person_id: a.personId ?? null,
    user_id: a.userId ?? null,
    title: a.title ?? null,
    status,
    starts_at: toTimestamptz(a.start),
    ends_at: toTimestamptz(a.end),
    synced_at: nowIso(),
  }
}

export function taskToRow(t: FubTask) {
  const dueAt = toTimestamptz(t.dueDate)
  const completedAt = toTimestamptz(t.completedAt)
  let status: string
  if (completedAt || t.isCompleted) status = 'done'
  else if (dueAt && new Date(dueAt).getTime() < Date.now()) status = 'overdue'
  else status = 'pending'

  return {
    id: t.id,
    person_id: t.personId ?? null,
    user_id: t.userId ?? null,
    type: t.type ?? null,
    description: t.description ?? null,
    due_at: dueAt,
    completed_at: completedAt,
    status,
    synced_at: nowIso(),
  }
}

export function noteToRow(n: FubNote) {
  return {
    id: n.id,
    person_id: n.personId ?? null,
    user_id: n.userId ?? null,
    body: n.body ?? null,
    occurred_at: toTimestamptz(n.created),
    synced_at: nowIso(),
  }
}

export function eventToRow(e: FubEvent) {
  return {
    id: e.id,
    person_id: e.personId ?? null,
    type: e.type ?? null,
    source: e.source ?? null,
    occurred_at: toTimestamptz(e.created),
    payload: (e.property as Record<string, unknown>) || {},
    synced_at: nowIso(),
  }
}

export function stageToRow(s: FubStage, pipelineId?: number) {
  const branches = ['sphere', 'unresponsive', 'trash']
  const isBranch = branches.some((b) => s.name?.toLowerCase().includes(b))
  return {
    id: s.id,
    name: s.name,
    pipeline_id: pipelineId ?? s.pipelineId ?? null,
    position: s.order ?? null,
    is_branch: isBranch,
  }
}

export function pipelineToRow(p: FubPipeline) {
  return { id: p.id, name: p.name }
}

export function userToMapRow(u: FubUser, opts?: { isAdminOverride?: boolean }) {
  const email = normalizeEmail(u.email) || ''
  return {
    cbi_user_id: null as string | null, // se rellena cuando se hace match por email vs profiles
    fub_user_id: u.id,
    fub_email: email,
    fub_role: u.role || 'Agent',
    is_admin:
      opts?.isAdminOverride ??
      (u.role === 'Broker' || u.isAdmin === true || u.isOwner === true),
    active: true,
  }
}
