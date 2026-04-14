import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TasksDashboard } from '@/features/tasks/components/TasksDashboard'

export default async function TasksPage() {
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

  // Admin ve todas; resto solo las suyas
  const tasksQuery = admin
    .from('project_tasks')
    .select('*')
    .order('position', { ascending: true })

  const { data: rawTasks } = isAdmin
    ? await tasksQuery
    : await tasksQuery.eq('assigned_to', user.id)

  // Join manual con profiles (el FK apunta a auth.users, no a profiles, así que hacemos merge en código)
  const assigneeIds = [...new Set((rawTasks || []).map((t) => t.assigned_to).filter(Boolean))] as string[]
  const profilesMap = new Map<string, { id: string; full_name: string | null; email: string; role: string; avatar_url: string | null }>()
  if (assigneeIds.length > 0) {
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('id', assigneeIds)
    for (const p of profilesData || []) profilesMap.set(p.id, p)
  }
  const tasks = (rawTasks || []).map((t) => ({
    ...t,
    assignee: t.assigned_to ? profilesMap.get(t.assigned_to) || null : null,
  }))

  // Lista de usuarios para asignar (solo admins lo necesitan)
  let assignableUsers: Array<{ id: string; full_name: string | null; email: string; role: string }> = []
  if (isAdmin) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('status', 'approved')
      .order('full_name', { ascending: true })
    assignableUsers = data || []
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#F5F0E8]">Tasks</h1>
          <p className="mt-1 text-sm text-[#9A9080]">
            {isAdmin
              ? 'Panel de tareas del proyecto — tú ves todo'
              : 'Tus tareas asignadas'}
          </p>
        </div>
      </div>

      <TasksDashboard
        initialTasks={tasks || []}
        currentUserId={user.id}
        currentUserName={profile?.full_name || profile?.email || 'Usuario'}
        isAdmin={isAdmin}
        assignableUsers={assignableUsers}
      />
    </div>
  )
}
