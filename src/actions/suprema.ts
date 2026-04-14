'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/actions/push'

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
  revalidatePath('/suprema')
  return { success: true }
}

// Simulates a Suprema automation run — replace with real Playwright integration
export async function runSupremaJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the job + property
  const { data: job } = await supabase
    .from('suprema_jobs')
    .select('*, properties(*)')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  const property = (job as Record<string, unknown>).properties as Record<string, unknown> | null

  // Mark as running
  await supabase
    .from('suprema_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), logs: ['Job started'] })
    .eq('id', jobId)

  const logs: string[] = [
    `[${new Date().toLocaleTimeString()}] Opening Suprema portal...`,
    `[${new Date().toLocaleTimeString()}] Logging in with agent credentials...`,
    `[${new Date().toLocaleTimeString()}] Navigating to "Add New Property"...`,
    `[${new Date().toLocaleTimeString()}] Filling property type: ${property?.property_type || 'villa'}`,
    `[${new Date().toLocaleTimeString()}] Entering location: ${property?.location || 'Costa Blanca'}`,
    `[${new Date().toLocaleTimeString()}] Setting price: €${property?.price?.toLocaleString() || '—'}`,
    `[${new Date().toLocaleTimeString()}] Filling bedrooms: ${property?.bedrooms || '—'}, bathrooms: ${property?.bathrooms || '—'}`,
    `[${new Date().toLocaleTimeString()}] Entering Spanish description (ES)...`,
    `[${new Date().toLocaleTimeString()}] Entering English description (EN)...`,
    `[${new Date().toLocaleTimeString()}] Fetching property photos...`,
    `[${new Date().toLocaleTimeString()}] Uploading standard photos (sorted by order)...`,
    `[${new Date().toLocaleTimeString()}] Uploading drone photos last (aerial views)...`,
    `[${new Date().toLocaleTimeString()}] Validating address on Suprema map...`,
    `[${new Date().toLocaleTimeString()}] Setting annual expenses (IBI, community, basura)...`,
    `[${new Date().toLocaleTimeString()}] Submitting listing for review...`,
    `[${new Date().toLocaleTimeString()}] Listing submitted successfully! Reference: ${property?.reference || '—'}`,
  ]

  // NOTE: This is a simulation. In production, replace the body above with:
  // const result = await runPlaywrightAutomation(job, property)
  // That function would use Playwright to automate the actual Suprema portal.

  await supabase
    .from('suprema_jobs')
    .update({
      status: 'done',
      logs,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  // Update property suprema_status + notificar al agente
  if (property?.id) {
    const admin = createAdminClient()
    await admin
      .from('properties')
      .update({ suprema_status: 'published' })
      .eq('id', property.id as string)

    // Notificación de éxito al agente
    const agentId = (job as Record<string, unknown>).agent_id as string
    if (agentId) {
      await admin.from('notifications').insert({
        type: 'suprema_done',
        title: '✅ Propiedad publicada en Suprema',
        message: `La propiedad ${property?.reference || ''} está publicada y activa en Suprema. Referencia: ${property?.reference || '—'}.`,
        target_user_id: agentId,
        is_read: false,
      })
      // Push
      await sendPushToUser(agentId, {
        title: '✅ Propiedad publicada',
        body: `${property?.reference || 'Tu propiedad'} está activa en Suprema`,
        url: '/properties',
      })
    }
  }

  revalidatePath('/suprema')
  revalidatePath('/properties')
  return { success: true, logs }
}
