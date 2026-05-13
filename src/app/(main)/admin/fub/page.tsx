import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import {
  getActivityLeaderboard,
  getConversionFunnel,
  getSpeedToLead,
  getSourceROI,
  getCaptacionesPipeline,
  getStageTransitionStats,
} from '@/actions/fub-stats'
import { getFubHealth, listWebhookLog } from '@/actions/fub'
import { ActivityLeaderboard } from '@/features/fub/components/ActivityLeaderboard'
import { ConversionFunnel } from '@/features/fub/components/ConversionFunnel'
import { SpeedToLead } from '@/features/fub/components/SpeedToLead'
import { SourceROI } from '@/features/fub/components/SourceROI'
import { CaptacionesPipeline } from '@/features/fub/components/CaptacionesPipeline'
import { FubAdminPanel } from '@/features/fub/components/FubAdminPanel'

export default async function AdminFubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar admin: ya sea en profiles.role o fub_user_map.is_admin
  const admin = createAdminClient()
  const [{ data: profile }, { data: fubMap }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    admin.from('fub_user_map').select('is_admin').eq('cbi_user_id', user.id).maybeSingle(),
  ])
  const isAdmin = profile?.role === 'admin' || fubMap?.is_admin === true
  if (!isAdmin) redirect('/dashboard')

  const [
    leaderboard,
    funnelMonth,
    speed,
    sourceROI,
    captaciones,
    transitions,
    healthRes,
    webhookLogRes,
  ] = await Promise.all([
    getActivityLeaderboard('week'),
    getConversionFunnel('month'),
    getSpeedToLead('month'),
    getSourceROI('year'),
    getCaptacionesPipeline(),
    getStageTransitionStats('year'),
    getFubHealth(),
    listWebhookLog(50),
  ])

  // Listar mappings + perfiles para el panel admin
  const { data: mappings } = await admin
    .from('fub_user_map')
    .select('fub_user_id, cbi_user_id, fub_email, fub_role, is_admin, active')
    .order('fub_user_id', { ascending: true })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Follow Up Boss · Admin</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Métricas agregadas y operativa de la integración CRM.
          </p>
        </div>
      </header>

      {/* Health + Resync */}
      <FubAdminPanel
        health={'error' in healthRes ? null : healthRes}
        webhookLog={'error' in webhookLogRes ? [] : webhookLogRes.log}
        mappings={mappings ?? []}
        profiles={profiles ?? []}
      />

      {/* Métricas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ConversionFunnel
          scope="month"
          leads={'error' in funnelMonth ? 0 : funnelMonth.leads}
          appointments={'error' in funnelMonth ? 0 : funnelMonth.appointments}
          offers={'error' in funnelMonth ? 0 : funnelMonth.offers}
          closings={'error' in funnelMonth ? 0 : funnelMonth.closings}
          leadToAppt={'error' in funnelMonth ? 0 : funnelMonth.leadToAppt}
          apptToOffer={'error' in funnelMonth ? 0 : funnelMonth.apptToOffer}
          offerToClosing={'error' in funnelMonth ? 0 : funnelMonth.offerToClosing}
        />
        <SpeedToLead
          scope="month"
          overall_median_min={'error' in speed ? null : speed.overall_median_min}
          sample_size={'error' in speed ? 0 : speed.sample_size}
          by_user={'error' in speed ? [] : speed.by_user}
        />
      </div>

      <ActivityLeaderboard rows={'error' in leaderboard ? [] : leaderboard.rows} scope="week" />

      <SourceROI scope="year" rows={'error' in sourceROI ? [] : sourceROI.rows} />

      <CaptacionesPipeline columns={'error' in captaciones ? [] : captaciones.columns} />

      {/* Stage transitions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Tiempo medio en cada stage</h3>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400">últimos 12 meses</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {('error' in transitions ? [] : transitions.rows).map((r) => (
            <div key={r.stage_id} className="rounded-lg border border-neutral-100 bg-neutral-50/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 truncate">{r.stage_name}</div>
              <div className="mt-1 text-xl font-bold text-neutral-900">
                {r.avg_days !== null ? `${r.avg_days}d` : '—'}
              </div>
              <div className="text-[10px] text-neutral-400">{r.sample_size} muestras</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
