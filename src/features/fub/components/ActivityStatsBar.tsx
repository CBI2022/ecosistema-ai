import type { AgentActivityStats } from '@/actions/fub-stats'
import { CBI_HEX } from '../theme'

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

interface Metric {
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

export function ActivityStatsBar({ today, week, month, goals }: Props) {
  if (!today && !week && !month) {
    return (
      <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-6 text-center text-sm text-[#9A9080]">
        Sin datos de actividad. Verifica que la sincronización con Follow Up Boss esté activa.
      </div>
    )
  }

  const t = today ?? emptyStats()
  const w = week ?? emptyStats()
  const m = month ?? emptyStats()

  const metrics: Metric[] = [
    {
      label: 'Llamadas',
      todayValue: t.calls,
      weekValue: w.calls,
      monthValue: m.calls,
      monthlyGoal: goals?.monthly_calls ?? null,
      color: CBI_HEX.gold,
    },
    {
      label: 'Conversaciones',
      todayValue: t.conversations,
      weekValue: w.conversations,
      monthValue: m.conversations,
      monthlyGoal: null,
      color: CBI_HEX.emerald,
    },
    {
      label: 'Mensajes',
      todayValue: t.texts + t.emails,
      weekValue: w.texts + w.emails,
      monthValue: m.texts + m.emails,
      monthlyGoal: goals?.monthly_followups ?? null,
      color: CBI_HEX.amber,
    },
    {
      label: 'Citas held',
      todayValue: t.appointmentsHeld,
      weekValue: w.appointmentsHeld,
      monthValue: m.appointmentsHeld,
      monthlyGoal: goals?.monthly_appointments ?? null,
      color: CBI_HEX.violet,
    },
    {
      label: 'Nuevos leads',
      todayValue: t.newLeads,
      weekValue: w.newLeads,
      monthValue: m.newLeads,
      monthlyGoal: null,
      color: CBI_HEX.rose,
    },
  ]

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Actividad CRM</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">Follow Up Boss</span>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => {
          const monthPct = pct(metric.monthValue, metric.monthlyGoal)
          return (
            <div
              key={metric.label}
              className="rounded-xl border border-white/8 bg-white/4 p-3 transition hover:border-[#C9A84C]/30"
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">{metric.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#F5F0E8]">{metric.todayValue}</span>
                <span className="text-[10px] text-[#9A9080]">hoy</span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#9A9080]">
                {metric.weekValue} semana · {metric.monthValue} mes
              </div>
              {metric.monthlyGoal !== null && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(monthPct ?? 0, 100)}%`,
                        backgroundColor: metric.color,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-[#9A9080]">
                    {monthPct}% del goal mensual ({metric.monthlyGoal})
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
