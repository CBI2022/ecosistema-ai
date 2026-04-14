import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getOrCreateWeeklyPlan,
  getLeaderboard,
  getWeekStart,
} from '@/features/kpi/services/kpi'
import { DailyPlan } from '@/features/kpi/components/DailyPlan'
import { Leaderboard } from '@/features/kpi/components/Leaderboard'

export default async function KpiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: goals } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const weekStart = getWeekStart()
  const [planItems, leaderboard] = await Promise.all([
    getOrCreateWeeklyPlan(user.id, weekStart, goals),
    getLeaderboard(new Date().getFullYear()),
  ])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <DailyPlan items={planItems} weekStart={weekStart} />
      <Leaderboard
        agents={leaderboard}
        currentYear={new Date().getFullYear()}
      />
    </div>
  )
}
