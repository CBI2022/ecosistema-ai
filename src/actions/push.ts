'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'mailto:admin@cbi.com'
  if (!publicKey || !privateKey) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(email, publicKey, privateKey)
}

export async function saveSubscription(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: sub.userAgent || null,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function unsubscribe(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return { success: true }
}

export async function sendPushToUser(userId: string, payload: {
  title: string
  body: string
  url?: string
  tag?: string
}) {
  try {
    configureWebPush()
  } catch {
    return { error: 'Push no configurado' }
  }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return { skipped: true }

  const dead: string[] = []
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
      } catch (err) {
        const e = err as { statusCode?: number }
        // 404 / 410 = subscripción expirada, purgar
        if (e.statusCode === 404 || e.statusCode === 410) {
          dead.push(s.endpoint)
        }
      }
    })
  )

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().eq('user_id', userId).in('endpoint', dead)
  }

  return { sent: subs.length - dead.length, pruned: dead.length }
}

// Test push — útil desde /settings
export async function sendTestPush() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  return await sendPushToUser(user.id, {
    title: '🔔 Prueba de notificación',
    body: 'Si ves esto, las notificaciones push funcionan correctamente.',
    url: '/dashboard',
  })
}
