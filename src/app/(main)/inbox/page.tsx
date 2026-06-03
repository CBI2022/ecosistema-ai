import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PropertyInbox, type InboxItem } from '@/features/properties/components/PropertyInbox'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const t = await getTranslations('shell.inbox')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'secretary' && profile?.role !== 'admin') redirect('/dashboard')

  // Propiedades enviadas por los agentes (pendientes + ya subidas)
  const { data: props } = await adminClient
    .from('properties')
    .select('*')
    .in('review_status', ['submitted', 'published'])
    .order('submitted_at', { ascending: false })

  const list = props || []
  const agentIds = Array.from(new Set(list.map((p) => p.agent_id).filter(Boolean)))

  const agentMap = new Map<string, string>()
  if (agentIds.length > 0) {
    const { data: agents } = await adminClient
      .from('profiles')
      .select('id, full_name, first_name, last_name, email')
      .in('id', agentIds)
    for (const a of agents || []) {
      agentMap.set(a.id, a.full_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || 'Agente')
    }
  }

  const items: InboxItem[] = list.map((p) => ({
    ...p,
    agentName: (p.agent_id && agentMap.get(p.agent_id)) || 'Agente',
  }))

  return (
    <div className="pb-24 md:pb-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          {t('subtitle')}
        </p>
      </div>
      <PropertyInbox items={items} />
    </div>
  )
}
