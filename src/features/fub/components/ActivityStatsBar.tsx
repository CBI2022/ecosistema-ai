import type { AgentActivityStats } from '@/actions/fub-stats'

interface Props {
  today: AgentActivityStats | null
  week: AgentActivityStats | null
  month: AgentActivityStats | null
  goals?: {
    monthly_calls?: number | null
    monthly_followups?: number | null
    monthly_appointments?: number | null
  } | null
}

interface Goal {
  label: string
  todayValue: number
  weekValue: number
  monthValue: number
  monthlyGoal: number | null
  color: string
}

function pct(v: number, goal: number | null) {
  if (!goal) return null
  return Math.min(Math.round((v / goal) * 100), 999)
}

export function ActivityStatsBar({ today, week, month, goals }: Props) {
  if (!today && !week && !month) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Sin datos de actividad. Verifica que la sincronización con Follow Up Boss esté activa.
      </div>
    )
  }

  const t = today ?? emptyStats()
  const w = week ?? emptyStats()
  const m = month ?? emptyStats()

  const metrics: Goal[] = [
    {
      label: 'Llamadas',
      todayValue: t.calls,
      weekValue: w.calls,
      monthValue: m.calls,
      monthlyGoal: goals?.monthly_calls ?? null,
      color: '#3B82F6',
    },
    {
      label: 'Conversaciones',
      todayValue: t.conversations,
      weekValue: w.conversations,
      monthValue: m.conversations,
      monthlyGoal: null,
      color: '#2ECC9A',
    },
    {
      label: 'Mensajes',
      todayValue: t.texts + t.emails,
      weekValue: w.texts + w.emails,
      monthValue: m.texts + m.emails,
      monthlyGoal: goals?.monthly_followups ?? null,
      color: '#F59E0B',
    },
    {
      label: 'Citas (held)',
      todayValue: t.appointmentsHeld,
      weekValue: w.appointmentsHeld,
      monthValue: m.appointmentsHeld,
      monthlyGoal: goals?.monthly_appointments ?? null,
      color: '#A855F7',
    },
    {
      label: 'Nuevos leads',
      todayValue: t.newLeads,
      weekValue: w.newLeads,
      monthValue: m.newLeads,
      monthlyGoal: null,
      color: '#EC4899',
    },
  ]

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Actividad CRM</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">Follow Up Boss</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => {
          const monthPct = pct(metric.monthValue, metric.monthlyGoal)
          return (
            <div key={metric.label} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500">{metric.label}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">{metric.todayValue}</span>
                <span className="text-xs text-neutral-400">hoy</span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {metric.weekValue} semana · {metric.monthValue} mes
              </div>
              {metric.monthlyGoal !== null && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(monthPct ?? 0, 100)}%`,
                        backgroundColor: metric.color,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-neutral-400">
                    {monthPct}% del goal mensual ({metric.monthlyGoal})
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function emptyStats(): AgentActivityStats {
  return {
    scope: 'today',
    calls: 0,
    conversations: 0,
    texts: 0,
    emails: 0,
    appointmentsScheduled: 0,
    appointmentsHeld: 0,
    tasksCompleted: 0,
    newLeads: 0,
  }
}
