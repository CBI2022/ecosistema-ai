import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getAgentPipeline,
  getAgentHotList,
  getAgentStalledLeads,
  getAgentActivityStats,
  getAgentGoals,
} from '@/actions/fub-stats'
import { PipelineKanban } from '@/features/fub/components/PipelineKanban'
import { HotList } from '@/features/fub/components/HotList'
import { StalledLeads } from '@/features/fub/components/StalledLeads'
import { ActivityStatsBar } from '@/features/fub/components/ActivityStatsBar'
import { LeadDetailPanel } from '@/features/fub/components/LeadDetailPanel'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const personId = params.personId ? Number(params.personId) : null

  const [pipeline, hot, stalled, today, week, month, goalsRes] = await Promise.all([
    getAgentPipeline({ includeBranches: true, limitPerStage: 100 }),
    getAgentHotList(20),
    getAgentStalledLeads(14, 30),
    getAgentActivityStats('today'),
    getAgentActivityStats('week'),
    getAgentActivityStats('month'),
    getAgentGoals(),
  ])

  const goalsData = 'error' in goalsRes ? null : goalsRes.goals

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Tu pipeline completo en Follow Up Boss</p>
        </div>
      </header>

      <ActivityStatsBar
        today={'error' in today ? null : today}
        week={'error' in week ? null : week}
        month={'error' in month ? null : month}
        goals={goalsData}
      />

      {personId && <LeadDetailPanel personId={personId} />}

      <PipelineKanban
        columns={'error' in pipeline ? [] : pipeline.columns}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <HotList people={'error' in hot ? [] : hot.people} />
        <StalledLeads
          threshold_days={'error' in stalled ? 14 : stalled.threshold_days}
          people={'error' in stalled ? [] : stalled.people}
        />
      </div>
    </div>
  )
}
