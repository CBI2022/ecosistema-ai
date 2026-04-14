import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserGoals } from '@/types/database'

/**
 * @param userId - el usuario actual (para goals/shoots propios)
 * @param teamView - si true y el usuario es admin/secretary, agrega ventas de TODO el equipo
 */
export async function getDashboardData(userId: string, teamView = false) {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Sales this year — propias o del equipo según flag
  const salesClient = teamView ? createAdminClient() : supabase
  const salesQuery = salesClient
    .from('sales')
    .select('*')
    .gte('closing_date', `${currentYear}-01-01`)
    .order('closing_date', { ascending: true })

  const { data: sales } = teamView
    ? await salesQuery
    : await salesQuery.eq('agent_id', userId)

  // User goals (o suma de goals del equipo en teamView)
  let goals: Partial<UserGoals> | null = null

  if (teamView) {
    // Suma de goals de todos los agentes activos
    const admin = createAdminClient()
    const { data: teamGoals } = await admin
      .from('user_goals')
      .select('monthly_income_goal, closings_per_month, listings_per_month, appointments_per_week, calls_per_day, followups_per_day, annual_revenue_goal')

    const aggregate = (teamGoals || []).reduce(
      (acc, g) => ({
        monthly_income_goal: acc.monthly_income_goal + (g.monthly_income_goal || 0),
        closings_per_month: acc.closings_per_month + (g.closings_per_month || 0),
        listings_per_month: acc.listings_per_month + (g.listings_per_month || 0),
        appointments_per_week: acc.appointments_per_week + (g.appointments_per_week || 0),
        calls_per_day: acc.calls_per_day + (g.calls_per_day || 0),
        followups_per_day: acc.followups_per_day + (g.followups_per_day || 0),
        annual_revenue_goal: acc.annual_revenue_goal + (g.annual_revenue_goal || 0),
      }),
      { monthly_income_goal: 0, closings_per_month: 0, listings_per_month: 0, appointments_per_week: 0, calls_per_day: 0, followups_per_day: 0, annual_revenue_goal: 0 }
    )
    goals = aggregate
  } else {
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    goals = data
  }

  // Photo shoots (recent)
  const { data: photoShoots } = await supabase
    .from('photo_shoots')
    .select('*')
    .eq('agent_id', userId)
    .order('shoot_date', { ascending: false })
    .limit(10)

  // Exclusive homes
  const { data: exclusiveHomes } = await supabase
    .from('exclusive_homes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6)

  // Process monthly revenue
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthSales = (sales || []).filter((s) => {
      const d = new Date(s.closing_date)
      return d.getMonth() + 1 === month
    })
    return {
      month: new Date(currentYear, i, 1).toLocaleString('en', {
        month: 'short',
      }),
      revenue: monthSales.reduce((sum, s) => sum + (s.commission || 0), 0),
      closings: monthSales.length,
    }
  })

  const thisMonthRevenue =
    monthlyRevenue[currentMonth - 1]?.revenue ?? 0
  const ytdRevenue = monthlyRevenue
    .slice(0, currentMonth)
    .reduce((sum, m) => sum + m.revenue, 0)
  const annualGoal = goals?.annual_revenue_goal ?? 0
  const totalClosings = (sales || []).length

  return {
    monthlyRevenue,
    thisMonthRevenue,
    ytdRevenue,
    annualGoal,
    totalClosings,
    goals,
    sales: sales || [],
    photoShoots: photoShoots || [],
    exclusiveHomes: exclusiveHomes || [],
    monthlyGoal: goals?.monthly_income_goal ?? 0,
    currentMonth,
  }
}
