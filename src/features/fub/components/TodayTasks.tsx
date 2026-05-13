interface Props {
  tasks: Array<{
    id: number
    type: string | null
    description: string | null
    due_at: string | null
    status: string | null
    is_overdue: boolean
    person_id: number | null
    person_name: string | null
  }>
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const TYPE_ICON: Record<string, string> = {
  call: '📞',
  text: '💬',
  email: '✉️',
  appointment: '📅',
  followUp: '🔄',
  thankYou: '🙏',
  default: '📌',
}

export function TodayTasks({ tasks }: Props) {
  const overdue = tasks.filter((t) => t.is_overdue)
  const today = tasks.filter((t) => !t.is_overdue)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Tareas de hoy</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          {tasks.length} pendientes
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500">
          🎉 Sin tareas pendientes hoy.
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                Vencidas ({overdue.length})
              </div>
              <ul className="space-y-1.5">
                {overdue.map((t) => (
                  <TaskItem key={t.id} task={t} variant="overdue" />
                ))}
              </ul>
            </div>
          )}
          {today.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Hoy ({today.length})
              </div>
              <ul className="space-y-1.5">
                {today.map((t) => (
                  <TaskItem key={t.id} task={t} variant="today" />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TaskItem({
  task,
  variant,
}: {
  task: Props['tasks'][number]
  variant: 'overdue' | 'today'
}) {
  const icon = TYPE_ICON[task.type || 'default'] || TYPE_ICON.default
  const borderColor = variant === 'overdue' ? 'border-red-200 bg-red-50/50' : 'border-neutral-100 bg-neutral-50/40'

  return (
    <li>
      <a
        href={task.person_id ? `/leads?personId=${task.person_id}` : '#'}
        className={`flex items-start gap-2 rounded-lg border ${borderColor} px-3 py-2 transition hover:border-neutral-300`}
      >
        <span className="text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-neutral-900">
            {task.description || task.type || 'Tarea'}
          </div>
          {task.person_name && (
            <div className="truncate text-[11px] text-neutral-500">{task.person_name}</div>
          )}
        </div>
        {task.due_at && (
          <span
            className={`flex-shrink-0 font-mono text-[10px] ${
              variant === 'overdue' ? 'text-red-600 font-semibold' : 'text-neutral-500'
            }`}
          >
            {fmtTime(task.due_at)}
          </span>
        )}
      </a>
    </li>
  )
}
