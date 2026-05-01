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
import { MotivationalBanner } from '@/features/dashboard/components/MotivationalBanner'
import { TeamViewToggle } from '@/features/dashboard/components/TeamViewToggle'
import { ChecklistReminder } from '@/features/dashboard/components/ChecklistReminder'
import { getTodaysChecklistDone } from '@/actions/daily-checklist'

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

  const canManage = profile?.role === 'admin' || profile?.role === 'secretary'
  const params = await searchParams
  const teamView = canManage && params.view === 'team'

  const [data, { data: agentPhotos }, { data: motivation }, checklistDone] = await Promise.all([
    getDashboardData(user.id, teamView),
    supabase
      .from('property_photos')
      .select('id, storage_path, file_name, is_drone, sort_order, created_at')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24),
    admin
      .from('user_motivation')
      .select('motto, why')
      .eq('user_id', user.id)
      .maybeSingle(),
    getTodaysChecklistDone(),
  ])

  const firstName =
    profile?.first_name ||
    (profile?.full_name?.split(' ')[0] ?? null)

  return (
    <div>
      <MotivationalBanner
        firstName={firstName}
        motto={motivation?.motto ?? null}
        why={motivation?.why ?? null}
      />

      {canManage && <TeamViewToggle teamView={teamView} />}

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

      <ChecklistReminder />
    </div>
  )
}
