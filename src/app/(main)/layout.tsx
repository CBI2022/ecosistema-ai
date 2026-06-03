import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/shared/components/AppHeader'
import { AppNav } from '@/shared/components/AppNav'
import { ViewAsBar } from '@/shared/components/ViewAsBar'
import { VIEW_AS_COOKIE, PREVIEWABLE_ROLES } from '@/lib/view-as'
import { RouteTransitionOverlay } from '@/shared/components/RouteTransitionOverlay'
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

  // Onboarding desactivado temporalmente (2026-04-22): Marco quiere definirlo
  // con Darcy/Bruno antes de mostrarlo a usuarios reales. Preview público
  // disponible en /onboarding-preview para revisarlo sin loguearse.
  // Cuando se decida la versión final, reactivar este bloque.
  // if (profile.role === 'agent') {
  //   const { data: goals } = await supabase
  //     .from('user_goals')
  //     .select('id')
  //     .eq('user_id', user.id)
  //     .single()
  //   if (!goals) redirect('/onboarding')
  // }

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

  // "Ver como": un admin puede previsualizar la app con la vista de otro rol.
  // No cambia permisos ni datos: solo la navegación/aterrizaje que ve el admin.
  const cookieStore = await cookies()
  const viewAs = cookieStore.get(VIEW_AS_COOKIE)?.value
  const isAdmin = profile.role === 'admin'
  const effectiveRole = (isAdmin && viewAs && PREVIEWABLE_ROLES.includes(viewAs)
    ? viewAs
    : profile.role) as typeof profile.role

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <AppHeader profile={profile} notifCount={notifCount} />
      {isAdmin && <ViewAsBar current={effectiveRole} />}
      <AppNav role={effectiveRole} notifCount={notifCount} />
      <main className="mx-auto max-w-[1400px] px-3 py-4 pb-bottom-nav sm:px-6 sm:py-6 md:pb-6 lg:px-8">
        {children}
      </main>
      {profile.must_change_credentials && (
        <FirstLoginModal currentEmail={profile.email} />
      )}
      <RouteTransitionOverlay />
    </div>
  )
}
