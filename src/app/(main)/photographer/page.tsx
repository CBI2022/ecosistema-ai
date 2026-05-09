import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PhotoSetsManager } from '@/features/photographer/components/PhotoSetsManager'
import { PendingShootsList } from '@/features/photographer/components/PendingShootsList'
import { PhotographerBlocksManager } from '@/features/photographer/components/PhotographerBlocksManager'
import { UpcomingShootsActions } from '@/features/photographer/components/UpcomingShootsActions'
import { GoogleCalendarCard } from '@/features/photographer/components/GoogleCalendarCard'
import { PendingDeliveriesList } from '@/features/photographer/components/PendingDeliveriesList'
import { getPendingDeliveriesForPhotographer } from '@/actions/photo-shoots'
import { isGoogleCalendarConfigured, syncBusyTimes } from '@/lib/google-calendar'

interface ShootRow {
  id: string
  agent_id: string
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  shoot_time: string
  status: string
  notes: string | null
  is_extraordinary: boolean | null
  profiles: { full_name: string | null; phone: string | null } | null
}

function getMonthDays(year: number, month: number) {
  const days: Date[] = []
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1
  for (let i = 0; i < startPad; i++) {
    days.push(new Date(year, month, -startPad + i + 1))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

export default async function PhotographerPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; reason?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const params = await searchParams
  const googleFlash = params.google === 'connected' ? 'connected' : params.google === 'error' ? 'error' : null

  // Estado de la conexión a Google Calendar
  const { data: googleConn } = await admin
    .from('google_calendar_connections')
    .select('google_email, calendar_id, connected_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const googleConfigured = isGoogleCalendarConfigured()
  const googleConnected = !!googleConn

  // Sync silencioso de busy times al entrar (próximos 60 días). No bloquea la página.
  if (googleConnected) {
    const start = new Date().toISOString().split('T')[0]
    const endDt = new Date()
    endDt.setDate(endDt.getDate() + 60)
    const end = endDt.toISOString().split('T')[0]
    syncBusyTimes(user.id, start, end).catch(() => {})
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayIso = now.toISOString().split('T')[0]

  // Shoots del mes en curso (para el calendario visual)
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const nextMonthStart = `${year}-${String(month + 2).padStart(2, '0')}-01`

  const { data: shootsRaw } = await admin
    .from('photo_shoots')
    .select('id, agent_id, property_address, property_reference, shoot_date, shoot_time, status, notes, is_extraordinary, profiles:agent_id(full_name, phone)')
    .gte('shoot_date', monthStart)
    .lt('shoot_date', nextMonthStart)
    .order('shoot_date', { ascending: true })

  const shoots = (shootsRaw || []) as unknown as ShootRow[]

  // Solicitudes pendientes — todas las que están en estado 'requested' (también de meses futuros)
  // Las extraordinarias salen primero para que Jelle las atienda con prioridad
  const { data: pendingRaw } = await admin
    .from('photo_shoots')
    .select('id, property_address, property_reference, shoot_date, shoot_time, notes, is_extraordinary, profiles:agent_id(full_name, phone)')
    .eq('status', 'requested')
    .gte('shoot_date', todayIso)
    .order('is_extraordinary', { ascending: false })
    .order('shoot_date', { ascending: true })
    .limit(20)

  const pendingShoots = (pendingRaw || []).map((s) => {
    const ag = (s as unknown as { profiles: { full_name: string | null; phone: string | null } | null }).profiles
    return {
      id: s.id as string,
      property_address: s.property_address,
      property_reference: s.property_reference,
      shoot_date: s.shoot_date as string,
      shoot_time: s.shoot_time as string,
      notes: s.notes,
      agent_name: ag?.full_name ?? null,
      agent_phone: ag?.phone ?? null,
      is_extraordinary: !!(s as unknown as { is_extraordinary?: boolean }).is_extraordinary,
    }
  })

  // Próximos shoots confirmados (scheduled), incluyendo pasados sin marcar como completed
  const { data: upcomingRaw } = await admin
    .from('photo_shoots')
    .select('id, property_address, property_reference, shoot_date, shoot_time, status, notes, profiles:agent_id(full_name, phone)')
    .eq('status', 'scheduled')
    .order('shoot_date', { ascending: true })
    .limit(20)

  const upcomingShoots = (upcomingRaw || []).map((s) => {
    const ag = (s as unknown as { profiles: { full_name: string | null; phone: string | null } | null }).profiles
    return {
      id: s.id as string,
      property_address: s.property_address,
      property_reference: s.property_reference,
      shoot_date: s.shoot_date as string,
      shoot_time: s.shoot_time as string,
      status: s.status as string,
      notes: s.notes,
      agent_name: ag?.full_name ?? null,
      agent_phone: ag?.phone ?? null,
    }
  })

  // Sesiones pendientes de entregar fotos (Jelle ya las hizo, falta pegar link Drive)
  const pendingDeliveries = await getPendingDeliveriesForPhotographer()

  // Bloqueos del fotógrafo — desde hoy
  const { data: blocksRaw } = await admin
    .from('photographer_blocks')
    .select('id, block_date, block_time, reason')
    .eq('photographer_id', user.id)
    .gte('block_date', todayIso)
    .order('block_date', { ascending: true })

  const blocks = (blocksRaw || []).map((b) => ({
    id: b.id as string,
    block_date: b.block_date as string,
    block_time: (b.block_time as string | null) ?? null,
    reason: (b.reason as string | null) ?? null,
  }))

  // Stats
  const { count: totalShoots } = await admin
    .from('photo_shoots')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: totalPhotos } = await admin
    .from('property_photos')
    .select('*', { count: 'exact', head: true })

  const confirmedThisMonth = shoots.filter((s) => s.status === 'scheduled' || s.status === 'completed').length

  // Sets de fotos subidos por este fotógrafo
  const { data: myPhotos } = await admin
    .from('property_photos')
    .select('id, storage_path, file_name, is_drone, sort_order, shoot_id, created_at, agent_id, profiles!property_photos_agent_id_fkey(full_name)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  const shootIds = [...new Set((myPhotos || []).map((p) => p.shoot_id).filter(Boolean))] as string[]
  const shootsById = new Map<string, { property_address: string | null; property_reference: string | null }>()
  if (shootIds.length > 0) {
    const { data: shootInfos } = await admin
      .from('photo_shoots')
      .select('id, property_address, property_reference')
      .in('id', shootIds)
    for (const s of shootInfos || []) {
      shootsById.set(s.id as string, {
        property_address: s.property_address as string | null,
        property_reference: s.property_reference as string | null,
      })
    }
  }

  type SetEntry = {
    key: string
    shoot_id: string | null
    agent_id: string
    agent_name: string | null
    property_reference: string | null
    property_address: string | null
    photos: typeof myPhotos
    created_at: string
  }
  const setsMap = new Map<string, SetEntry>()
  for (const photo of myPhotos || []) {
    const key = (photo.shoot_id as string | null) || `${photo.agent_id}_${(photo.created_at as string).slice(0, 10)}`
    const agentProfile = (photo as unknown as { profiles: { full_name?: string } | null }).profiles
    const shootInfo = photo.shoot_id ? shootsById.get(photo.shoot_id as string) : null
    const existing = setsMap.get(key)
    if (existing && existing.photos) {
      existing.photos.push(photo)
    } else {
      setsMap.set(key, {
        key,
        shoot_id: (photo.shoot_id as string | null) ?? null,
        agent_id: photo.agent_id as string,
        agent_name: agentProfile?.full_name ?? null,
        property_reference: shootInfo?.property_reference ?? null,
        property_address: shootInfo?.property_address ?? null,
        photos: [photo],
        created_at: photo.created_at as string,
      })
    }
  }
  const photoSets = Array.from(setsMap.values())

  // Agrupar shoots por fecha para el calendario visual
  const shootsByDate = new Map<string, ShootRow[]>()
  for (const shoot of shoots) {
    const key = shoot.shoot_date
    if (!shootsByDate.has(key)) shootsByDate.set(key, [])
    shootsByDate.get(key)!.push(shoot)
  }

  const blocksByDate = new Map<string, { time: string | null; reason: string | null }[]>()
  for (const b of blocks) {
    const key = b.block_date
    if (!blocksByDate.has(key)) blocksByDate.set(key, [])
    blocksByDate.get(key)!.push({ time: b.block_time, reason: b.reason })
  }

  const days = getMonthDays(year, month)
  const monthName = now.toLocaleString('es', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Mi calendario</p>
        <h1 className="mt-1 text-2xl font-bold text-[#F5F0E8] sm:text-3xl">
          Hola Jelle 👋
        </h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          Aquí ves todas las solicitudes y shoots confirmados.
        </p>
      </div>

      {/* Stats — 4 tarjetas mobile-first */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {[
          { label: 'Pendientes', value: pendingShoots.length, color: '#C9A84C', highlight: pendingShoots.length > 0 },
          { label: 'Este mes', value: confirmedThisMonth, color: '#2ECC9A' },
          { label: 'Fotos subidas', value: totalPhotos ?? 0, color: '#8B5CF6' },
          { label: 'Completados', value: totalShoots ?? 0, color: '#F5F0E8' },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-[12px] border bg-[#1C1C1C] p-3.5 sm:p-4 ${
              s.highlight ? 'border-[#C9A84C]/40' : 'border-white/8'
            }`}
          >
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
              {s.label}
            </p>
            <p className="text-2xl font-bold sm:text-3xl" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Google Calendar — banner conectar/conectado */}
      <GoogleCalendarCard
        configured={googleConfigured}
        connected={googleConnected}
        email={googleConn?.google_email ?? null}
        calendarId={googleConn?.calendar_id ?? null}
        connectedAt={googleConn?.connected_at ?? null}
        initialFlash={googleFlash}
        errorReason={params.reason ?? null}
      />

      {/* 1. Solicitudes pendientes (solo si hay) */}
      <PendingShootsList shoots={pendingShoots} />

      {/* 2. Calendario mensual */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-4 sm:p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📅 {monthName}
          </p>
          <a
            href="/photographer/upload"
            className="rounded-lg bg-[#C9A84C] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black transition active:scale-95 hover:bg-[#E8C96A]"
          >
            + Subir fotos
          </a>
        </div>

        {/* Headers semana */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {['L','M','X','J','V','S','D'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-[#9A9080]">
              {d}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === month
            const dateKey = day.toISOString().split('T')[0]
            const isToday = dateKey === todayIso
            const daySheets = shootsByDate.get(dateKey) ?? []
            const dayBlocks = blocksByDate.get(dateKey) ?? []
            const fullDayBlocked = dayBlocks.some((b) => b.time === null)

            // Color del fondo del día según contenido
            let bgClass = 'border-transparent'
            if (isToday) bgClass = 'border-[#C9A84C]/50 bg-[#C9A84C]/8'
            else if (fullDayBlocked) bgClass = 'border-blue-400/30 bg-blue-500/8'

            return (
              <div
                key={idx}
                className={`min-h-[60px] rounded-lg border p-1.5 text-[11px] transition ${
                  !isCurrentMonth ? 'opacity-25' : ''
                } ${bgClass} hover:border-white/15`}
              >
                <span className={`text-[11px] font-bold ${isToday ? 'text-[#C9A84C]' : 'text-[#9A9080]'}`}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {daySheets.slice(0, 2).map((s) => {
                    const colorMap: Record<string, string> = {
                      requested: 'bg-[#C9A84C]/20 text-[#C9A84C]',
                      scheduled: 'bg-[#2ECC9A]/20 text-[#2ECC9A]',
                      completed: 'bg-[#9A9080]/20 text-[#9A9080] line-through',
                      cancelled: 'bg-red-500/15 text-red-400/70 line-through',
                      rejected: 'bg-red-500/15 text-red-400/70 line-through',
                    }
                    const color = colorMap[s.status] ?? 'bg-white/10 text-[#F5F0E8]'
                    return (
                      <div
                        key={s.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${color}`}
                        title={`${s.shoot_time?.slice(0, 5)} · ${s.profiles?.full_name ?? 'Agente'} · ${s.property_address ?? ''}`}
                      >
                        {s.shoot_time?.slice(0, 5)} {s.profiles?.full_name?.split(' ')[0] ?? 'Agente'}
                      </div>
                    )
                  })}
                  {daySheets.length > 2 && (
                    <div className="text-[8px] text-[#9A9080]">+{daySheets.length - 2}</div>
                  )}
                  {dayBlocks.length > 0 && !fullDayBlocked && (
                    <div className="rounded bg-blue-500/15 px-1 py-0.5 text-[9px] font-semibold text-blue-300">
                      🛑 {dayBlocks.length}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-white/6 pt-3 text-[10px] text-[#9A9080]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C9A84C]" />
            Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2ECC9A]" />
            Confirmado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9A9080]" />
            Completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            Bloqueado
          </span>
        </div>
      </div>

      {/* 3. Próximos confirmados (con marcar completado) */}
      <UpcomingShootsActions shoots={upcomingShoots} />

      {/* 4. Pendientes de entregar fotos al agente */}
      <section className="rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#F5F0E8]">
              📤 Entregar fotos al agente
            </h2>
            <p className="mt-1 text-[11px] text-[#9A9080]">
              Sube las fotos a una carpeta de Drive como siempre, pega aquí el link público y el agente recibe aviso.
            </p>
          </div>
        </div>
        <PendingDeliveriesList deliveries={pendingDeliveries} />
      </section>

      {/* 5. Bloquear días */}
      <PhotographerBlocksManager blocks={blocks} />

      {/* 6. Sets de fotos subidos */}
      {photoSets.length > 0 && <PhotoSetsManager sets={photoSets as never} />}
    </div>
  )
}
