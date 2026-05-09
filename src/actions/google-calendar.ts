'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  disconnectGoogleCalendar,
  isGoogleCalendarConfigured,
  listCalendarsForUser,
  setActiveCalendarId,
} from '@/lib/google-calendar'

// Estado de la conexión del usuario actual
export async function getMyGoogleConnection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { configured: false, connected: false, email: null as string | null }

  const configured = isGoogleCalendarConfigured()

  const admin = createAdminClient()
  const { data } = await admin
    .from('google_calendar_connections')
    .select('google_email, calendar_id, connected_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    configured,
    connected: !!data,
    email: data?.google_email ?? null,
    calendarId: data?.calendar_id ?? null,
    connectedAt: data?.connected_at ?? null,
  }
}

export async function listMyCalendars() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', calendars: [] }
  const calendars = await listCalendarsForUser(user.id)
  return { calendars }
}

export async function setMyActiveCalendar(calendarId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!calendarId) return { error: 'Falta calendarId' }
  const ok = await setActiveCalendarId(user.id, calendarId)
  if (!ok) return { error: 'No se pudo guardar' }
  revalidatePath('/photographer')
  return { success: true }
}

export async function disconnectMyGoogleCalendar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await disconnectGoogleCalendar(user.id)
  revalidatePath('/photographer')
  return { success: true }
}
