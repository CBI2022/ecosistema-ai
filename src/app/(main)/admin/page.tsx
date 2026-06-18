import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AdminOverview } from '@/features/admin/components/AdminOverview'
import { PendingApprovals } from '@/features/admin/components/PendingApprovals'

export default async function AdminPage() {
  const t = await getTranslations('shell.admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') redirect('/dashboard')

  const isAdmin = profile?.role === 'admin'
  const year = new Date().getFullYear()

  const [{ data: agents }, { data: sales }, { data: pendingUsers }] = await Promise.all([
    adminClient.from('profiles')
      .select('id, full_name, email, role, status')
      .in('role', ['agent', 'secretary'])
      .eq('status', 'approved'),
    adminClient.from('sales')
      .select('id, agent_id, property_address, commission, closing_date')
      .gte('closing_date', `${year}-01-01`)
      .order('closing_date', { ascending: false })
      .limit(30),
    // Solo los admins aprueban accesos (la secretaria no)
    isAdmin
      ? adminClient.from('profiles')
          .select('id, full_name, email, role, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string; role: string; created_at: string }> }),
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
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[#9A9080]">{t('subtitle', { year })}</p>
      </div>
      {isAdmin && (pendingUsers?.length ?? 0) > 0 && (
        <div className="mb-6">
          <PendingApprovals pendingUsers={pendingUsers || []} />
        </div>
      )}
      <AdminOverview
        agents={agentMetrics}
        recentSales={sales || []}
        year={year}
      />
    </div>
  )
}
