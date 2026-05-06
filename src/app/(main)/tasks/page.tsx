import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TasksDashboard } from '@/features/tasks/components/TasksDashboard'
import type { ProjectTask } from '@/types/database'

interface Profile {
  id: string
  full_name: string | null
  email: string
  role: string
  avatar_url: string | null
}
type TaskWithAssignee = ProjectTask & { assignee: Profile | null }

export default async function TasksPage() {
  const t = await getTranslations('tasks')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Tareas activas (no eliminadas)
  const activeQuery = admin
    .from('project_tasks')
    .select('*')
    .is('deleted_at', null)
    .order('position', { ascending: true })

  // Papelera (solo admin)
  const trashQuery = admin
    .from('project_tasks')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  const [{ data: rawTasks }, trashResult] = await Promise.all([
    isAdmin ? activeQuery : activeQuery.eq('assigned_to', user.id),
    isAdmin ? trashQuery : Promise.resolve({ data: [] }),
  ])

  const rawTrash = ('data' in trashResult ? trashResult.data : []) as ProjectTask[] | null

  const allTaskRows = [...(rawTasks || []), ...(rawTrash || [])]
  const assigneeIds = [...new Set(allTaskRows.map((t) => t.assigned_to).filter(Boolean))] as string[]
  const profilesMap = new Map<string, Profile>()
  if (assigneeIds.length > 0) {
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('id', assigneeIds)
    for (const p of profilesData || []) profilesMap.set(p.id, p as Profile)
  }

  const attachAssignee = (t: ProjectTask): TaskWithAssignee => ({
    ...t,
    assignee: t.assigned_to ? profilesMap.get(t.assigned_to) || null : null,
  })

  const tasks: TaskWithAssignee[] = (rawTasks || []).map(attachAssignee)
  const trashedTasks: TaskWithAssignee[] = (rawTrash || []).map(attachAssignee)

  // Usuarios asignables (solo admin)
  let assignableUsers: Array<{ id: string; full_name: string | null; email: string; role: string }> = []
  if (isAdmin) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('status', 'approved')
      .order('full_name', { ascending: true })
    assignableUsers = data || []
  }

  // Progreso del SaaS — global para todos los roles. Solo cuentan las tareas
  // marcadas como is_saas_core=true. Las activas no Core (ej: features futuras)
  // no afectan el porcentaje de "cuánto falta para terminar el SaaS".
  const [{ count: saasTotal }, { count: saasDone }] = await Promise.all([
    admin
      .from('project_tasks')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_saas_core', true),
    admin
      .from('project_tasks')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_saas_core', true)
      .eq('status', 'complete'),
  ])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
          <p className="mt-1 text-sm text-[#9A9080]">
            {isAdmin ? t('adminSubtitle') : t('userSubtitle')}
          </p>
        </div>
      </div>

      <TasksDashboard
        initialTasks={tasks}
        trashedTasks={trashedTasks}
        currentUserId={user.id}
        currentUserName={profile?.full_name || profile?.email || 'Usuario'}
        isAdmin={isAdmin}
        assignableUsers={assignableUsers}
        saasProgress={{ total: saasTotal ?? 0, done: saasDone ?? 0 }}
      />
    </div>
  )
}
