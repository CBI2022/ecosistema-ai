'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIEW_AS_COOKIE, PREVIEWABLE_ROLES } from '@/lib/view-as'

// Cookie de "Ver como": permite a un ADMIN previsualizar la app con la vista
// de otro rol (agente, secretaria, fotógrafo, dc). NO cambia el rol real ni
// los permisos: solo afecta a la navegación/aterrizaje que ve el admin.
const PREVIEWABLE = PREVIEWABLE_ROLES

export async function setViewAs(role: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo los administradores pueden cambiar de vista' }

  const cookieStore = await cookies()
  if (!role || !PREVIEWABLE.includes(role)) {
    cookieStore.delete(VIEW_AS_COOKIE)
  } else {
    cookieStore.set(VIEW_AS_COOKIE, role, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
