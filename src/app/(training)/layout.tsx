import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RouteTransitionOverlay } from '@/shared/components/RouteTransitionOverlay'
import './training.css'

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending-approval')

  return (
    <div className="training-root">
      {children}
      <RouteTransitionOverlay />
    </div>
  )
}
