'use client'

import { useState, useTransition } from 'react'
import { deliverShootPhotos } from '@/actions/photo-shoots'
import { useRouter } from 'next/navigation'

interface PendingDelivery {
  id: string
  agent_name: string | null
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  shoot_time: string
  notes: string | null
  status: string
}

export function PendingDeliveriesList({ deliveries }: { deliveries: PendingDelivery[] }) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [driveLink, setDriveLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDeliver(shootId: string) {
    setError(null)
    if (!driveLink.trim()) {
      setError('Pega el link de la carpeta de Drive con las fotos')
      return
    }
    startTransition(async () => {
      const res = await deliverShootPhotos(shootId, driveLink.trim())
      if (res?.error) {
        setError(res.error)
        return
      }
      setActiveId(null)
      setDriveLink('')
      router.refresh()
    })
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-5 text-center">
        <p className="text-xs text-[#9A9080]">
          No tienes sesiones pendientes de entregar fotos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deliveries.map((d) => {
        const isOpen = activeId === d.id
        const refOrAddr = d.property_reference || d.property_address || 'Sin referencia'
        const dateLabel = new Date(d.shoot_date + 'T00:00:00').toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        return (
          <div
            key={d.id}
            className="rounded-2xl border border-white/8 bg-[#131313] p-4 transition hover:border-[#C9A84C]/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#C9A84C]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#C9A84C]">
                    {refOrAddr}
                  </span>
                  <span className="text-[10px] text-[#9A9080]">
                    {dateLabel} · {d.shoot_time}
                  </span>
                </div>
                {d.property_address && d.property_reference && (
                  <p className="mt-1 truncate text-xs text-[#9A9080]">
                    📍 {d.property_address}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#F5F0E8]">
                  Agente: <strong>{d.agent_name ?? '—'}</strong>
                </p>
                {d.notes && (
                  <p className="mt-1 text-[11px] italic text-[#9A9080]">"{d.notes}"</p>
                )}
              </div>
              {!isOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(d.id)
                    setDriveLink('')
                    setError(null)
                  }}
                  className="shrink-0 rounded-lg bg-[#C9A84C] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-black transition hover:bg-[#E8C96A]"
                >
                  📤 Entregar fotos
                </button>
              )}
            </div>

            {isOpen && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#C9A84C]/20 bg-[#0A0A0A] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                  📸 Pega el link público de Drive con las fotos
                </p>
                <p className="text-[11px] text-[#9A9080]">
                  Asegúrate de que la carpeta esté <strong>compartida públicamente</strong>{' '}
                  (Cualquiera con el enlace puede ver). El sistema descargará las fotos y se
                  las enviará al agente.
                </p>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                />
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeliver(d.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                        Enviando…
                      </>
                    ) : (
                      <>🚀 Enviar al agente</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(null)
                      setDriveLink('')
                      setError(null)
                    }}
                    disabled={isPending}
                    className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium text-[#9A9080] transition hover:text-[#F5F0E8] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
