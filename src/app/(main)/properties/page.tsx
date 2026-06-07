import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PropertyForm } from '@/features/properties/components/PropertyForm'

interface PropertiesPageProps {
  searchParams: Promise<{ edit?: string }>
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const t = await getTranslations('shell.properties')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const editId = params.edit

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const isElevated = profile?.role === 'admin' || profile?.role === 'secretary'

  const editProp = editId
    ? await (isElevated
        ? admin.from('properties').select('*').eq('id', editId).maybeSingle()
        : admin.from('properties').select('*').eq('id', editId).eq('agent_id', user.id).maybeSingle()
      ).then((r) => r.data)
    : null

  // Al editar un borrador, prellenamos el propietario para no perder info.
  const initialOwner = editProp?.owner_id
    ? await admin.from('owners').select('full_name, phone, email').eq('id', editProp.owner_id).maybeSingle().then((r) => r.data)
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#F5F0E8]">
            {editProp ? t('editTitle') : t('newTitle')}
          </h1>
          <p className="mt-1 text-sm text-[#9A9080]">
            {editProp ? t('editSubtitle') : t('newSubtitle')}
          </p>
        </div>
        <Link
          href="/properties/mine"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A84C]/30 px-4 py-2 text-[13px] font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
        >
          {t('myPropertiesLink')}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      <PropertyForm initialProperty={editProp} />
    </div>
  )
}
