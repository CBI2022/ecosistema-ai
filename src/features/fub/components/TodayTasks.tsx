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
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Tareas de hoy</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          {tasks.length} pendientes
        </span>
      </header>
      {tasks.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#9A9080]">
          🎉 Sin tareas pendientes hoy.
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E8907A]">
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
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A9080]">
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
    </section>
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
  const overdue = variant === 'overdue'

  return (
    <li>
      <a
        href={task.person_id ? `/leads?personId=${task.person_id}` : '#'}
        className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition ${
          overdue
            ? 'border-[#C84B45]/30 bg-[#1A0F0E] hover:border-[#C84B45]/60'
            : 'border-white/8 bg-white/4 hover:border-[#C9A84C]/30 hover:bg-white/6'
        }`}
      >
        <span className="text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-[#F5F0E8]">
            {task.description || task.type || 'Tarea'}
          </div>
          {task.person_name && (
            <div className="truncate text-[11px] text-[#9A9080]">{task.person_name}</div>
          )}
        </div>
        {task.due_at && (
          <span
            className={`flex-shrink-0 font-mono text-[10px] ${
              overdue ? 'font-semibold text-[#E8907A]' : 'text-[#9A9080]'
            }`}
          >
            {fmtTime(task.due_at)}
          </span>
        )}
      </a>
    </li>
  )
}
