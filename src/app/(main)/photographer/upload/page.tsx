import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PhotographerUpload } from '@/features/photographer/components/PhotographerUpload'

export default async function PhotographerUploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: agents } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'approved')
    .in('role', ['agent', 'admin'])

  const { data: shoots } = await admin
    .from('photo_shoots')
    .select('id, property_address, property_reference, agent_id')
    .eq('status', 'scheduled')
    .order('shoot_date', { ascending: true })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Upload Photos</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          Associate photos with a property reference and agent
        </p>
      </div>
      <PhotographerUpload agents={agents || []} shoots={shoots || []} photographerId={user.id} />
    </div>
  )
}
