import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminOverview } from '@/features/admin/components/AdminOverview'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') redirect('/dashboard')

  const year = new Date().getFullYear()

  const [{ data: agents }, { data: sales }] = await Promise.all([
    adminClient.from('profiles')
      .select('id, full_name, email, role, status')
      .in('role', ['agent', 'secretary'])
      .eq('status', 'approved'),
    adminClient.from('sales')
      .select('id, agent_id, property_address, commission, closing_date')
      .gte('closing_date', `${year}-01-01`)
      .order('closing_date', { ascending: false })
      .limit(30),
  ])

  // Calcular revenue/closings por agente
  const agentMetrics = (agents || []).map((agent) => {
    const agentSales = (sales || []).filter((s) => s.agent_id === agent.id)
    return {
      ...agent,
      revenue: agentSales.reduce((sum, s) => sum + (s.commission || 0), 0),
      closings: agentSales.length,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Admin Overview</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Métricas del equipo · Editar ventas · {year}</p>
      </div>
      <AdminOverview
        agents={agentMetrics}
        recentSales={sales || []}
        year={year}
      />
    </div>
  )
}
