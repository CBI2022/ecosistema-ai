import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompetitorsTracker } from '@/features/competitors/components/CompetitorsTracker'

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .order('zone', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Competitors</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Track agencies and agents by zone · Click WhatsApp to contact directly</p>
      </div>
      <CompetitorsTracker competitors={competitors || []} />
    </div>
  )
}
