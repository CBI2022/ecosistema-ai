'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `avatars/${user.id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('property-photos')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path)

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, avatarUrl: publicUrl }
}

// Primer login forzado: cambia email + password y desactiva el flag
// CRÍTICO: usa admin API para bypassear email confirmation (si no, el email queda en pending)
export async function changeInitialCredentials(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newEmail = String(formData.get('email') || '').trim().toLowerCase()
  const newPassword = String(formData.get('password') || '')

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: 'Email inválido' }
  }
  if (newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' }
  }

  const admin = createAdminClient()

  // Update auth.users via admin API (email directo + password, sin confirmación)
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    password: newPassword,
    email_confirm: true, // marca el email como ya confirmado
  })
  if (authError) return { error: 'No se pudo actualizar credenciales: ' + authError.message }

  // Update profiles row para mantener sincronía + desactivar flag
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      email: newEmail,
      must_change_credentials: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Invalidar la sesión actual para forzar re-login con nuevas credenciales
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  return { success: true }
}

// Settings: actualizar email (usa admin API para bypassear confirmation email)
export async function updateEmail(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newEmail = String(formData.get('email') || '').trim().toLowerCase()
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: 'Email inválido' }
  }

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error } = await admin
    .from('profiles')
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Settings: actualizar password
export async function updateUserPassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newPassword = String(formData.get('password') || '')
  if (newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

// Settings: actualizar datos del perfil (nombre, teléfono)
export async function updateProfileDetails(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fullName = String(formData.get('full_name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: fullName || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
