'use client'

import { useState, useTransition } from 'react'
import { confirmShoot, rejectShoot, rescheduleShoot } from '@/actions/photo-shoots'

interface PendingShoot {
  id: string
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  shoot_time: string
  notes: string | null
  agent_name: string | null
  agent_phone: string | null
}

interface Props {
  shoots: PendingShoot[]
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00']

function formatES(dateIso: string) {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function PendingShootsList({ shoots }: Props) {
  const [pending, startTransition] = useTransition()
  const [openReject, setOpenReject] = useState<string | null>(null)
  const [openReschedule, setOpenReschedule] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (shoots.length === 0) return null

  function handleConfirm(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await confirmShoot(id)
      if (res.error) setError(res.error)
    })
  }

  function handleReject(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await rejectShoot(id, rejectReason || undefined)
      if (res.error) setError(res.error)
      else {
        setOpenReject(null)
        setRejectReason('')
      }
    })
  }

  function handleReschedule(id: string) {
    setError(null)
    if (!newDate || !newTime) {
      setError('Selecciona fecha y hora')
      return
    }
    startTransition(async () => {
      const res = await rescheduleShoot(id, newDate, newTime)
      if (res.error) setError(res.error)
      else {
        setOpenReschedule(null)
        setNewDate('')
        setNewTime('')
      }
    })
  }

  return (
    <div
      className="rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#1A1408] to-[#131313] p-4 sm:p-5"
      style={{ borderTop: '2px solid #C9A84C' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C]/15 text-base">🔔</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          Solicitudes pendientes ({shoots.length})
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {shoots.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-white/8 bg-[#1C1C1C] p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#F5F0E8]">
                  {s.property_address || s.property_reference || 'Sin dirección'}
                </p>
                <p className="mt-0.5 text-xs text-[#9A9080]">
                  👤 {s.agent_name ?? 'Agente'}
                  {s.agent_phone ? ` · ${s.agent_phone}` : ''}
                </p>
                <p className="mt-1 text-xs text-[#C9A84C]">
                  📅 {formatES(s.shoot_date)} · <strong>{s.shoot_time.slice(0, 5)}</strong>
                </p>
              </div>
              <span className="rounded-full bg-[#C9A84C]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#C9A84C]">
                Pendiente
              </span>
            </div>

            {s.notes && (
              <p className="mb-3 rounded-lg bg-[#0A0A0A] px-3 py-2 text-xs text-[#9A9080]">
                📝 {s.notes}
              </p>
            )}

            {/* Botones de acción */}
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={pending}
                onClick={() => handleConfirm(s.id)}
                className="rounded-lg bg-[#2ECC9A] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition active:scale-95 hover:bg-[#3DD9A8] disabled:opacity-50"
              >
                ✓ Confirmar
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  setOpenReschedule(openReschedule === s.id ? null : s.id)
                  setOpenReject(null)
                  setNewDate(s.shoot_date)
                  setNewTime(s.shoot_time.slice(0, 5))
                }}
                className="rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-[#C9A84C] transition active:scale-95 hover:bg-[#C9A84C]/20 disabled:opacity-50"
              >
                ↻ Reprogramar
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  setOpenReject(openReject === s.id ? null : s.id)
                  setOpenReschedule(null)
                }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-red-400 transition active:scale-95 hover:bg-red-500/20 disabled:opacity-50"
              >
                ✕ Rechazar
              </button>
            </div>

            {/* Panel reprogramar */}
            {openReschedule === s.id && (
              <div className="mt-3 space-y-2 rounded-lg border border-[#C9A84C]/20 bg-[#0A0A0A] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                  Nueva fecha y hora
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#131313] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                  />
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#131313] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={pending}
                  onClick={() => handleReschedule(s.id)}
                  className="w-full rounded-lg bg-[#C9A84C] px-3 py-2 text-xs font-bold uppercase tracking-wide text-black transition active:scale-95 hover:bg-[#E8C96A] disabled:opacity-50"
                >
                  {pending ? 'Guardando...' : 'Confirmar nueva fecha'}
                </button>
              </div>
            )}

            {/* Panel rechazar */}
            {openReject === s.id && (
              <div className="mt-3 space-y-2 rounded-lg border border-red-500/20 bg-[#0A0A0A] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Motivo (opcional)
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Estoy de viaje ese día"
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-[#131313] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-red-500/60 placeholder-[#6A6070]"
                />
                <button
                  disabled={pending}
                  onClick={() => handleReject(s.id)}
                  className="w-full rounded-lg bg-red-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition active:scale-95 hover:bg-red-600 disabled:opacity-50"
                >
                  {pending ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
