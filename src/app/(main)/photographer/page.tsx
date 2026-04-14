import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PhotoSetsManager } from '@/features/photographer/components/PhotoSetsManager'

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

export default async function PhotographerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const { data: shoots } = await admin
    .from('photo_shoots')
    .select('*, profiles:agent_id(full_name, phone)')
    .order('shoot_date', { ascending: true })
    .gte('shoot_date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
    .lte('shoot_date', `${year}-${String(month + 2).padStart(2, '0')}-01`)

  const { count: totalShoots } = await admin
    .from('photo_shoots')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: totalPhotos } = await admin
    .from('property_photos')
    .select('*', { count: 'exact', head: true })

  // Cargar sets subidos por este fotógrafo
  const { data: myPhotos } = await admin
    .from('property_photos')
    .select('id, storage_path, file_name, is_drone, sort_order, shoot_id, created_at, agent_id, profiles!property_photos_agent_id_fkey(full_name)')
    .eq('photographer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  // Obtener address/ref de cada shoot
  const shootIds = [...new Set((myPhotos || []).map((p) => p.shoot_id).filter(Boolean))] as string[]
  const shootsById = new Map<string, { property_address: string | null; property_reference: string | null }>()
  if (shootIds.length > 0) {
    const { data: shootInfos } = await admin
      .from('photo_shoots')
      .select('id, property_address, property_reference')
      .in('id', shootIds)
    for (const s of shootInfos || []) {
      shootsById.set(s.id, { property_address: s.property_address, property_reference: s.property_reference })
    }
  }

  // Agrupar por shoot_id (o por agent+día si no hay shoot)
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
    const key = photo.shoot_id || `${photo.agent_id}_${photo.created_at.slice(0, 10)}`
    const agentProfile = (photo as any).profiles as { full_name?: string } | null
    const shootInfo = photo.shoot_id ? shootsById.get(photo.shoot_id) : null
    const existing = setsMap.get(key)
    if (existing && existing.photos) {
      existing.photos.push(photo)
    } else {
      setsMap.set(key, {
        key,
        shoot_id: photo.shoot_id,
        agent_id: photo.agent_id,
        agent_name: agentProfile?.full_name ?? null,
        property_reference: shootInfo?.property_reference ?? null,
        property_address: shootInfo?.property_address ?? null,
        photos: [photo],
        created_at: photo.created_at,
      })
    }
  }
  const photoSets = Array.from(setsMap.values())

  const days = getMonthDays(year, month)
  const monthName = now.toLocaleString('en', { month: 'long', year: 'numeric' })

  const shootsByDate = new Map<string, typeof shoots>()
  for (const shoot of shoots || []) {
    const key = shoot.shoot_date
    if (!shootsByDate.has(key)) shootsByDate.set(key, [])
    shootsByDate.get(key)!.push(shoot)
  }

  const upcomingDeadline = (shoots || []).filter(
    (s) => s.status === 'scheduled' && s.shoot_date >= now.toISOString().split('T')[0]
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Shoots completados', value: totalShoots ?? 0, color: '#2ECC9A' },
          { label: 'Fotos subidas', value: totalPhotos ?? 0, color: '#C9A84C' },
          { label: 'Shoots este mes', value: shoots?.length ?? 0, color: '#8B5CF6' },
          { label: 'Pendientes', value: upcomingDeadline.length, color: '#F5F0E8' },
        ].map((s) => (
          <div key={s.label} className="rounded-[10px] border border-white/8 bg-[#1C1C1C] p-4">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📅 {monthName}
          </p>
          <a href="/photographer/upload" className="rounded-lg bg-[#C9A84C] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#E8C96A]">
            + Upload Photos
          </a>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wide text-[#9A9080]">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === month
            const dateKey = day.toISOString().split('T')[0]
            const isToday = dateKey === now.toISOString().split('T')[0]
            const daySheets = shootsByDate.get(dateKey) ?? []

            return (
              <div
                key={idx}
                className={`min-h-[64px] rounded-lg p-1.5 text-[11px] transition ${
                  !isCurrentMonth ? 'opacity-20' : ''
                } ${isToday ? 'border border-[#C9A84C]/50 bg-[#C9A84C]/8' : 'border border-transparent hover:border-white/10'}`}
              >
                <span className={`font-bold ${isToday ? 'text-[#C9A84C]' : 'text-[#9A9080]'}`}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {daySheets.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className={`rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${
                        s.status === 'completed'
                          ? 'bg-[#2ECC9A]/20 text-[#2ECC9A]'
                          : s.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-[#C9A84C]/20 text-[#C9A84C]'
                      }`}
                    >
                      {s.shoot_time?.slice(0, 5)} {(s as any).profiles?.full_name?.split(' ')[0] ?? 'Agent'}
                    </div>
                  ))}
                  {daySheets.length > 2 && (
                    <div className="text-[8px] text-[#9A9080]">+{daySheets.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sets subidos — gestión */}
      <PhotoSetsManager sets={photoSets as any} />

      {/* Upcoming shoots list */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          Próximos shoots
        </p>
        {upcomingDeadline.length === 0 ? (
          <p className="text-sm text-[#9A9080]/60">No shoots scheduled</p>
        ) : (
          <div className="space-y-2.5">
            {upcomingDeadline.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/6 bg-[#1C1C1C] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#F5F0E8]">
                    {s.property_address || s.property_reference || 'Unnamed property'}
                  </p>
                  <p className="text-xs text-[#9A9080]">
                    {(s as any).profiles?.full_name ?? 'Agent'} · {s.shoot_date} at {s.shoot_time?.slice(0,5)}
                  </p>
                </div>
                <span className="rounded-full bg-[#C9A84C]/15 px-2.5 py-1 text-[9px] font-bold uppercase text-[#C9A84C]">
                  Scheduled
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
