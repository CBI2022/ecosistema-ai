'use client'

import { useState, useEffect, useMemo } from 'react'

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00']
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
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function unavailableTimesForDate(iso: string) {
    return [...bookedTimesForDate(iso), ...blockedTimesForDate(iso)]
  }

  const todayIso = toISODate(today)
  const bookedToday = selectedDate ? unavailableTimesForDate(selectedDate) : []

  async function handleBook() {
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
                  const count = unavailableTimesForDate(cell.iso).length
                  const isSelected = selectedDate === cell.iso
                  const isToday = cell.iso === todayIso
                  const isPast = cell.iso < todayIso
                  const isFullDayBlocked = isFullDayBlocked_(cell.iso)
                  const isFull = count >= TIME_SLOTS.length || isFullDayBlocked
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
                      {!isFullDayBlocked && cell.inMonth && count > 0 && !isFull && (
                        <span className={`text-[8px] ${isSelected ? 'text-black/70' : 'text-[#C9A84C]'}`}>
                          {count}/{TIME_SLOTS.length}
                        </span>
                      )}
                      {!isFullDayBlocked && isFull && cell.inMonth && !isPast && (
                        <span className="text-[8px] text-red-400">LLENO</span>
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
                  Lleno
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-blue-400/50 bg-blue-500/10" />
                  Jelle no disponible
                </span>
              </div>
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

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const taken = bookedToday.includes(slot)
                      const selected = selectedTime === slot
                      return (
                        <button
                          key={slot}
                          disabled={taken}
                          onClick={() => { setSelectedTime(slot); setError(null) }}
                          className={`rounded-lg border py-2 text-xs font-bold transition ${
                            taken
                              ? 'cursor-not-allowed border-red-500/20 bg-red-500/5 text-red-400/40 line-through'
                              : selected
                                ? 'border-[#C9A84C] bg-[#C9A84C] text-black'
                                : 'border-white/10 bg-[#1C1C1C] text-[#F5F0E8] hover:border-[#C9A84C]/40'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>

                  {selectedTime && (
                    <div className="space-y-3 border-t border-white/8 pt-4">
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
                          Notas (opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Acceso, instrucciones..."
                          className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
                        />
                      </div>
                      {error && (
                        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                          {error}
                        </p>
                      )}
                      <button
                        onClick={handleBook}
                        disabled={loading || !address}
                        className="w-full rounded-xl bg-[#C9A84C] py-3 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                      >
                        {loading ? 'Reservando...' : `📅 Reservar ${selectedTime}`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
