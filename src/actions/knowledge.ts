'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Not authorized' as const }
  return { user, admin }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `folder-${Date.now()}`
}

export async function getAllKnowledge() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const [{ data: folders }, { data: items }] = await Promise.all([
    ctx.admin.from('knowledge_folders').select('*').order('position', { ascending: true }),
    ctx.admin.from('knowledge_items').select('*').order('position', { ascending: true }),
  ])

  return { folders: folders || [], items: items || [] }
}

export async function createFolder(input: { name: string; description?: string; icon?: string }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const name = input.name.trim()
  if (!name) return { error: 'Nombre obligatorio' }

  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1
  while (true) {
    const { data: existing } = await ctx.admin
      .from('knowledge_folders')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  const { data: max } = await ctx.admin
    .from('knowledge_folders')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (max?.position ?? 0) + 1

  const { data, error } = await ctx.admin
    .from('knowledge_folders')
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      position,
      created_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { folder: data }
}

export async function updateFolder(id: string, patch: { name?: string; description?: string | null; icon?: string | null }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name.trim()
  if (patch.description !== undefined) update.description = patch.description?.toString().trim() || null
  if (patch.icon !== undefined) update.icon = patch.icon?.toString().trim() || null

  const { error } = await ctx.admin.from('knowledge_folders').update(update).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { success: true }
}

export async function deleteFolder(id: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await ctx.admin.from('knowledge_folders').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { success: true }
}

export async function createItem(input: { folder_id: string; title: string; content?: string; tags?: string[]; pinned?: boolean }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const title = input.title.trim()
  if (!title) return { error: 'Título obligatorio' }

  const { data: max } = await ctx.admin
    .from('knowledge_items')
    .select('position')
    .eq('folder_id', input.folder_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (max?.position ?? 0) + 1

  const { data, error } = await ctx.admin
    .from('knowledge_items')
    .insert({
      folder_id: input.folder_id,
      title,
      content: input.content || '',
      tags: input.tags || [],
      pinned: input.pinned || false,
      position,
      source: 'manual',
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { item: data }
}

export async function updateItem(id: string, patch: { title?: string; content?: string; tags?: string[]; pinned?: boolean; folder_id?: string }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const update: Record<string, unknown> = { updated_by: ctx.user.id }
  if (patch.title !== undefined) update.title = patch.title.trim()
  if (patch.content !== undefined) update.content = patch.content
  if (patch.tags !== undefined) update.tags = patch.tags
  if (patch.pinned !== undefined) update.pinned = patch.pinned
  if (patch.folder_id !== undefined) update.folder_id = patch.folder_id

  const { error } = await ctx.admin.from('knowledge_items').update(update).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { success: true }
}

export async function deleteItem(id: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await ctx.admin.from('knowledge_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/knowledge')
  return { success: true }
}
