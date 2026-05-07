'use client'

import { useState, useTransition } from 'react'
import { blockDay, unblockDay } from '@/actions/photo-shoots'
import { TIME_SLOTS } from '@/features/photographer/lib/shoot-rules'

interface Block {
  id: string
  block_date: string
  block_time: string | null
  reason: string | null
}

interface Props {
  blocks: Block[]
}

function formatES(dateIso: string) {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function PhotographerBlocksManager({ blocks }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [time, setTime] = useState<string | 'all'>('all')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    if (!date) {
      setError('Selecciona una fecha')
      return
    }
    startTransition(async () => {
      const res = await blockDay(date, time === 'all' ? null : time, reason || null)
      if (res.error) setError(res.error)
      else {
        setDate('')
        setTime('all')
        setReason('')
        setOpen(false)
      }
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await unblockDay(id)
    })
  }

  const sorted = [...blocks].sort((a, b) => a.block_date.localeCompare(b.block_date))

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131313] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-base">🛑</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
            Días bloqueados ({blocks.length})
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-400 transition active:scale-95 hover:bg-blue-500/20"
        >
          {open ? '✕ Cerrar' : '+ Bloquear'}
        </button>
      </div>

      {open && (
        <div className="mb-4 space-y-3 rounded-xl border border-blue-400/20 bg-[#0A0A0A] p-4">
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#131313] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-blue-400/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">
              Hora (o todo el día)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTime('all')}
                className={`rounded-lg border py-2 text-xs font-bold transition ${
                  time === 'all'
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                    : 'border-white/10 bg-[#131313] text-[#9A9080] hover:border-blue-400/40'
                }`}
              >
                Todo el día
              </button>
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`rounded-lg border py-2 text-xs font-bold transition ${
                    time === t
                      ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                      : 'border-white/10 bg-[#131313] text-[#F5F0E8] hover:border-blue-400/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacaciones, cita médica, etc."
              className="w-full rounded-lg border border-white/10 bg-[#131313] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-blue-400/60 placeholder-[#6A6070]"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            onClick={handleAdd}
            className="w-full rounded-lg bg-blue-500 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition active:scale-95 hover:bg-blue-600 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : 'Bloquear'}
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-[#9A9080]/60">
          No tienes días bloqueados. Los bloqueos impiden que los agentes te reserven sesiones esos huecos.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-[#1C1C1C] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#F5F0E8]">
                  {formatES(b.block_date)}
                  {b.block_time ? <span className="text-blue-400"> · {b.block_time.slice(0, 5)}</span> : <span className="text-blue-400"> · todo el día</span>}
                </p>
                {b.reason && <p className="text-xs text-[#9A9080]">{b.reason}</p>}
              </div>
              <button
                disabled={pending}
                onClick={() => handleRemove(b.id)}
                className="text-xs font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
