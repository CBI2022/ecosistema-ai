'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'
import type { UserRole } from '@/types/database'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'Email o contraseña incorrectos' }
  }

  // Usar admin client para bypassear RLS en la verificación de estado
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('status, role')
    .eq('id', data.user.id)
    .single()

  if (profile?.status === 'pending') {
    await supabase.auth.signOut()
    redirect('/pending-approval')
  }

  if (profile?.status === 'rejected') {
    await supabase.auth.signOut()
    redirect('/account-rejected')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const role = formData.get('role') as UserRole
  const fullName = formData.get('full_name') as string

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        role: role || 'agent',
        full_name: fullName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este email ya está registrado' }
    }
    return { error: error.message }
  }

  redirect('/pending-approval')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Solo admins: aprobar cuenta
export async function approveUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: 'No autorizado' }
  }

  const { error } = await admin
    .from('profiles')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { error: error.message }

  // Marcar notificación como leída
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('target_user_id', userId)

  // Notificación push al nuevo usuario aprobado
  await sendPushToUser(userId, {
    title: '🎉 Bienvenido a CBI',
    body: 'Tu cuenta ha sido aprobada. Ya puedes entrar al dashboard.',
    url: '/dashboard',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

// Solo admins: rechazar cuenta
export async function rejectUser(userId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: 'No autorizado' }
  }

  const { error } = await admin
    .from('profiles')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('target_user_id', userId)

  revalidatePath('/', 'layout')
  return { success: true }
}
