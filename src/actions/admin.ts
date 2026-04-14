'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Secretary / Admin: editar una venta de cualquier agente
export async function updateSaleRevenue(saleId: string, commission: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') return { error: 'Not authorized' }

  const { error } = await admin.from('sales').update({ commission }).eq('id', saleId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/kpi')
  return { success: true }
}

// Admin: obtener métricas de todos los agentes
export async function getAllAgentsMetrics(year: number) {
  const admin = createAdminClient()

  const [{ data: agents }, { data: sales }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, status, created_at').in('role', ['agent', 'secretary']).eq('status', 'approved'),
    admin.from('sales').select('agent_id, commission, closing_date').gte('closing_date', `${year}-01-01`).lte('closing_date', `${year}-12-31`),
  ])

  return (agents || []).map((agent) => {
    const agentSales = (sales || []).filter((s) => s.agent_id === agent.id)
    const revenue = agentSales.reduce((sum, s) => sum + (s.commission || 0), 0)
    const closings = agentSales.length
    return { ...agent, revenue, closings }
  }).sort((a, b) => b.revenue - a.revenue)
}
