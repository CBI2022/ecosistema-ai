'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Devuelve notificaciones + (solo admin) usuarios pendientes
export async function getNotificationsData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notifications: [], pendingUsers: [], isAdmin: false }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const notifQuery = admin
    .from('notifications')
    .select('id, type, title, message, target_user_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: notifications } = isAdmin
    ? await notifQuery
    : await notifQuery.eq('target_user_id', user.id)

  let pendingUsers: Array<{
    id: string
    full_name: string | null
    email: string
    role: string
    created_at: string
  }> = []

  if (isAdmin) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    pendingUsers = data || []
  }

  return { notifications: notifications || [], pendingUsers, isAdmin }
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
