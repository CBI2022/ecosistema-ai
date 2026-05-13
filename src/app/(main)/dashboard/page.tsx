import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/features/dashboard/services/dashboard'
import { StatCards } from '@/features/dashboard/components/StatCards'
import { RevenueChart } from '@/features/dashboard/components/RevenueChart'
import { TodaysChecklist } from '@/features/dashboard/components/TodaysChecklist'
import { PhotoShootsSection } from '@/features/dashboard/components/PhotoShootsSection'
import { ExclusiveHomesManager } from '@/features/dashboard/components/ExclusiveHomesManager'
import { AgentPhotosGallery } from '@/features/dashboard/components/AgentPhotosGallery'
import { TeamViewToggle } from '@/features/dashboard/components/TeamViewToggle'
import { ChecklistReminder } from '@/features/dashboard/components/ChecklistReminder'
import { PhotosDeliveredBanner } from '@/features/dashboard/components/PhotosDeliveredBanner'
import { getTodaysChecklistDone } from '@/actions/daily-checklist'
import { getDeliveredShootsForAgent } from '@/actions/photo-shoots'
import { FubDashboardSection } from '@/features/fub/components/FubDashboardSection'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, first_name, full_name')
    .eq('id', user.id)
    .single()

  // El fotógrafo tiene su propia vista — no entra al dashboard del agente.
  if (profile?.role === 'photographer') redirect('/photographer')

  const canManage = profile?.role === 'admin' || profile?.role === 'secretary'
  const params = await searchParams
  const teamView = canManage && params.view === 'team'

  const [data, { data: agentPhotos }, checklistDone, deliveredShoots] = await Promise.all([
    getDashboardData(user.id, teamView),
    supabase
      .from('property_photos')
      .select('id, storage_path, file_name, is_drone, sort_order, created_at')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24),
    getTodaysChecklistDone(),
    getDeliveredShootsForAgent(),
  ])

  // Propiedades del agente para el banner de fotos entregadas (cualquier estado, recientes)
  const { data: draftPropsRaw } = teamView
    ? { data: [] }
    : await admin
        .from('properties')
        .select('id, reference, zone, property_type, street_name')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
  const draftProperties = (draftPropsRaw || []) as Array<{
    id: string
    reference: string | null
    zone: string | null
    property_type: string | null
    street_name: string | null
  }>

  return (
    <div>
      {canManage && <TeamViewToggle teamView={teamView} />}

      {!teamView && (
        <PhotosDeliveredBanner
          deliveries={deliveredShoots}
          draftProperties={draftProperties}
        />
      )}

      <StatCards
        thisMonthRevenue={data.thisMonthRevenue}
        monthlyGoal={data.monthlyGoal}
        ytdRevenue={data.ytdRevenue}
        annualGoal={data.annualGoal}
        totalClosings={data.totalClosings}
        currentMonth={data.currentMonth}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div>
          <RevenueChart
            data={data.monthlyRevenue}
            annualGoal={data.annualGoal}
            currentMonth={data.currentMonth}
            sales={data.sales}
            canEdit={!teamView}
          />
          <AgentPhotosGallery photos={agentPhotos || []} />
          <PhotoShootsSection shoots={data.photoShoots} />
        </div>

        <div>
          <TodaysChecklist goals={data.goals} initialDone={checklistDone} />
          <ExclusiveHomesManager homes={data.exclusiveHomes} canManage={canManage} />
        </div>
      </div>

      {/* Follow Up Boss CRM — pipeline, actividad, hot list, stalled, tareas */}
      <div className="mt-6">
        <FubDashboardSection />
      </div>

      <ChecklistReminder />
    </div>
  )
}
