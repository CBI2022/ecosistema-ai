import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { KnowledgeView } from '@/features/knowledge/components/KnowledgeView'

export default async function KnowledgePage() {
  const t = await getTranslations('shell.knowledge')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: folders }, { data: items }] = await Promise.all([
    adminClient.from('knowledge_folders').select('*').order('position', { ascending: true }),
    adminClient.from('knowledge_items').select('*').order('position', { ascending: true }),
  ])

  return (
    <div className="pb-24 md:pb-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          {t('subtitle')}
        </p>
      </div>
      <KnowledgeView
        initialFolders={folders || []}
        initialItems={items || []}
      />
    </div>
  )
}
