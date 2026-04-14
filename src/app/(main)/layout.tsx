import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/shared/components/AppHeader'
import { AppNav } from '@/shared/components/AppNav'
import { FirstLoginModal } from '@/features/auth/components/FirstLoginModal'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Admin client para bypassear RLS — garantiza que siempre encontramos el perfil
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status === 'pending') redirect('/pending-approval')
  if (profile.status === 'rejected') redirect('/account-rejected')

  // Admins no necesitan onboarding
  if (profile.role !== 'admin' && profile.role !== 'photographer') {
    const { data: goals } = await supabase
      .from('user_goals')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!goals) redirect('/onboarding')
  }

  // Unread notifications badge — admins ven globales, el resto las suyas propias
  let notifCount = 0
  {
    const query = admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    const { count } =
      profile.role === 'admin'
        ? await query
        : await query.eq('target_user_id', user.id)
    notifCount = count ?? 0
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <AppHeader profile={profile} notifCount={notifCount} />
      <AppNav role={profile.role} notifCount={notifCount} />
      <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
      {profile.must_change_credentials && (
        <FirstLoginModal currentEmail={profile.email} />
      )}
    </div>
  )
}
