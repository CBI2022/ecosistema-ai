import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PropertyList } from '@/features/properties/components/PropertyList'

export const dynamic = 'force-dynamic'

export default async function MyPropertiesPage() {
  const t = await getTranslations('shell.properties')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isElevated = profile?.role === 'admin' || profile?.role === 'secretary'

  // Agentes ven SOLO sus propias propiedades; admin/secretary ven todas.
  const query = admin
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(isElevated ? 200 : 50)
  if (!isElevated) query.eq('agent_id', user.id)
  const { data: properties } = await query

  // Mapa de agentes (solo para admin/secretary, para mostrar quién subió cada una)
  let agentsMap: Record<string, { full_name: string | null; email: string }> | null = null
  if (isElevated && properties && properties.length > 0) {
    const ids = Array.from(new Set(properties.map((p) => p.agent_id).filter(Boolean)))
    if (ids.length > 0) {
      const { data: agents } = await admin.from('profiles').select('id, full_name, email').in('id', ids)
      agentsMap = Object.fromEntries((agents || []).map((a) => [a.id, { full_name: a.full_name, email: a.email }]))
    }
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          {isElevated ? t('listTitleAll') : t('listTitleMine')}
        </h1>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A84C]/30 px-4 py-2 text-[13px] font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t('backToUpload')}
        </Link>
      </div>

      {properties && properties.length > 0 ? (
        <PropertyList properties={properties} agentsMap={agentsMap} listTitle=" " />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-10 text-center text-sm text-[#9A9080]">
          {t('emptyMine')}
        </div>
      )}
    </div>
  )
}
