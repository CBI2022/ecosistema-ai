'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'
import { mapPropertyToSooprema } from '@/lib/sooprema/mapper'
import { runSoopremaAutomation } from '@/lib/sooprema/automation'
import { audit } from '@/lib/audit'
import type { Property } from '@/types/database'

export async function retrySupremaJob(jobId: string) {
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
  revalidatePath('/suprema')
  return { success: true }
}

export async function cancelSupremaJob(jobId: string) {
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
  revalidatePath('/suprema')
  return { success: true }
}

/**
 * Ejecuta el job real de Sooprema con Playwright.
 * Requiere maxDuration alto (300s en Vercel Pro).
 */
export async function runSupremaJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Permisos: admin, secretary o el agente dueño del job
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Fetch job + property
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

  // Marcar como running
  await admin
    .from('suprema_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      logs: ['Job started'],
    })
    .eq('id', jobId)

  try {
    // Fetch owner
    let owner = null
    if (property.owner_id) {
      const { data: o } = await admin
        .from('owners')
        .select('first_name, last_name, full_name, email, phone, nif, sooprema_owner_id')
        .eq('id', property.owner_id)
        .single()
      owner = o
    }

    // Fetch photos vinculadas + URLs públicas
    const { data: rawPhotos } = await admin
      .from('property_photos')
      .select('id, storage_path, is_drone, sort_order')
      .eq('property_id', property.id)
      .order('sort_order', { ascending: true })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const photos = (rawPhotos || []).map((p) => {
      // Si storage_path ya es URL absoluta, úsala; si no, componer URL pública
      const url = p.storage_path.startsWith('http')
        ? p.storage_path
        : `${supabaseUrl}/storage/v1/object/public/property-photos/${p.storage_path}`
      return {
        public_url: url,
        is_drone: p.is_drone,
        sort_order: p.sort_order,
      }
    })

    // Mapping agente CBI → agente Sooprema
    const { data: agentMap } = await admin
      .from('agent_sooprema_map')
      .select('sooprema_agent_id')
      .eq('profile_id', property.agent_id)
      .maybeSingle()

    // Preparar mapping
    const fields = mapPropertyToSooprema({
      property,
      owner,
      soopremaAgentId: agentMap?.sooprema_agent_id || null,
      photos,
    })

    // Ejecutar automation
    const result = await runSoopremaAutomation(fields, { timeout: 60000 })

    // Guardar resultado
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

    // Update property
    if (result.success) {
      await admin
        .from('properties')
        .update({
          suprema_status: 'published',
          sooprema_external_id: result.sooprema_external_id || null,
          sooprema_public_url: result.sooprema_public_url || null,
        })
        .eq('id', property.id)

      // Notificación éxito
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
    } else {
      await admin
        .from('properties')
        .update({ suprema_status: 'error' })
        .eq('id', property.id)

      // Notificación error
      await admin.from('notifications').insert({
        type: 'suprema_error',
        title: '❌ Error publicando en Sooprema',
        message: `Falló la publicación de ${property.reference}: ${result.error || 'Ver logs'}`,
        target_user_id: property.agent_id,
        is_read: false,
      })
    }

    revalidatePath('/suprema')
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

// Nota: la configuración de maxDuration se hace en vercel.json (functions config)
// ya que los archivos 'use server' no admiten exports no-action.
