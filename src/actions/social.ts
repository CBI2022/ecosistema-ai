'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SocialPlatform } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'No autorizado' }
  return { user, admin }
}

// =============== Schedule / Publish ===============

export async function schedulePost(formData: FormData) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const clipId = formData.get('clip_id') as string
  const caption = (formData.get('caption') as string) || ''
  const hashtags = (formData.get('hashtags') as string) || ''
  const scheduledFor = formData.get('scheduled_for') as string
  const platforms = (formData.getAll('platforms') as string[]).filter(Boolean)

  if (!clipId || !scheduledFor || platforms.length === 0) {
    return { error: 'Clip, fecha y al menos una plataforma son obligatorios' }
  }

  const { error } = await ctx.admin.from('scheduled_posts').insert({
    clip_id: clipId,
    platforms,
    caption,
    hashtags,
    scheduled_for: scheduledFor,
    status: 'queued',
    created_by: ctx.user.id,
  })
  if (error) return { error: error.message }

  // Marcar clip como scheduled
  await ctx.admin.from('clips').update({ status: 'scheduled' }).eq('id', clipId)

  revalidatePath('/social')
  return { success: true }
}

export async function cancelScheduledPost(postId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const { data: post } = await ctx.admin
    .from('scheduled_posts')
    .select('clip_id, status')
    .eq('id', postId)
    .single()

  if (post?.status === 'published') return { error: 'Ya publicado — no se puede cancelar' }

  const { error } = await ctx.admin
    .from('scheduled_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { error: error.message }

  // Revertir clip si queda sin otras programaciones
  if (post?.clip_id) {
    const { count } = await ctx.admin
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('clip_id', post.clip_id)
      .in('status', ['queued', 'publishing'])
    if (!count || count === 0) {
      await ctx.admin.from('clips').update({ status: 'available' }).eq('id', post.clip_id)
    }
  }

  revalidatePath('/social')
  return { success: true }
}

// Publica AHORA un post programado (dispara la publicación real en cada plataforma)
export async function publishNow(postId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const { data: post } = await ctx.admin
    .from('scheduled_posts')
    .select('*, clips(*)')
    .eq('id', postId)
    .single()
  if (!post) return { error: 'Post no encontrado' }

  await ctx.admin
    .from('scheduled_posts')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', postId)

  const publishedUrls: Record<string, string> = {}
  const errors: string[] = []

  for (const platform of post.platforms as SocialPlatform[]) {
    try {
      const url = await publishToPlatform(platform, post as Record<string, unknown>)
      publishedUrls[platform] = url
    } catch (err) {
      errors.push(`${platform}: ${(err as Error).message}`)
    }
  }

  const finalStatus = errors.length === post.platforms.length ? 'failed' : 'published'

  await ctx.admin
    .from('scheduled_posts')
    .update({
      status: finalStatus,
      published_urls: publishedUrls,
      error_message: errors.length > 0 ? errors.join(' · ') : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (finalStatus === 'published' && post.clip_id) {
    await ctx.admin.from('clips').update({ status: 'published' }).eq('id', post.clip_id)
  }

  revalidatePath('/social')
  return { success: finalStatus === 'published', errors }
}

// STUB: lógica real por plataforma — se reemplaza al conectar credenciales
async function publishToPlatform(
  platform: SocialPlatform,
  post: Record<string, unknown>
): Promise<string> {
  const clip = post.clips as Record<string, unknown> | null
  const videoUrl = clip?.video_url as string
  const caption = `${(post.caption as string) || ''}\n\n${(post.hashtags as string) || ''}`.trim()

  // TODO: Conectar APIs reales
  // - Instagram: Meta Graph API (container + publish) — requiere IG Business + FB page
  // - YouTube: YouTube Data API v3 upload endpoint (requiere OAuth)
  // - TikTok: TikTok Content Posting API (requiere app aprobada)
  //
  // Por ahora, simulación:
  await new Promise((r) => setTimeout(r, 500))

  if (!videoUrl) throw new Error('Clip sin video_url')
  if (!caption) throw new Error('Caption vacío')

  // Simular URL publicada
  const fakeId = Math.random().toString(36).slice(2, 10)
  const urls: Record<SocialPlatform, string> = {
    instagram: `https://instagram.com/p/${fakeId}`,
    youtube: `https://youtube.com/shorts/${fakeId}`,
    tiktok: `https://tiktok.com/@cbi/video/${fakeId}`,
  }
  return urls[platform]
}

// =============== Platforms ===============

export async function connectPlatform(formData: FormData) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const platform = formData.get('platform') as SocialPlatform
  const handle = formData.get('handle') as string
  const externalId = (formData.get('external_id') as string) || null

  if (!platform || !handle) return { error: 'Plataforma y handle requeridos' }

  const { error } = await ctx.admin
    .from('social_accounts')
    .upsert(
      {
        platform,
        account_handle: handle,
        account_id_external: externalId,
        is_active: true,
        connected_by: ctx.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'platform' }
    )

  if (error) return { error: error.message }
  revalidatePath('/social')
  return { success: true }
}

export async function disconnectPlatform(platform: SocialPlatform) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  await ctx.admin.from('social_accounts').delete().eq('platform', platform)
  revalidatePath('/social')
  return { success: true }
}

// =============== Clips ===============

export async function archiveClip(clipId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await ctx.admin
    .from('clips')
    .update({ status: 'archived' })
    .eq('id', clipId)

  if (error) return { error: error.message }
  revalidatePath('/social')
  return { success: true }
}

// =============== Dev helper: seed demo clips ===============
export async function seedDemoClips() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  // Crear un video_source fake si no hay ninguno
  const { count } = await ctx.admin
    .from('video_sources')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) return { skipped: true, message: 'Ya hay datos' }

  const { data: src } = await ctx.admin
    .from('video_sources')
    .insert({
      source: 'youtube',
      external_id: 'demo_' + Date.now(),
      title: 'Vídeo de muestra: CBI Market Update',
      thumbnail_url: 'https://picsum.photos/seed/cbi1/640/360',
      video_url: 'https://example.com/video.mp4',
      opus_status: 'done',
    })
    .select('id')
    .single()

  if (!src) return { error: 'No se pudo crear video_source demo' }

  const demoClips = [
    { title: '3 motivos para invertir en Moraira', virality_score: 8.4, duration: 45 },
    { title: 'Cómo preparar tu villa para vender', virality_score: 7.1, duration: 52 },
    { title: 'Aeropuerto Alicante → Altea en 40 min', virality_score: 6.8, duration: 28 },
    { title: 'Impuestos al comprar en España', virality_score: 9.2, duration: 60 },
    { title: 'Walkthrough: villa con vistas al mar', virality_score: 8.9, duration: 55 },
    { title: 'Mistakes to avoid as a new agent', virality_score: 7.5, duration: 48 },
  ]

  await ctx.admin.from('clips').insert(
    demoClips.map((c, i) => ({
      video_source_id: src.id,
      external_clip_id: 'demo_clip_' + i,
      title: c.title,
      preview_url: `https://picsum.photos/seed/clip${i}/540/960`,
      video_url: 'https://example.com/clip.mp4',
      thumbnail_url: `https://picsum.photos/seed/clip${i}/540/960`,
      duration_seconds: c.duration,
      virality_score: c.virality_score,
      status: 'available',
    }))
  )

  // Seed métricas de los últimos 7 días
  const now = new Date()
  const rows: Array<{
    platform: SocialPlatform
    snapshot_date: string
    followers: number
    views: number
    likes: number
    comments: number
    shares: number
    engagement_rate: number
  }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const base = 7 - i
    rows.push({ platform: 'instagram', snapshot_date: date, followers: 12400 + base * 15, views: 4500 + base * 120, likes: 380 + base * 9, comments: 42 + base, shares: 18, engagement_rate: 3.2 })
    rows.push({ platform: 'youtube', snapshot_date: date, followers: 8200 + base * 8, views: 18700 + base * 430, likes: 1240 + base * 18, comments: 145, shares: 34, engagement_rate: 7.4 })
    rows.push({ platform: 'tiktok', snapshot_date: date, followers: 21600 + base * 28, views: 72500 + base * 900, likes: 4800 + base * 52, comments: 320, shares: 210, engagement_rate: 9.1 })
  }
  await ctx.admin.from('platform_metrics').upsert(rows, { onConflict: 'platform,snapshot_date' })

  revalidatePath('/social')
  return { success: true, clips: demoClips.length }
}
