'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  TIME_SLOTS,
  MAX_SHOOTS_PER_DAY,
  SHOOT_DURATION_HOURS,
  SHOOT_BUFFER_HOURS,
  isSlotBlockedByBuffer,
  isDayAtCap,
} from '@/features/photographer/lib/shoot-rules'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface BookedSlot {
  date: string
  time: string
  duration: number
}

interface BookShootingCalendarProps {
  onClose: () => void
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function buildMonthGrid(year: number, month: number) {
  // month 0-indexed
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  // Adjust to Monday=0
  const startDow = (first.getDay() + 6) % 7

  const days: Array<{ date: Date; iso: string; inMonth: boolean }> = []

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, iso: toISODate(d), inMonth: false })
  }
  // Current month
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d)
    days.push({ date: dt, iso: toISODate(dt), inMonth: true })
  }
  // Padding to 42 cells (6 rows)
  while (days.length < 42) {
    const last = days[days.length - 1].date
    const next = new Date(last)
    next.setDate(last.getDate() + 1)
    days.push({ date: next, iso: toISODate(next), inMonth: false })
  }
  return days
}

interface BlockedSlot {
  date: string
  time: string | null // null = todo el día
  reason: string | null
}

export function BookShootingCalendar({ onClose }: BookShootingCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [realBooked, setRealBooked] = useState<BookedSlot[]>([])
  const [blocked, setBlocked] = useState<BlockedSlot[]>([])

  // Form fields
  const [address, setAddress] = useState('')
  const [locationLink, setLocationLink] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extraordinaryMode, setExtraordinaryMode] = useState(false)

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])
  const allBooked = realBooked

  // Cargar slots reservados reales y bloqueos del fotógrafo al cambiar de mes
  useEffect(() => {
    (async () => {
      const first = toISODate(new Date(year, month, 1))
      const last = toISODate(new Date(year, month + 1, 0))
      const { getBookedSlots, getPhotographerBlocks } = await import('@/actions/photo-shoots')
      const [slots, blocks] = await Promise.all([
        getBookedSlots(first, last),
        getPhotographerBlocks(first, last),
      ])
      setRealBooked(slots.map((s) => ({ ...s, time: s.time.slice(0, 5) })))
      setBlocked(
        blocks.map((b) => ({
          date: b.date,
          time: b.time ? b.time.slice(0, 5) : null,
          reason: b.reason,
        })),
      )
    })()
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1)
  }

  function bookedCountForDate(iso: string) {
    return allBooked.filter((s) => s.date === iso).length
  }

  function bookedTimesForDate(iso: string) {
    return allBooked.filter((s) => s.date === iso).map((s) => s.time)
  }

  function isFullDayBlocked_(iso: string) {
    return blocked.some((b) => b.date === iso && b.time === null)
  }

  function blockedTimesForDate(iso: string) {
    return blocked
      .filter((b) => b.date === iso && b.time !== null)
      .map((b) => b.time as string)
  }

  // Slots ocupados directamente: shoot exacto + bloqueo manual del fotógrafo
  function unavailableTimesForDate(iso: string) {
    return [...bookedTimesForDate(iso), ...blockedTimesForDate(iso)]
  }

  // Slots BLOQUEADOS POR BUFFER (un shoot existente proyecta 4h alrededor)
  function bufferBlockedSlotsForDate(iso: string): Set<string> {
    const existing = bookedTimesForDate(iso)
    const out = new Set<string>()
    for (const slot of TIME_SLOTS) {
      if (isSlotBlockedByBuffer(slot, existing)) out.add(slot)
    }
    return out
  }

  // Cap del día (máx 3 shoots): si llega al cap → bloqueamos todos los slots
  function isDayAtCapFor(iso: string): boolean {
    return isDayAtCap(bookedCountForDate(iso))
  }

  const todayIso = toISODate(today)
  const dayUnavailable = selectedDate ? unavailableTimesForDate(selectedDate) : []
  const dayBufferBlocked = selectedDate ? bufferBlockedSlotsForDate(selectedDate) : new Set<string>()
  const dayAtCap = selectedDate ? isDayAtCapFor(selectedDate) : false

  async function handleBook(extraordinary = false) {
    if (!address || !selectedDate || !selectedTime) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    setError(null)
    const { bookShoot } = await import('@/actions/photo-shoots')
    const fd = new FormData()
    fd.append('property_address', address)
    fd.append('shoot_date', selectedDate)
    fd.append('shoot_time', selectedTime)
    fd.append('notes', notes)
    if (locationLink) fd.append('location_link', locationLink)
    if (extraordinary) fd.append('is_extraordinary', 'true')
    const res = await bookShoot(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else setSuccess(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-[#C9A84C]/25 bg-[#131313] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-lg">
              📅
            </div>
            <div>
              <p className="text-base font-bold text-[#F5F0E8]">Reservar sesión fotográfica</p>
              <p className="text-[11px] text-[#9A9080]">Calendario de Jelle · Selecciona fecha y hora</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="mb-3 text-5xl">📨</div>
            <p className="text-lg font-bold text-[#C9A84C]">¡Solicitud enviada a Jelle!</p>
            <p className="mt-1 text-sm text-[#9A9080]">
              {selectedDate} · {selectedTime}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-xs text-[#9A9080]">
              Jelle recibirá un aviso. Te avisaremos por email y notificación cuando confirme,
              proponga otra hora o no pueda ese día.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-[#C9A84C] px-8 py-2.5 text-sm font-bold uppercase tracking-[0.06em] text-black hover:bg-[#E8C96A]"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
            {/* Calendar */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
                >
                  ‹
                </button>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#F5F0E8]">
                  {MONTHS_ES[month]} {year}
                </p>
                <button
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
                >
                  ›
                </button>
              </div>

              {/* Weekday headers */}
              <div className="mb-1.5 grid grid-cols-7 gap-1">
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#9A9080]">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell, i) => {
                  const shoots = bookedTimesForDate(cell.iso).length
                  const isSelected = selectedDate === cell.iso
                  const isToday = cell.iso === todayIso
                  const isPast = cell.iso < todayIso
                  const isFullDayBlocked = isFullDayBlocked_(cell.iso)
                  const atCap = isDayAtCap(shoots)
                  const isFull = atCap || isFullDayBlocked
                  const disabled = !cell.inMonth || isPast || isFull

                  return (
                    <button
                      key={i}
                      disabled={disabled}
                      onClick={() => {
                        setSelectedDate(cell.iso)
                        setSelectedTime(null)
                        setError(null)
                      }}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${
                        disabled
                          ? isFullDayBlocked && cell.inMonth && !isPast
                            ? 'cursor-not-allowed border-blue-400/40 bg-blue-500/8 text-blue-300/60'
                            : atCap && cell.inMonth && !isPast
                              ? 'cursor-not-allowed border-red-500/30 bg-red-500/8 text-red-400/60'
                              : 'cursor-not-allowed border-transparent text-[#9A9080]/20'
                          : isSelected
                            ? 'border-[#C9A84C] bg-[#C9A84C] text-black font-bold'
                            : isToday
                              ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5 text-[#F5F0E8]'
                              : 'border-white/8 bg-[#1C1C1C] text-[#F5F0E8] hover:border-[#C9A84C]/40'
                      }`}
                    >
                      <span>{cell.date.getDate()}</span>
                      {isFullDayBlocked && cell.inMonth && !isPast && (
                        <span className="text-[8px] font-bold text-blue-300/80">NO DISP</span>
                      )}
                      {!isFullDayBlocked && atCap && cell.inMonth && !isPast && (
                        <span className="text-[8px] text-red-400">LLENO</span>
                      )}
                      {!isFullDayBlocked && !atCap && cell.inMonth && shoots > 0 && (
                        <span className={`text-[8px] ${isSelected ? 'text-black/70' : 'text-[#C9A84C]'}`}>
                          {shoots}/{MAX_SHOOTS_PER_DAY}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-[#9A9080]">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-[#C9A84C]/40 bg-[#C9A84C]/5" />
                  Hoy
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#C9A84C]" />
                  Seleccionado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-red-400 bg-red-500/10" />
                  Lleno (3/3)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-blue-400/50 bg-blue-500/10" />
                  Jelle no disponible
                </span>
              </div>

              {/* Reglas — visible siempre */}
              <p className="mt-3 rounded-lg bg-[#0A0A0A] px-3 py-2 text-[10px] leading-relaxed text-[#9A9080]">
                ⓘ Cada shoot dura ~{SHOOT_DURATION_HOURS}h. Después hay {SHOOT_BUFFER_HOURS}h de margen para que Jelle se desplace.
                Máximo {MAX_SHOOTS_PER_DAY} shoots/día. Horario: 09:30–15:00.
              </p>
            </div>

            {/* Right panel — slots + form */}
            <div className="border-t border-white/8 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              {!selectedDate ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 text-4xl opacity-30">📅</div>
                  <p className="text-sm font-semibold text-[#9A9080]">Selecciona un día</p>
                  <p className="mt-1 text-xs text-[#9A9080]/60">
                    Verás los horarios disponibles aquí
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
                    Horarios · {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>

                  {dayAtCap && !extraordinaryMode && (
                    <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      Día lleno ({MAX_SHOOTS_PER_DAY}/{MAX_SHOOTS_PER_DAY} shoots).
                      Pulsa <strong>Solicitud extraordinaria</strong> abajo si es urgente.
                    </p>
                  )}

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const takenDirect = dayUnavailable.includes(slot)
                      const blockedByBuffer = dayBufferBlocked.has(slot) && !takenDirect
                      const blockedByCap = dayAtCap && !takenDirect && !blockedByBuffer
                      // En modo extraordinaria, solo bloqueamos el slot exacto reservado
                      const disabled = extraordinaryMode ? takenDirect : (takenDirect || blockedByBuffer || blockedByCap)
                      const selected = selectedTime === slot
                      return (
                        <button
                          key={slot}
                          disabled={disabled}
                          onClick={() => { setSelectedTime(slot); setError(null) }}
                          className={`rounded-lg border py-2 text-xs font-bold transition ${
                            disabled
                              ? takenDirect
                                ? 'cursor-not-allowed border-red-500/20 bg-red-500/5 text-red-400/40 line-through'
                                : blockedByBuffer
                                  ? 'cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-400/50'
                                  : 'cursor-not-allowed border-white/5 bg-[#1C1C1C]/50 text-[#9A9080]/30'
                              : selected
                                ? extraordinaryMode
                                  ? 'border-purple-400 bg-purple-500/30 text-purple-100'
                                  : 'border-[#C9A84C] bg-[#C9A84C] text-black'
                                : 'border-white/10 bg-[#1C1C1C] text-[#F5F0E8] hover:border-[#C9A84C]/40'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>

                  {!extraordinaryMode && (
                    <p className="mb-4 rounded-lg bg-[#0A0A0A] px-3 py-2 text-[10px] text-[#9A9080]">
                      ⓘ Los huecos en ámbar están bloqueados por margen ({SHOOT_BUFFER_HOURS}h alrededor de cada shoot).
                    </p>
                  )}

                  {selectedTime && (
                    <div className="space-y-3 border-t border-white/8 pt-4">
                      {extraordinaryMode && (
                        <div className="rounded-lg border border-purple-400/30 bg-purple-500/8 px-3 py-2 text-[11px] text-purple-200">
                          ⚠️ <strong>Solicitud extraordinaria.</strong> Saltas las reglas estándar (horario, margen o cap diario).
                          Jelle decide caso por caso. Explica el motivo en notas.
                        </div>
                      )}
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
                          Dirección de la propiedad *
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Calle Mayor 12, Altea"
                          className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
                          🗺️ Link de Google Maps (opcional)
                        </label>
                        <input
                          type="url"
                          value={locationLink}
                          onChange={(e) => setLocationLink(e.target.value)}
                          placeholder="https://maps.google.com/..."
                          className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
                        />
                        <p className="mt-1 text-[10px] text-[#6A6070]">
                          Ayuda a Jelle a encontrar la casa exacta. Pégalo desde la app de Google Maps → Compartir → Copiar enlace.
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
                          {extraordinaryMode ? 'Motivo de la excepción *' : 'Notas para Jelle (opcional)'}
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={extraordinaryMode ? 'Villa de 12M€, propietario solo puede ese día...' : 'Acceso, código portal, mejor luz tarde, etc.'}
                          className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
                        />
                      </div>
                      {error && (
                        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                          {error}
                        </p>
                      )}
                      <button
                        onClick={() => handleBook(extraordinaryMode)}
                        disabled={loading || !address || (extraordinaryMode && !notes.trim())}
                        className={`w-full rounded-xl py-3 text-sm font-bold uppercase tracking-[0.06em] transition disabled:opacity-50 ${
                          extraordinaryMode
                            ? 'bg-purple-500 text-white hover:bg-purple-600'
                            : 'bg-[#C9A84C] text-black hover:bg-[#E8C96A]'
                        }`}
                      >
                        {loading
                          ? 'Reservando...'
                          : extraordinaryMode
                            ? `⚠️ Pedir excepción a las ${selectedTime}`
                            : `📅 Reservar ${selectedTime}`}
                      </button>
                    </div>
                  )}

                  {/* Botón toggle modo extraordinaria */}
                  <button
                    type="button"
                    onClick={() => {
                      setExtraordinaryMode(!extraordinaryMode)
                      setSelectedTime(null)
                      setError(null)
                    }}
                    className={`mt-4 w-full rounded-lg border py-2 text-[11px] font-semibold transition ${
                      extraordinaryMode
                        ? 'border-white/15 bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]'
                        : 'border-purple-400/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10'
                    }`}
                  >
                    {extraordinaryMode
                      ? '↩ Volver a reserva normal'
                      : '⚠️ Necesito algo fuera de las reglas (Solicitud extraordinaria)'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
