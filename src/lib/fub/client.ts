// Cliente tipado para Follow Up Boss API v1.
// - Basic Auth (API key como username, password vacío) — Base64
// - Rate limiter global compartido (FUB permite ~10 req/s sostenido)
// - Retry con backoff exponencial en 429 / 5xx
// - X-System / X-System-Key headers para identificación
//
// IMPORTANTE: este cliente solo se usa en server (server actions, route
// handlers, crons). NUNCA exponerlo al cliente — la API key es admin-level.

import type {
  FubIdentity,
  FubListResponse,
  FubMetadata,
  FubUser,
  FubStage,
  FubPipeline,
  FubPerson,
  FubDeal,
  FubCall,
  FubTextMessage,
  FubEmail,
  FubAppointment,
  FubTask,
  FubNote,
  FubEvent,
  FubWebhookSubscription,
  FubEventName,
} from './types'

const DEFAULT_BASE = 'https://api.followupboss.com/v1'

// ============================================================
// Rate limiter global (singleton de módulo)
// ============================================================
// FUB acepta ~10 req/s. Usamos 8 para tener margen.
// Si la app escala a múltiples instancias, migrar a Upstash Redis.

const RATE_LIMIT_PER_SECOND = 8
const queue: Array<() => void> = []
let inFlight = 0
let windowResetAt = 0
let windowCount = 0

function scheduleRequest(): Promise<void> {
  return new Promise((resolve) => {
    const tryRun = () => {
      const now = Date.now()
      if (now > windowResetAt) {
        windowResetAt = now + 1000
        windowCount = 0
      }
      if (windowCount < RATE_LIMIT_PER_SECOND) {
        windowCount += 1
        inFlight += 1
        resolve()
      } else {
        const wait = Math.max(50, windowResetAt - now)
        setTimeout(tryRun, wait)
      }
    }
    if (queue.length === 0) {
      tryRun()
    } else {
      queue.push(tryRun)
    }
  })
}

function releaseSlot() {
  inFlight = Math.max(0, inFlight - 1)
  const next = queue.shift()
  if (next) next()
}

// ============================================================
// Configuración y headers
// ============================================================

function getConfig() {
  const apiKey = process.env.FUB_API_KEY
  if (!apiKey) {
    throw new Error('FUB_API_KEY no configurada en env')
  }
  return {
    apiKey,
    baseUrl: process.env.FUB_API_BASE_URL || DEFAULT_BASE,
    xSystem: process.env.FUB_X_SYSTEM || 'CBI-ECO-AI',
    xSystemKey: process.env.FUB_X_SYSTEM_KEY || '',
  }
}

function buildHeaders(extra?: Record<string, string>): Headers {
  const { apiKey, xSystem, xSystemKey } = getConfig()
  // Basic Auth: API_KEY:<empty>
  const basic = Buffer.from(`${apiKey}:`).toString('base64')
  const headers = new Headers({
    Authorization: `Basic ${basic}`,
    Accept: 'application/json',
    'X-System': xSystem,
  })
  if (xSystemKey) headers.set('X-System-Key', xSystemKey)
  if (extra) for (const [k, v] of Object.entries(extra)) headers.set(k, v)
  return headers
}

// ============================================================
// Core request con retry + rate limit
// ============================================================

export class FubError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'FubError'
    this.status = status
    this.body = body
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  retries?: number
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { baseUrl } = getConfig()
  const { method = 'GET', query, body, retries = 5 } = opts

  const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }

  let attempt = 0
  let lastError: Error | null = null

  while (attempt <= retries) {
    await scheduleRequest()
    try {
      const res = await fetch(url.toString(), {
        method,
        headers: buildHeaders(
          body
            ? { 'Content-Type': 'application/json' }
            : undefined
        ),
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      })

      const text = await res.text()
      const json = text ? safeJson(text) : null

      if (res.ok) {
        return json as T
      }

      // 429: respetar Retry-After
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '1', 10)
        await sleep(retryAfter * 1000)
        attempt += 1
        continue
      }

      // 5xx: backoff exponencial
      if (res.status >= 500 && res.status < 600 && attempt < retries) {
        await sleep(Math.min(2_000 * Math.pow(2, attempt), 30_000))
        attempt += 1
        continue
      }

      throw new FubError(
        `FUB ${method} ${path} → ${res.status}`,
        res.status,
        json ?? text
      )
    } catch (err) {
      if (err instanceof FubError) throw err
      lastError = err as Error
      if (attempt >= retries) break
      await sleep(Math.min(1_000 * Math.pow(2, attempt), 15_000))
      attempt += 1
    } finally {
      releaseSlot()
    }
  }

  throw lastError || new Error(`FUB ${method} ${path} failed after ${retries} retries`)
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================
// Helper: paginación con cursor offset/next
// ============================================================

async function* paginate<T>(
  path: string,
  key: string,
  query: Record<string, string | number | boolean | undefined | null> = {},
  pageSize = 100
): AsyncGenerator<T[]> {
  let offset = 0
  while (true) {
    const res = await request<FubListResponse<T>>(path, {
      query: { ...query, limit: pageSize, offset },
    })
    const meta = res._metadata as FubMetadata
    const items = (res[key] as T[]) || []
    if (items.length === 0) return
    yield items
    if (!meta.next) return
    offset += items.length
    if (offset >= meta.total) return
  }
}

// ============================================================
// API tipada (subset que necesitamos)
// ============================================================

export const fub = {
  // Identity
  getIdentity: () => request<FubIdentity>('/identity'),

  // Users (mapping inicial)
  listUsers: async (): Promise<FubUser[]> => {
    const all: FubUser[] = []
    for await (const page of paginate<FubUser>('/users', 'users')) {
      all.push(...page)
    }
    return all
  },

  // Stages / Pipelines (metadata para seed)
  listStages: () => request<{ _metadata: FubMetadata; stages: FubStage[] }>('/stages'),
  listPipelines: () => request<{ _metadata: FubMetadata; pipelines: FubPipeline[] }>('/pipelines'),

  // People
  getPerson: (id: number) => request<FubPerson>(`/people/${id}`),
  listPeople: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubPerson>('/people', 'people', query),

  // Deals
  getDeal: (id: number) => request<FubDeal>(`/deals/${id}`),
  listDeals: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubDeal>('/deals', 'deals', query),

  // Calls
  getCall: (id: number) => request<FubCall>(`/calls/${id}`),
  listCalls: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubCall>('/calls', 'calls', query),

  // Texts
  getTextMessage: (id: number) => request<FubTextMessage>(`/textMessages/${id}`),
  listTextMessages: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubTextMessage>('/textMessages', 'textMessages', query),

  // Emails — FUB usa /em y /emails. /emails es el oficial.
  getEmail: (id: number) => request<FubEmail>(`/emails/${id}`),
  listEmails: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubEmail>('/emails', 'emails', query),

  // Appointments
  getAppointment: (id: number) => request<FubAppointment>(`/appointments/${id}`),
  listAppointments: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubAppointment>('/appointments', 'appointments', query),

  // Tasks
  getTask: (id: number) => request<FubTask>(`/tasks/${id}`),
  listTasks: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubTask>('/tasks', 'tasks', query),

  // Notes
  getNote: (id: number) => request<FubNote>(`/notes/${id}`),
  listNotes: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubNote>('/notes', 'notes', query),

  // Events
  getEvent: (id: number) => request<FubEvent>(`/events/${id}`),
  listEvents: (query: Record<string, string | number | boolean | undefined> = {}) =>
    paginate<FubEvent>('/events', 'events', query),

  // Webhooks
  listWebhooks: () =>
    request<{ _metadata: FubMetadata; webhooks: FubWebhookSubscription[] }>('/webhooks'),
  createWebhook: (input: { event: FubEventName; url: string }) =>
    request<FubWebhookSubscription>('/webhooks', { method: 'POST', body: input }),
  deleteWebhook: (id: number) =>
    request<void>(`/webhooks/${id}`, { method: 'DELETE' }),

  // Bajo nivel (fallback)
  raw: request,
}

export type Fub = typeof fub
