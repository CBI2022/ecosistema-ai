import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { NotificationsPanel } from '@/features/notifications/components/NotificationsPanel'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: pendingUsers }, { data: notifications }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    admin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Notifications</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Manage account approvals and team activity</p>
      </div>
      <NotificationsPanel
        pendingUsers={pendingUsers || []}
        notifications={notifications || []}
      />
    </div>
  )
}
