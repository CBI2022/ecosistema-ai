'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'
import { mapPropertyToSooprema } from '@/lib/sooprema/mapper'
import { runSoopremaAutomation } from '@/lib/sooprema/automation'
import { audit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/resend'
import { soopremaDoneEmail, soopremaErrorEmail } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/site-url'
import type { Property } from '@/types/database'

export async function retrySoopremaJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('suprema_jobs')
    .update({
      status: 'queued',
      error_message: null,
      logs: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', jobId)

  if (error) return { error: error.message }
  await audit({ actor_id: user.id, actor_email: user.email, action: 'sooprema.retry', entity_type: 'suprema_jobs', entity_id: jobId })
  revalidatePath('/admin/sooprema')
  return { success: true }
}

export async function cancelSoopremaJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('suprema_jobs')
    .update({ status: 'error', error_message: 'Cancelled by admin' })
    .eq('id', jobId)
    .in('status', ['queued', 'running'])

  if (error) return { error: error.message }
  await audit({ actor_id: user.id, actor_email: user.email, action: 'sooprema.cancel', entity_type: 'suprema_jobs', entity_id: jobId })
  revalidatePath('/admin/sooprema')
  return { success: true }
}

/**
 * Ejecuta el job real de Sooprema con Playwright.
 * Requiere maxDuration alto (300s en Vercel Pro).
 */
export async function runSoopremaJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: job } = await admin
    .from('suprema_jobs')
    .select('*, properties(*)')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  const isPrivileged = callerProfile?.role === 'admin' || callerProfile?.role === 'secretary'
  if (!isPrivileged && job.agent_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const property = (job as Record<string, unknown>).properties as Property | null
  if (!property) return { error: 'Property data not found' }

  await admin
    .from('suprema_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      logs: ['Job started'],
    })
    .eq('id', jobId)

  try {
    let owner = null
    if (property.owner_id) {
      const { data: o } = await admin
        .from('owners')
        .select('first_name, last_name, full_name, email, phone, nif, sooprema_owner_id')
        .eq('id', property.owner_id)
        .single()
      owner = o
    }

    const { data: rawPhotos } = await admin
      .from('property_photos')
      .select('id, storage_path, is_drone, sort_order')
      .eq('property_id', property.id)
      .order('sort_order', { ascending: true })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const photos = (rawPhotos || []).map((p) => {
      const url = p.storage_path.startsWith('http')
        ? p.storage_path
        : `${supabaseUrl}/storage/v1/object/public/property-photos/${p.storage_path}`
      return {
        public_url: url,
        is_drone: p.is_drone,
        sort_order: p.sort_order,
      }
    })

    const { data: agentMap } = await admin
      .from('agent_sooprema_map')
      .select('sooprema_agent_id')
      .eq('profile_id', property.agent_id)
      .maybeSingle()

    const fields = mapPropertyToSooprema({
      property,
      owner,
      soopremaAgentId: agentMap?.sooprema_agent_id || null,
      photos,
    })

    const result = await runSoopremaAutomation(fields, { timeout: 60000 })

    const finalStatus = result.success ? 'done' : 'error'
    await admin
      .from('suprema_jobs')
      .update({
        status: finalStatus,
        logs: result.logs,
        error_message: result.error || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (result.success) {
      await admin
        .from('properties')
        .update({
          suprema_status: 'published',
          sooprema_external_id: result.sooprema_external_id || null,
          sooprema_public_url: result.sooprema_public_url || null,
        })
        .eq('id', property.id)

      await admin.from('notifications').insert({
        type: 'suprema_done',
        title: '✅ Propiedad publicada en Sooprema',
        message: `La propiedad ${property.reference || ''} está publicada. Referencia: ${property.reference}.`,
        target_user_id: property.agent_id,
        is_read: false,
      })
      await sendPushToUser(property.agent_id, {
        title: '✅ Propiedad publicada',
        body: `${property.reference || 'Tu propiedad'} está activa en Sooprema`,
        url: '/properties',
      })

      const { data: agentProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', property.agent_id)
        .single()
      if (agentProfile?.email) {
        const soopremaUrl = result.sooprema_public_url
          || `https://www.costablancainvestments.com/admin/propiedades/`
        const tpl = soopremaDoneEmail(property.reference || 'sin referencia', soopremaUrl)
        await sendEmail({ to: agentProfile.email, subject: tpl.subject, html: tpl.html })
      }
    } else {
      await admin
        .from('properties')
        .update({ suprema_status: 'error' })
        .eq('id', property.id)

      await admin.from('notifications').insert({
        type: 'suprema_error',
        title: '❌ Error publicando en Sooprema',
        message: `Falló la publicación de ${property.reference}: ${result.error || 'Ver logs'}`,
        target_user_id: property.agent_id,
        is_read: false,
      })
      await sendPushToUser(property.agent_id, {
        title: '❌ Error publicando',
        body: `${property.reference || 'Tu propiedad'} no se pudo publicar. Revisa /admin/sooprema.`,
        url: '/admin/sooprema',
      })

      const { data: agentProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', property.agent_id)
        .single()
      if (agentProfile?.email) {
        const tpl = soopremaErrorEmail(
          property.reference || 'sin referencia',
          result.error || 'Error desconocido — revisa los logs en /admin/sooprema',
          `${getSiteUrl()}/admin/sooprema`,
        )
        await sendEmail({ to: agentProfile.email, subject: tpl.subject, html: tpl.html })
      }
    }

    revalidatePath('/admin/sooprema')
    revalidatePath('/properties')
    return { success: result.success, logs: result.logs, error: result.error }
  } catch (err) {
    const errMsg = (err as Error).message
    await admin
      .from('suprema_jobs')
      .update({
        status: 'error',
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await admin
      .from('properties')
      .update({ suprema_status: 'error' })
      .eq('id', property.id)

    return { error: errMsg }
  }
}
