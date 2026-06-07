'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface NotificationRow {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  url: string | null
  created_at: string
}

// Una sola lista: las notificaciones del propio usuario. Las solicitudes de
// acceso llegan como notificación a los admins (con url=/admin). Una sola consulta.
export async function getNotificationsData(): Promise<{ notifications: NotificationRow[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notifications: [] }

  const admin = createAdminClient()
  const { data: notifications } = await admin
    .from('notifications')
    .select('id, type, title, message, is_read, url, created_at')
    .eq('target_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40)

  return { notifications: (notifications || []) as NotificationRow[] }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Admin puede marcar cualquier notificación; resto solo las suyas
  const query = admin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  const { error } = isAdmin
    ? await query
    : await query.eq('target_user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAllRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const query = admin
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  const { error } = isAdmin
    ? await query
    : await query.eq('target_user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
