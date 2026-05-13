// Sección FUB integrable en el dashboard del agente.
// Hace fetch en paralelo de stats + pipeline + hot list + stalled + tasks + goals.
// Si la integración FUB no está configurada (no fub_user_map) muestra estado vacío.

import {
  getAgentActivityStats,
  getAgentPipeline,
  getAgentHotList,
  getAgentStalledLeads,
  getAgentTodayTasks,
  getAgentGoals,
} from '@/actions/fub-stats'
import { ActivityStatsBar } from './ActivityStatsBar'
import { PipelineKanban } from './PipelineKanban'
import { HotList } from './HotList'
import { StalledLeads } from './StalledLeads'
import { TodayTasks } from './TodayTasks'

export async function FubDashboardSection() {
  const [today, week, month, pipeline, hot, stalled, tasks, goalsRes] = await Promise.all([
    getAgentActivityStats('today'),
    getAgentActivityStats('week'),
    getAgentActivityStats('month'),
    getAgentPipeline({ includeBranches: false, limitPerStage: 8 }),
    getAgentHotList(10),
    getAgentStalledLeads(14, 12),
    getAgentTodayTasks(50),
    getAgentGoals(),
  ])

  const isUnauthed =
    'error' in today && today.error === 'Not authenticated'
  if (isUnauthed) return null

  // Si no hay nada en pipeline ni stats, probablemente el agente no está mapeado
  const stats = 'error' in today ? null : today
  const stalledData =
    'error' in stalled ? { threshold_days: 14, people: [] } : stalled
  const tasksData = 'error' in tasks ? { tasks: [] } : tasks
  const pipelineData = 'error' in pipeline ? { columns: [] } : pipeline
  const hotData = 'error' in hot ? { people: [] } : hot
  const goalsData = 'error' in goalsRes ? null : goalsRes.goals

  const noData =
    !stats &&
    pipelineData.columns.every((c) => c.count === 0) &&
    hotData.people.length === 0

  if (noData) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-3xl mb-2">🔗</div>
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">
            Follow Up Boss no está sincronizado todavía
          </h3>
          <p className="text-xs text-neutral-500">
            Pídele a un admin que abra <code className="rounded bg-neutral-100 px-1.5 py-0.5">/admin/fub</code>{' '}
            y pulse <em>Resync forzado</em>.
          </p>
        </div>
      </div>
    )
  }

  const tasksNormalized = tasksData.tasks.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    due_at: t.due_at,
    status: t.status,
    is_overdue: t.is_overdue,
    person_id: t.person_id,
    person_name: t.person_name ?? null,
  }))

  return (
    <div className="space-y-4">
      <ActivityStatsBar
        today={stats}
        week={'error' in week ? null : week}
        month={'error' in month ? null : month}
        goals={goalsData}
      />
      <PipelineKanban columns={pipelineData.columns} compact />
      <div className="grid gap-4 md:grid-cols-2">
        <HotList people={hotData.people} />
        <StalledLeads threshold_days={stalledData.threshold_days} people={stalledData.people} />
      </div>
      <TodayTasks tasks={tasksNormalized} />
    </div>
  )
}
