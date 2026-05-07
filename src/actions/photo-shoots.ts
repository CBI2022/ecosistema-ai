'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { sendPushToUser } from '@/actions/push'
import {
  shootRequestedToPhotographerEmail,
  shootRequestedToAgentEmail,
  shootConfirmedToAgentEmail,
  shootRescheduledToAgentEmail,
  shootRejectedToAgentEmail,
  shootCompletedToAgentEmail,
} from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/site-url'
import {
  createShootEvent,
  updateShootEvent,
  cancelShootEvent,
} from '@/lib/google-calendar'

// Helper: localizar al fotógrafo activo (de momento Jelle, único photographer aprobado).
// Si hay varios en el futuro, este helper elegirá por disponibilidad/load.
async function getActivePhotographer() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'photographer')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data
}

// Devuelve shoots existentes en un rango de fechas para bloquear overbooking en el calendario del agente
export async function getBookedSlots(fromDate: string, toDate: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('photo_shoots')
    .select('shoot_date, shoot_time, duration_hours, status')
    .gte('shoot_date', fromDate)
    .lte('shoot_date', toDate)
    .not('status', 'in', '("cancelled","rejected")')

  return (data || []).map((s) => ({
    date: s.shoot_date,
    time: s.shoot_time as string,
    duration: s.duration_hours || 2,
  }))
}

// Bloqueos que el fotógrafo ha marcado como no-disponibles (vacaciones, días personales)
// Combina photographer_blocks (manual) + google_calendar_busy (sincronizado de su Calendar)
export async function getPhotographerBlocks(fromDate: string, toDate: string) {
  const admin = createAdminClient()
  const photographer = await getActivePhotographer()
  if (!photographer) return []

  const [{ data: manual }, { data: googleBusy }] = await Promise.all([
    admin
      .from('photographer_blocks')
      .select('block_date, block_time, reason')
      .eq('photographer_id', photographer.id)
      .gte('block_date', fromDate)
      .lte('block_date', toDate),
    admin
      .from('google_calendar_busy')
      .select('busy_date, busy_start, busy_end, is_all_day, summary')
      .eq('user_id', photographer.id)
      .gte('busy_date', fromDate)
      .lte('busy_date', toDate),
  ])

  const out: { date: string; time: string | null; reason: string | null }[] = []

  for (const b of manual || []) {
    out.push({
      date: b.block_date as string,
      time: (b.block_time as string | null) ?? null,
      reason: (b.reason as string | null) ?? null,
    })
  }

  // Eventos de Google Calendar — todo el día → null; con hora → registramos el slot inicial
  for (const g of googleBusy || []) {
    out.push({
      date: g.busy_date as string,
      time: g.is_all_day ? null : ((g.busy_start as string | null)?.slice(0, 5) ?? null),
      reason: (g.summary as string | null) ?? 'Ocupado en Google Calendar',
    })
  }

  return out
}

export async function bookShoot(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const shootDate = formData.get('shoot_date') as string
  const shootTime = formData.get('shoot_time') as string
  const propertyAddress = formData.get('property_address') as string
  const notes = (formData.get('notes') as string) || null

  if (!shootDate || !shootTime || !propertyAddress) {
    return { error: 'Faltan datos obligatorios' }
  }

  const admin = createAdminClient()

  // 1) Verificar que el día/hora no esté bloqueado por el fotógrafo
  const photographer = await getActivePhotographer()
  if (photographer) {
    const { data: blocks } = await admin
      .from('photographer_blocks')
      .select('block_time')
      .eq('photographer_id', photographer.id)
      .eq('block_date', shootDate)

    const blocked = (blocks || []).some(
      (b) => b.block_time === null || b.block_time === shootTime,
    )
    if (blocked) {
      return { error: 'Jelle no está disponible ese día/hora. Elige otro hueco.' }
    }
  }

  // 2) Verificar overbooking — mismo día + hora
  const { data: conflict } = await admin
    .from('photo_shoots')
    .select('id')
    .eq('shoot_date', shootDate)
    .eq('shoot_time', shootTime)
    .not('status', 'in', '("cancelled","rejected")')
    .maybeSingle()

  if (conflict) {
    return { error: 'Ese hueco ya está reservado. Elige otra hora.' }
  }

  // 3) Crear el shoot en estado 'requested' (pendiente de confirmación de Jelle)
  const { data: created, error } = await admin
    .from('photo_shoots')
    .insert({
      agent_id: user.id,
      photographer_id: photographer?.id ?? null,
      property_address: propertyAddress,
      property_reference: (formData.get('property_reference') as string) || null,
      shoot_date: shootDate,
      shoot_time: shootTime,
      notes,
      status: 'requested',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // 4) Notificar a ambos lados (email + push). Si algo falla, log y seguir.
  const { data: agent } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const info = {
    agentName: agent?.full_name ?? agent?.email ?? 'Un agente',
    address: propertyAddress,
    date: shootDate,
    time: shootTime,
    notes,
  }
  const siteUrl = getSiteUrl()

  if (photographer) {
    const tplJ = shootRequestedToPhotographerEmail(info, `${siteUrl}/photographer`)
    if (photographer.email) {
      sendEmail({ to: photographer.email, subject: tplJ.subject, html: tplJ.html }).catch(() => {})
    }
    sendPushToUser(photographer.id, {
      title: '📸 Nueva solicitud de shoot',
      body: `${info.agentName} · ${info.date} a las ${info.time}`,
      url: '/photographer',
      tag: `shoot-${created.id}`,
    }).catch(() => {})

    // Notificación in-app para Jelle
    await admin.from('notifications').insert({
      type: 'shoot_requested',
      title: '📸 Nueva solicitud de shoot',
      message: `${info.agentName} pidió shoot el ${info.date} a las ${info.time}`,
      target_user_id: photographer.id,
      is_read: false,
    })
  }

  if (agent?.email) {
    const tplA = shootRequestedToAgentEmail(info, `${siteUrl}/dashboard`)
    sendEmail({ to: agent.email, subject: tplA.subject, html: tplA.html }).catch(() => {})
  }

  revalidatePath('/dashboard')
  revalidatePath('/photographer')
  return { success: true, shootId: created.id }
}

// ─── Acciones del fotógrafo ───

async function assertPhotographer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, user: null }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return { error: 'No autorizado' as const, user: null }
  }
  return { error: null, user }
}

async function loadShootForNotify(shootId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('photo_shoots')
    .select('*, agent:agent_id(id, full_name, email)')
    .eq('id', shootId)
    .single()
  return data as
    | (Record<string, unknown> & {
        agent: { id: string; full_name: string | null; email: string | null } | null
        property_address: string | null
        shoot_date: string
        shoot_time: string
        notes: string | null
      })
    | null
}

export async function confirmShoot(shootId: string) {
  const auth = await assertPhotographer()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('photo_shoots')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', shootId)
  if (error) return { error: error.message }

  const shoot = await loadShootForNotify(shootId)

  // Sincronizar con Google Calendar de Jelle (si conectado)
  if (shoot && auth.user) {
    const eventId = await createShootEvent(auth.user.id, {
      id: shootId,
      shoot_date: shoot.shoot_date,
      shoot_time: shoot.shoot_time,
      property_address: shoot.property_address,
      property_reference: (shoot as { property_reference?: string | null }).property_reference ?? null,
      notes: shoot.notes,
      agent_name: shoot.agent?.full_name ?? null,
    })
    if (eventId) {
      await admin.from('photo_shoots').update({ google_event_id: eventId }).eq('id', shootId)
    }
  }

  if (shoot?.agent) {
    const info = {
      agentName: shoot.agent.full_name ?? 'Agente',
      address: shoot.property_address ?? '',
      date: shoot.shoot_date,
      time: (shoot.shoot_time as string).slice(0, 5),
      notes: shoot.notes,
    }
    const siteUrl = getSiteUrl()
    if (shoot.agent.email) {
      const tpl = shootConfirmedToAgentEmail(info, `${siteUrl}/dashboard`)
      sendEmail({ to: shoot.agent.email, subject: tpl.subject, html: tpl.html }).catch(() => {})
    }
    sendPushToUser(shoot.agent.id, {
      title: '✅ Shoot confirmado',
      body: `Jelle confirmó tu shoot: ${info.date} a las ${info.time}`,
      url: '/dashboard',
      tag: `shoot-${shootId}`,
    }).catch(() => {})
    await admin.from('notifications').insert({
      type: 'shoot_confirmed',
      title: '✅ Jelle confirmó tu shoot',
      message: `${info.address} · ${info.date} a las ${info.time}`,
      target_user_id: shoot.agent.id,
      is_read: false,
    })
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rejectShoot(shootId: string, reason?: string) {
  const auth = await assertPhotographer()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  // Cargar antes para tener event_id si existía
  const before = await loadShootForNotify(shootId)
  const eventIdBefore = (before as unknown as { google_event_id?: string | null } | null)?.google_event_id ?? null

  const { error } = await admin
    .from('photo_shoots')
    .update({
      status: 'rejected',
      notes: reason ? `[Rechazado: ${reason}]` : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shootId)
  if (error) return { error: error.message }

  // Si había evento creado en Calendar, cancelarlo
  if (eventIdBefore && auth.user) {
    cancelShootEvent(auth.user.id, eventIdBefore).catch(() => {})
  }

  const shoot = await loadShootForNotify(shootId)
  if (shoot?.agent) {
    const info = {
      agentName: shoot.agent.full_name ?? 'Agente',
      address: shoot.property_address ?? '',
      date: shoot.shoot_date,
      time: (shoot.shoot_time as string).slice(0, 5),
      notes: shoot.notes,
    }
    const siteUrl = getSiteUrl()
    if (shoot.agent.email) {
      const tpl = shootRejectedToAgentEmail(info, `${siteUrl}/dashboard`, reason)
      sendEmail({ to: shoot.agent.email, subject: tpl.subject, html: tpl.html }).catch(() => {})
    }
    sendPushToUser(shoot.agent.id, {
      title: '❌ Shoot rechazado',
      body: 'Jelle no puede ese día. Reserva otra fecha.',
      url: '/dashboard',
      tag: `shoot-${shootId}`,
    }).catch(() => {})
    await admin.from('notifications').insert({
      type: 'shoot_rejected',
      title: '❌ Jelle no puede ese día',
      message: `${info.address} · ${info.date} · reserva otra fecha`,
      target_user_id: shoot.agent.id,
      is_read: false,
    })
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rescheduleShoot(
  shootId: string,
  newDate: string,
  newTime: string,
) {
  const auth = await assertPhotographer()
  if (auth.error) return { error: auth.error }

  if (!newDate || !newTime) return { error: 'Faltan fecha u hora' }

  const admin = createAdminClient()

  // Verificar overbooking en el nuevo slot
  const { data: conflict } = await admin
    .from('photo_shoots')
    .select('id')
    .eq('shoot_date', newDate)
    .eq('shoot_time', newTime)
    .neq('id', shootId)
    .not('status', 'in', '("cancelled","rejected")')
    .maybeSingle()
  if (conflict) return { error: 'Ese nuevo hueco ya está ocupado' }

  // Cargar shoot original (para email comparativo)
  const original = await loadShootForNotify(shootId)
  if (!original) return { error: 'Shoot no encontrado' }
  const oldInfo = {
    agentName: original.agent?.full_name ?? 'Agente',
    address: original.property_address ?? '',
    date: original.shoot_date,
    time: (original.shoot_time as string).slice(0, 5),
    notes: original.notes,
  }

  const eventIdBefore = (original as unknown as { google_event_id?: string | null }).google_event_id ?? null

  const { error } = await admin
    .from('photo_shoots')
    .update({
      shoot_date: newDate,
      shoot_time: newTime,
      status: 'scheduled', // reprogramar implica confirmación con la nueva fecha
      updated_at: new Date().toISOString(),
    })
    .eq('id', shootId)
  if (error) return { error: error.message }

  // Sincronizar con Google Calendar (si conectado): update si existía evento, create si no
  if (auth.user) {
    const shootForCal = {
      id: shootId,
      shoot_date: newDate,
      shoot_time: newTime,
      property_address: original.property_address,
      property_reference: (original as { property_reference?: string | null }).property_reference ?? null,
      notes: original.notes,
      agent_name: original.agent?.full_name ?? null,
    }
    if (eventIdBefore) {
      updateShootEvent(auth.user.id, eventIdBefore, shootForCal).catch(() => {})
    } else {
      const newEventId = await createShootEvent(auth.user.id, shootForCal)
      if (newEventId) {
        await admin.from('photo_shoots').update({ google_event_id: newEventId }).eq('id', shootId)
      }
    }
  }

  if (original.agent) {
    const newInfo = { ...oldInfo, date: newDate, time: newTime }
    const siteUrl = getSiteUrl()
    if (original.agent.email) {
      const tpl = shootRescheduledToAgentEmail(oldInfo, newInfo, `${siteUrl}/dashboard`)
      sendEmail({ to: original.agent.email, subject: tpl.subject, html: tpl.html }).catch(() => {})
    }
    sendPushToUser(original.agent.id, {
      title: '🔄 Shoot reprogramado',
      body: `Nueva fecha: ${newDate} a las ${newTime}`,
      url: '/dashboard',
      tag: `shoot-${shootId}`,
    }).catch(() => {})
    await admin.from('notifications').insert({
      type: 'shoot_rescheduled',
      title: '🔄 Jelle reprogramó tu shoot',
      message: `Nueva fecha: ${newDate} a las ${newTime}`,
      target_user_id: original.agent.id,
      is_read: false,
    })
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function completeShoot(shootId: string) {
  const auth = await assertPhotographer()
  if (auth.error) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('photo_shoots')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', shootId)
  if (error) return { error: error.message }

  const shoot = await loadShootForNotify(shootId)
  if (shoot?.agent) {
    const info = {
      agentName: shoot.agent.full_name ?? 'Agente',
      address: shoot.property_address ?? '',
      date: shoot.shoot_date,
      time: (shoot.shoot_time as string).slice(0, 5),
      notes: shoot.notes,
    }
    const siteUrl = getSiteUrl()
    if (shoot.agent.email) {
      const tpl = shootCompletedToAgentEmail(info, `${siteUrl}/dashboard`)
      sendEmail({ to: shoot.agent.email, subject: tpl.subject, html: tpl.html }).catch(() => {})
    }
    sendPushToUser(shoot.agent.id, {
      title: '📷 Shoot completado',
      body: 'Tus fotos están en proceso de edición',
      url: '/dashboard',
      tag: `shoot-${shootId}`,
    }).catch(() => {})
    await admin.from('notifications').insert({
      type: 'shoot_completed',
      title: '📷 Tu shoot está completado',
      message: `${info.address} · fotos en edición`,
      target_user_id: shoot.agent.id,
      is_read: false,
    })
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

// El agente puede cancelar SU shoot mientras esté pendiente o programado
export async function cancelShootAsAgent(shootId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: shoot } = await admin
    .from('photo_shoots')
    .select('id, agent_id, photographer_id, property_address, shoot_date, shoot_time, status, google_event_id')
    .eq('id', shootId)
    .single()
  if (!shoot) return { error: 'Shoot no encontrado' }
  if (shoot.agent_id !== user.id) return { error: 'No es tu shoot' }
  if (shoot.status === 'completed' || shoot.status === 'cancelled') {
    return { error: 'Ya no se puede cancelar' }
  }

  const { error } = await admin
    .from('photo_shoots')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', shootId)
  if (error) return { error: error.message }

  // Cancelar evento en Google Calendar de Jelle si existía
  if (shoot.photographer_id && shoot.google_event_id) {
    cancelShootEvent(shoot.photographer_id, shoot.google_event_id).catch(() => {})
  }

  // Avisar a Jelle si era él quien la tenía asignada
  if (shoot.photographer_id) {
    sendPushToUser(shoot.photographer_id, {
      title: '🚫 Shoot cancelado',
      body: `${shoot.property_address} · ${shoot.shoot_date} a las ${shoot.shoot_time?.slice(0, 5)}`,
      url: '/photographer',
      tag: `shoot-${shootId}`,
    }).catch(() => {})
    await admin.from('notifications').insert({
      type: 'shoot_cancelled',
      title: '🚫 Shoot cancelado por el agente',
      message: `${shoot.property_address} · ${shoot.shoot_date} a las ${shoot.shoot_time?.slice(0, 5)}`,
      target_user_id: shoot.photographer_id,
      is_read: false,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/photographer')
  return { success: true }
}

// ─── Bloqueos del fotógrafo (vacaciones / días personales) ───

export async function blockDay(blockDate: string, blockTime: string | null, reason: string | null) {
  const auth = await assertPhotographer()
  if (auth.error || !auth.user) return { error: auth.error || 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.from('photographer_blocks').insert({
    photographer_id: auth.user.id,
    block_date: blockDate,
    block_time: blockTime,
    reason,
  })
  if (error) return { error: error.message }

  revalidatePath('/photographer')
  return { success: true }
}

export async function unblockDay(blockId: string) {
  const auth = await assertPhotographer()
  if (auth.error || !auth.user) return { error: auth.error || 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('photographer_blocks')
    .delete()
    .eq('id', blockId)
    .eq('photographer_id', auth.user.id)
  if (error) return { error: error.message }

  revalidatePath('/photographer')
  return { success: true }
}

// Compatibilidad con código que aún use updateShootStatus
export async function updateShootStatus(
  shootId: string,
  status: 'scheduled' | 'completed' | 'cancelled',
) {
  if (status === 'completed') return completeShoot(shootId)
  if (status === 'cancelled') return cancelShootAsAgent(shootId)
  return confirmShoot(shootId) // 'scheduled' = confirmar
}
