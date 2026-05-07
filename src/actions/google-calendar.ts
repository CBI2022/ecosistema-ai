'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { disconnectGoogleCalendar, isGoogleCalendarConfigured } from '@/lib/google-calendar'

// Estado de la conexión del usuario actual
export async function getMyGoogleConnection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { configured: false, connected: false, email: null as string | null }

  const configured = isGoogleCalendarConfigured()

  const admin = createAdminClient()
  const { data } = await admin
    .from('google_calendar_connections')
    .select('google_email, connected_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    configured,
    connected: !!data,
    email: data?.google_email ?? null,
    connectedAt: data?.connected_at ?? null,
  }
}

export async function disconnectMyGoogleCalendar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await disconnectGoogleCalendar(user.id)
  revalidatePath('/photographer')
  return { success: true }
}
