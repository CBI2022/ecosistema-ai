import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserGoals } from '@/types/database'

export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const
type Day = (typeof DAYS)[number]

function buildTasks(goals: UserGoals | null) {
  const calls = goals?.calls_per_day ?? 20
  const followups = goals?.followups_per_day ?? 15
  const appts = goals?.appointments_per_week ?? 5

  return [
    // Priority: Must Do
    {
      category: 'must_do',
      label: 'Power Hour — Start Before 9AM',
      emoji: '⚡',
    },
    {
      category: 'must_do',
      label: `Make ${calls} prospecting calls`,
      emoji: '📞',
    },
    {
      category: 'must_do',
      label: `Send ${followups} follow-ups`,
      emoji: '🔄',
    },
    {
      category: 'must_do',
      label: 'Respond to new leads in under 5 min',
      emoji: '⚡',
    },
    {
      category: 'must_do',
      label: 'Prospect for 1 new listing',
      emoji: '🏠',
    },
    {
      category: 'must_do',
      label: `Book ${Math.ceil(appts / 5)} appointment(s) today`,
      emoji: '📅',
    },
    // Complete the Day
    { category: 'complete', label: 'Confirm all viewings for today', emoji: '🏡' },
    { category: 'complete', label: 'Prepare viewing pack for each client', emoji: '📋' },
    { category: 'complete', label: 'Update every deal in the pipeline', emoji: '💾' },
    { category: 'complete', label: 'Move at least 1 deal forward', emoji: '🔁' },
    { category: 'complete', label: 'Post 1 piece of content on Instagram', emoji: '📸' },
    { category: 'complete', label: 'Ask 1 happy client for a Google review', emoji: '⭐' },
    {
      category: 'complete',
      label: `Prepare tomorrow's call list — ${calls} names`,
      emoji: '🗒️',
    },
    {
      category: 'complete',
      label: 'End-of-day debrief — 3 wins, 1 lesson',
      emoji: '🎯',
    },
  ]
}

export async function getOrCreateWeeklyPlan(
  userId: string,
  weekStart: string,
  goals: UserGoals | null
) {
  const supabase = await createClient()

  // Filtrar SOLO el plan semanal de KPI (must_do / complete),
  // ignorando los items del checklist diario del Dashboard que usan
  // prefijo 'daily:' en la misma tabla.
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .in('category', ['must_do', 'complete'])
    .order('created_at')

  if (existing && existing.length > 0) return existing

  // Create week's tasks for all 5 days
  const tasks = buildTasks(goals)
  const inserts: Array<{
    user_id: string
    week_start: string
    day_of_week: string
    category: string
    label: string
    target: number
    completed: number
    is_done: boolean
  }> = []

  for (const day of DAYS) {
    for (const task of tasks) {
      inserts.push({
        user_id: userId,
        week_start: weekStart,
        day_of_week: day,
        category: task.category,
        label: task.label,
        target: 1,
        completed: 0,
        is_done: false,
      })
    }
  }

  const { data: created } = await supabase
    .from('checklist_items')
    .insert(inserts)
    .select()

  return created || []
}

export async function getLeaderboard(year?: number) {
  const admin = createAdminClient()
  const targetYear = year ?? new Date().getFullYear()

  const { data: agents } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('status', 'approved')
    .in('role', ['agent', 'admin', 'secretary'])

  if (!agents) return []

  // Get all sales for target year
  const { data: sales } = await admin
    .from('sales')
    .select('agent_id, commission, sale_price')
    .gte('closing_date', `${targetYear}-01-01`)
    .lte('closing_date', `${targetYear}-12-31`)

  const agentMap = new Map<
    string,
    { revenue: number; closings: number }
  >()
  for (const agent of agents) {
    agentMap.set(agent.id, { revenue: 0, closings: 0 })
  }
  for (const sale of sales || []) {
    const curr = agentMap.get(sale.agent_id) ?? { revenue: 0, closings: 0 }
    agentMap.set(sale.agent_id, {
      revenue: curr.revenue + (sale.commission || 0),
      closings: curr.closings + 1,
    })
  }

  return agents
    .map((agent) => ({
      ...agent,
      revenue: agentMap.get(agent.id)?.revenue ?? 0,
      closings: agentMap.get(agent.id)?.closings ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}
