// Helpers para integrar Google Calendar de Jelle (o cualquier photographer).
// Todo el flujo OAuth + sync vive aquí.

import { google } from 'googleapis'
import type { calendar_v3, Auth } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'

// Scopes mínimos: leer events (busy times) y escribir events (crear shoots)
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

function getOAuthCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function isGoogleCalendarConfigured(): boolean {
  return getOAuthCredentials() !== null
}

export function getRedirectUri(): string {
  return `${getSiteUrl()}/api/google/callback`
}

// Cliente OAuth2 sin tokens — para iniciar flujo o intercambiar code
export function buildOAuthClient(): Auth.OAuth2Client | null {
  const creds = getOAuthCredentials()
  if (!creds) return null
  return new google.auth.OAuth2(creds.clientId, creds.clientSecret, getRedirectUri())
}

// URL para iniciar el flujo. state lleva user_id firmado simple (suficiente,
// el callback verifica además que el user de la sesión coincida).
export function buildAuthUrl(state: string): string | null {
  const oauth = buildOAuthClient()
  if (!oauth) return null
  return oauth.generateAuthUrl({
    access_type: 'offline', // necesitamos refresh_token
    prompt: 'consent', // forzar refresh_token cada vez (importante en desarrollo)
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  })
}

// Intercambia el code que devuelve Google por tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth = buildOAuthClient()
  if (!oauth) throw new Error('Google OAuth no configurado')
  const { tokens } = await oauth.getToken(code)
  return tokens
}

// Obtiene email asociado a los tokens (para mostrarlo en UI)
export async function fetchGoogleEmail(tokens: Auth.Credentials): Promise<string | null> {
  const oauth = buildOAuthClient()
  if (!oauth) return null
  oauth.setCredentials(tokens)
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth })
    const { data } = await oauth2.userinfo.get()
    return data.email ?? null
  } catch {
    return null
  }
}

// Carga la conexión guardada de un user y devuelve un cliente OAuth con
// los tokens listos. Maneja refresh automático cuando access_token caduca.
export async function getOAuthClientForUser(userId: string): Promise<Auth.OAuth2Client | null> {
  const oauth = buildOAuthClient()
  if (!oauth) return null

  const admin = createAdminClient()
  const { data: conn } = await admin
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!conn) return null

  oauth.setCredentials({
    refresh_token: conn.refresh_token,
    access_token: conn.access_token ?? undefined,
    expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
  })

  // Refresh automático: si el access_token caducó, googleapis usa el refresh_token.
  // Cuando emite uno nuevo, lo persistimos.
  oauth.on('tokens', async (newTokens) => {
    if (!newTokens.access_token) return
    await admin
      .from('google_calendar_connections')
      .update({
        access_token: newTokens.access_token,
        token_expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
        // refresh_token solo lo manda Google la primera vez con prompt=consent
        ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  })

  return oauth
}

export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const auth = await getOAuthClientForUser(userId)
  if (!auth) return null
  return google.calendar({ version: 'v3', auth })
}

// ─── Sync de un shoot al Calendar del fotógrafo ───

interface ShootForCal {
  id: string
  shoot_date: string
  shoot_time: string
  property_address: string | null
  property_reference: string | null
  notes: string | null
  agent_name?: string | null
  agent_phone?: string | null
}

function buildEventBody(shoot: ShootForCal, status: 'confirmed' | 'tentative' = 'confirmed'): calendar_v3.Schema$Event {
  // shoot_time viene "HH:MM:SS" o "HH:MM" → normalizar
  const time = shoot.shoot_time.length >= 5 ? shoot.shoot_time.slice(0, 5) : shoot.shoot_time
  const startISO = `${shoot.shoot_date}T${time}:00`
  // Duración por defecto 2h
  const [hh, mm] = time.split(':').map((s) => parseInt(s, 10))
  const endHour = String((hh + 2) % 24).padStart(2, '0')
  const endISO = `${shoot.shoot_date}T${endHour}:${String(mm).padStart(2, '0')}:00`

  const summary = `📸 Shoot · ${shoot.property_address || shoot.property_reference || 'Propiedad'}`
  const descriptionLines: string[] = []
  if (shoot.agent_name) descriptionLines.push(`Agente: ${shoot.agent_name}`)
  if (shoot.agent_phone) descriptionLines.push(`Tel: ${shoot.agent_phone}`)
  if (shoot.property_reference) descriptionLines.push(`Ref: ${shoot.property_reference}`)
  if (shoot.notes) descriptionLines.push(`\nNotas:\n${shoot.notes}`)
  descriptionLines.push(`\n— Reservado vía CBI ECO AI`)

  return {
    summary,
    location: shoot.property_address ?? undefined,
    description: descriptionLines.join('\n'),
    start: { dateTime: startISO, timeZone: 'Europe/Madrid' },
    end: { dateTime: endISO, timeZone: 'Europe/Madrid' },
    status,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 24 * 60 },
      ],
    },
  }
}

export async function createShootEvent(photographerId: string, shoot: ShootForCal): Promise<string | null> {
  const cal = await getCalendarClient(photographerId)
  if (!cal) return null
  try {
    const { data } = await cal.events.insert({
      calendarId: 'primary',
      requestBody: buildEventBody(shoot),
    })
    return data.id ?? null
  } catch (err) {
    console.error('[google-calendar] createShootEvent failed:', err)
    return null
  }
}

export async function updateShootEvent(
  photographerId: string,
  eventId: string,
  shoot: ShootForCal,
): Promise<boolean> {
  const cal = await getCalendarClient(photographerId)
  if (!cal) return false
  try {
    await cal.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: buildEventBody(shoot),
    })
    return true
  } catch (err) {
    console.error('[google-calendar] updateShootEvent failed:', err)
    return false
  }
}

export async function cancelShootEvent(photographerId: string, eventId: string): Promise<boolean> {
  const cal = await getCalendarClient(photographerId)
  if (!cal) return false
  try {
    await cal.events.delete({ calendarId: 'primary', eventId })
    return true
  } catch (err) {
    // 410 = ya borrado, lo damos por OK
    const e = err as { code?: number; status?: number }
    if (e.code === 410 || e.status === 410) return true
    console.error('[google-calendar] cancelShootEvent failed:', err)
    return false
  }
}

// ─── Importar busy times del Calendar de Jelle ───
// Se invoca a demanda (cuando el agente abre el calendario de booking)
// o por cron. Refresca la tabla google_calendar_busy con los eventos del rango.
export async function syncBusyTimes(
  photographerId: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string,
): Promise<{ synced: number } | { error: string }> {
  const cal = await getCalendarClient(photographerId)
  if (!cal) return { error: 'No conectado' }

  const timeMin = new Date(fromDate + 'T00:00:00').toISOString()
  const timeMax = new Date(toDate + 'T23:59:59').toISOString()

  try {
    const { data } = await cal.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const admin = createAdminClient()
    const events = (data.items ?? []).filter((e) => e.status !== 'cancelled')

    // Limpiar busy del rango y reinsertar (más simple que diff incremental)
    await admin
      .from('google_calendar_busy')
      .delete()
      .eq('user_id', photographerId)
      .gte('busy_date', fromDate)
      .lte('busy_date', toDate)

    const rows = events
      .map((e) => {
        const isAllDay = !!e.start?.date
        const startDate = e.start?.date ?? e.start?.dateTime?.slice(0, 10)
        if (!startDate || !e.id) return null

        const busyStart = e.start?.dateTime ? e.start.dateTime.slice(11, 19) : null
        const busyEnd = e.end?.dateTime ? e.end.dateTime.slice(11, 19) : null

        return {
          user_id: photographerId,
          google_event_id: e.id,
          busy_date: startDate,
          busy_start: busyStart,
          busy_end: busyEnd,
          is_all_day: isAllDay,
          summary: e.summary ?? null,
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>

    if (rows.length > 0) {
      await admin.from('google_calendar_busy').insert(rows)
    }

    return { synced: rows.length }
  } catch (err) {
    console.error('[google-calendar] syncBusyTimes failed:', err)
    return { error: 'Sync falló' }
  }
}

export async function getBusyTimesFromDb(
  photographerId: string,
  fromDate: string,
  toDate: string,
) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('google_calendar_busy')
    .select('busy_date, busy_start, busy_end, is_all_day, summary')
    .eq('user_id', photographerId)
    .gte('busy_date', fromDate)
    .lte('busy_date', toDate)
  return data ?? []
}

export async function disconnectGoogleCalendar(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  // Intentar revocar tokens en Google antes de borrar
  try {
    const auth = await getOAuthClientForUser(userId)
    if (auth) {
      const creds = auth.credentials
      if (creds.access_token) {
        await auth.revokeToken(creds.access_token)
      }
    }
  } catch {
    // Ignorar errores de revoke — borramos local igual
  }

  await admin.from('google_calendar_connections').delete().eq('user_id', userId)
  await admin.from('google_calendar_busy').delete().eq('user_id', userId)
  return true
}
