import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RoadmapsView } from '@/features/roadmaps/components/RoadmapsView'
import { ROADMAPS } from '@/features/roadmaps/data/roadmaps'

export default async function RoadmapsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">RoadMaps</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          Registro de todos nuestros planes de acción. El cómo, el tiempo y las expectativas, siempre a la vista.
        </p>
      </div>
      <RoadmapsView roadmaps={ROADMAPS} />
    </div>
  )
}
