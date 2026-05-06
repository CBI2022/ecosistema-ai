'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { taskAssignedEmail } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/site-url'
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

async function notifyAssignment(
  admin: ReturnType<typeof createAdminClient>,
  creatorId: string,
  assigneeId: string,
  taskTitle: string,
) {
  if (!assigneeId || assigneeId === creatorId) return
  const { data: creator } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', creatorId)
    .single()
  const { data: assignee } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', assigneeId)
    .single()
  const creatorName = creator?.full_name || creator?.email || 'Alguien'

  // Notificación in-app
  await admin.from('notifications').insert({
    type: 'task_assigned',
    title: 'Nueva tarea asignada',
    message: `${creatorName} te asignó: "${taskTitle}"`,
    target_user_id: assigneeId,
    is_read: false,
  })

  // Email
  if (assignee?.email) {
    const tpl = taskAssignedEmail(taskTitle, creatorName, `${getSiteUrl()}/tasks`)
    await sendEmail({ to: assignee.email, subject: tpl.subject, html: tpl.html })
  }
}

export async function createTask(formData: FormData) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden crear tareas' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Título obligatorio' }

  const assignedTo = (formData.get('assigned_to') as string) || null

  const { error } = await ctx.admin.from('project_tasks').insert({
    title,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    priority: (formData.get('priority') as TaskPriority) || 'medium',
    status: (formData.get('status') as TaskStatus) || 'next_action',
    assigned_to: assignedTo,
    due_date: (formData.get('due_date') as string) || null,
    is_saas_core: formData.get('is_saas_core') === 'true',
    created_by: ctx.user.id,
  })

  if (error) return { error: error.message }

  if (assignedTo) {
    await notifyAssignment(ctx.admin, ctx.user.id, assignedTo, title)
  }

  revalidatePath('/tasks')
  revalidatePath('/notifications')
  return { success: true }
}

export async function updateTask(taskId: string, updates: {
  title?: string
  description?: string | null
  category?: string
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string | null
  due_date?: string | null
  is_saas_core?: boolean
}) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }

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
    if (updates.description !== undefined) safe.description = updates.description
    if (Object.keys(safe).length === 0) return { error: 'Sin permiso' }
    safe.updated_at = new Date().toISOString()
    if (updates.status === 'complete') safe.completed_at = new Date().toISOString()

    const { error } = await ctx.admin.from('project_tasks').update(safe).eq('id', taskId)
    if (error) return { error: error.message }
    revalidatePath('/tasks')
    return { success: true }
  }

  const patch: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  if (updates.status === 'complete') patch.completed_at = new Date().toISOString()
  if (updates.status && updates.status !== 'complete') patch.completed_at = null

  // If assignment changed to another user, send a notification
  let prevAssignee: string | null = null
  let currentTitle = ''
  if (updates.assigned_to !== undefined) {
    const { data: prev } = await ctx.admin
      .from('project_tasks')
      .select('assigned_to, title')
      .eq('id', taskId)
      .single()
    prevAssignee = prev?.assigned_to ?? null
    currentTitle = prev?.title ?? ''
  }

  const { error } = await ctx.admin.from('project_tasks').update(patch).eq('id', taskId)
  if (error) return { error: error.message }

  if (
    updates.assigned_to !== undefined &&
    updates.assigned_to &&
    updates.assigned_to !== prevAssignee
  ) {
    const title = (updates.title as string | undefined) ?? currentTitle
    await notifyAssignment(ctx.admin, ctx.user.id, updates.assigned_to, title)
    revalidatePath('/notifications')
  }

  revalidatePath('/tasks')
  return { success: true }
}

// Soft delete → envía a papelera
export async function deleteTask(taskId: string) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden eliminar tareas' }

  const { error } = await ctx.admin
    .from('project_tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// Restaurar de la papelera
export async function restoreTask(taskId: string) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden restaurar tareas' }

  const { error } = await ctx.admin
    .from('project_tasks')
    .update({ deleted_at: null })
    .eq('id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// Eliminar definitivamente (desde la papelera)
export async function deleteTaskForever(taskId: string) {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Solo admins pueden eliminar tareas definitivamente' }

  const { error } = await ctx.admin.from('project_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  return updateTask(taskId, { status })
}
