'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TaskPriority, TaskStatus } from '@/types/database'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { user, admin, isAdmin: profile?.role === 'admin' }
}

// Solo admin puede crear
export async function createTask(formData: FormData) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden crear tareas' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Título obligatorio' }

  const { error } = await ctx.admin.from('project_tasks').insert({
    title,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    priority: (formData.get('priority') as TaskPriority) || 'medium',
    status: (formData.get('status') as TaskStatus) || 'todo',
    assigned_to: (formData.get('assigned_to') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    notes: (formData.get('notes') as string) || null,
    docs_url: (formData.get('docs_url') as string) || null,
    created_by: ctx.user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// Admin puede editar todo; asignado puede editar solo status + notes
export async function updateTask(taskId: string, updates: {
  title?: string
  description?: string | null
  category?: string
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string | null
  due_date?: string | null
  notes?: string | null
  docs_url?: string | null
}) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }

  // Si no es admin, solo puede cambiar status/notes y debe ser el asignado
  if (!ctx.isAdmin) {
    const { data: task } = await ctx.admin
      .from('project_tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single()

    if (task?.assigned_to !== ctx.user.id) {
      return { error: 'Solo puedes modificar tareas asignadas a ti' }
    }

    const safe: Record<string, unknown> = {}
    if (updates.status !== undefined) safe.status = updates.status
    if (updates.notes !== undefined) safe.notes = updates.notes
    if (Object.keys(safe).length === 0) return { error: 'Sin permiso' }
    safe.updated_at = new Date().toISOString()
    if (updates.status === 'done') safe.completed_at = new Date().toISOString()

    const { error } = await ctx.admin.from('project_tasks').update(safe).eq('id', taskId)
    if (error) return { error: error.message }
    revalidatePath('/tasks')
    return { success: true }
  }

  // Admin: actualiza cualquier campo
  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  if (updates.status === 'done') patch.completed_at = new Date().toISOString()
  if (updates.status && updates.status !== 'done') patch.completed_at = null

  const { error } = await ctx.admin.from('project_tasks').update(patch).eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden eliminar tareas' }

  const { error } = await ctx.admin.from('project_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// Cambio rápido de status (para kanban drag & drop o checkboxes)
export async function setTaskStatus(taskId: string, status: TaskStatus) {
  return updateTask(taskId, { status })
}
