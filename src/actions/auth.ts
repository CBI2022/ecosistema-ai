'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'
import { sendEmail } from '@/lib/email/resend'
import { forgotPasswordEmail, signupApprovedEmail, signupRejectedEmail } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/site-url'
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
  const role = (formData.get('role') as UserRole) || 'agent'
  const fullName = formData.get('full_name') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios' }
  }

  // Crear usuario via admin (server-side) con email auto-confirmado.
  // De este modo Supabase NO envía email de confirmación — el flujo de
  // aprobación lo controla el admin desde /admin (Bruno/Darcy aprueban).
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  })

  if (error || !data?.user) {
    if (error?.message?.toLowerCase().includes('already')) {
      return { error: 'Este email ya está registrado' }
    }
    return { error: error?.message ?? 'No se pudo crear la cuenta' }
  }

  // Asegurar que el perfil queda en estado pending hasta aprobación admin.
  // El trigger on_auth_user_created suele crear el profile; lo upserteamos defensivamente.
  await admin.from('profiles').upsert(
    {
      id: data.user.id,
      email,
      full_name: fullName ?? null,
      role,
      status: 'pending',
    },
    { onConflict: 'id' },
  )

  // Notificar a admins (Bruno/Darcy) de la nueva solicitud
  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'approved')

  if (admins && admins.length > 0) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        type: 'signup_request',
        title: '👤 Nueva solicitud de acceso',
        message: `${fullName ?? email} ha solicitado acceso como ${role}. Apruébalo desde /admin.`,
        target_user_id: a.id,
        is_read: false,
      })),
    )
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

  const siteUrl = getSiteUrl()
  const admin = createAdminClient()

  // Generamos el hashed_token de recovery via Supabase Admin (no envía email).
  // Después construimos NUESTRO propio link a /reset?token_hash=<token> con
  // el dominio canonical, sin depender de la URL Configuration de Supabase.
  // /reset valida el token con verifyOtp y permite cambiar la contraseña.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/reset` },
  })

  // Anti-enumeration: si el email no existe, devolvemos success igual sin email.
  if (linkError || !linkData?.properties?.hashed_token) {
    console.warn('[resetPassword] no link generado para', email, linkError?.message)
    return { success: true }
  }

  const ourLink = `${siteUrl}/reset?token_hash=${linkData.properties.hashed_token}`
  const tpl = forgotPasswordEmail(ourLink)
  const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })

  if (!result.ok) {
    // Fallback: usar el flujo nativo de Supabase (SMTP por defecto, rate-limited)
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset`,
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

  // Email de bienvenida
  const { data: approved } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  if (approved?.email) {
    const tpl = signupApprovedEmail(approved.full_name ?? 'agente', `${getSiteUrl()}/login`)
    await sendEmail({ to: approved.email, subject: tpl.subject, html: tpl.html })
  }

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

  // Email de rechazo (gentil)
  const { data: rejected } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  if (rejected?.email) {
    const tpl = signupRejectedEmail(rejected.full_name ?? 'agente')
    await sendEmail({ to: rejected.email, subject: tpl.subject, html: tpl.html })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
