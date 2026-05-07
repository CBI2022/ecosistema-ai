'use client'

import { useTransition, useState } from 'react'
import { completeShoot } from '@/actions/photo-shoots'

interface Shoot {
  id: string
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  shoot_time: string
  status: string
  notes: string | null
  agent_name: string | null
  agent_phone: string | null
}

interface Props {
  shoots: Shoot[]
}

function formatES(dateIso: string) {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function UpcomingShootsActions({ shoots }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const todayIso = new Date().toISOString().split('T')[0]

  function handleComplete(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await completeShoot(id)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131313] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2ECC9A]/15 text-base">🚀</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2ECC9A]">
          Próximos shoots ({shoots.length})
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {shoots.length === 0 ? (
        <p className="text-xs text-[#9A9080]/60">No tienes shoots confirmados próximos.</p>
      ) : (
        <div className="space-y-2.5">
          {shoots.map((s) => {
            const passed = s.shoot_date <= todayIso
            return (
              <div key={s.id} className="rounded-xl border border-white/6 bg-[#1C1C1C] p-3.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#F5F0E8]">
                      {s.property_address || s.property_reference || 'Sin dirección'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9A9080]">
                      👤 {s.agent_name ?? 'Agente'}
                      {s.agent_phone ? ` · ${s.agent_phone}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[#2ECC9A]">
                      📅 {formatES(s.shoot_date)} · <strong>{s.shoot_time.slice(0, 5)}</strong>
                    </p>
                  </div>
                  <span className="rounded-full bg-[#2ECC9A]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#2ECC9A]">
                    Confirmado
                  </span>
                </div>

                {s.notes && (
                  <p className="mb-2 rounded-lg bg-[#0A0A0A] px-3 py-2 text-xs text-[#9A9080]">
                    📝 {s.notes}
                  </p>
                )}

                {passed && (
                  <button
                    disabled={pending}
                    onClick={() => handleComplete(s.id)}
                    className="w-full rounded-lg bg-[#2ECC9A] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition active:scale-95 hover:bg-[#3DD9A8] disabled:opacity-50"
                  >
                    ✓ Marcar completado
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
