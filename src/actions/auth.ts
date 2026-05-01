'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'
import { sendEmail } from '@/lib/email/resend'
import { forgotPasswordEmail } from '@/lib/email/templates'
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
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email requerido' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.costablancainvestments.com'
  const admin = createAdminClient()

  // Generamos el link de recovery desde Supabase Admin (no envía email)
  // y lo entregamos nosotros vía Resend con nuestro template y branding.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/update-password` },
  })

  // Si el email no existe, devolvemos success igual (anti-enumeration)
  // pero NO enviamos email — el atacante no debe poder distinguir.
  if (linkError || !linkData?.properties?.action_link) {
    console.warn('[resetPassword] no link generado para', email, linkError?.message)
    return { success: true }
  }

  const tpl = forgotPasswordEmail(linkData.properties.action_link)
  const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })

  if (!result.ok) {
    // Fallback: usar el flujo nativo de Supabase (SMTP por defecto, rate-limited)
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/update-password`,
    })
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
