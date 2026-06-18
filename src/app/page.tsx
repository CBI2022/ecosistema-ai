import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function HomePage() {
  // La raíz redirige según el rol — el fotógrafo (Jelle) no debe ver el dashboard del agente.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Fase 1: el inicio ya no es el dashboard.
  //  - agente y admin → directos a subir propiedad
  //  - secretaría (Chloe) → su bandeja de propiedades recibidas
  //  - fotógrafo → su calendario  ·  resto (dc) → dashboard
  if (profile?.role === 'photographer') redirect('/photographer')
  if (profile?.role === 'secretary') redirect('/inbox')
  if (profile?.role === 'agent' || profile?.role === 'admin') redirect('/properties')
  // Director Comercial: rol sin definir todavía → solo su cuenta.
  if (profile?.role === 'dc') redirect('/dc')
  // Foco actual: toda la app gira en torno a publicar propiedades.
  redirect('/properties')
}
