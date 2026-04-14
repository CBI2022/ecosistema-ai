'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getLeaderboardByYear(year: number) {
  const admin = createAdminClient()

  const { data: agents } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('status', 'approved')
    .in('role', ['agent', 'admin', 'secretary'])

  if (!agents) return []

  const { data: sales } = await admin
    .from('sales')
    .select('agent_id, commission')
    .gte('closing_date', `${year}-01-01`)
    .lte('closing_date', `${year}-12-31`)

  const agentMap = new Map<string, { revenue: number; closings: number }>()
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
