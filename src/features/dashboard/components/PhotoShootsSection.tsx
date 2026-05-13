'use client'

import { useState, useTransition } from 'react'
import { BookShootingCalendar } from './BookShootingCalendar'
import { cancelShootAsAgent } from '@/actions/photo-shoots'
import type { Database } from '@/types/database'

type PhotoShoot = Database['public']['Tables']['photo_shoots']['Row']

interface PhotoShootsSectionProps {
  shoots: PhotoShoot[]
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; explain: string }> = {
  requested: {
    label: 'Pendiente de Jelle',
    color: 'text-[#C9A84C]',
    bg: 'bg-[#C9A84C]/15',
    explain: 'Esperando confirmación. Jelle recibió aviso por email y notificación.',
  },
  scheduled: {
    label: 'Confirmado',
    color: 'text-[#2ECC9A]',
    bg: 'bg-[#2ECC9A]/15',
    explain: 'Jelle confirmó el shoot. Anótalo en tu agenda.',
  },
  completed: {
    label: 'Completado',
    color: 'text-[#9A9080]',
    bg: 'bg-[#9A9080]/15',
    explain: 'Sesión hecha. Las fotos están en proceso de edición.',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    explain: 'Cancelado por ti.',
  },
  rejected: {
    label: 'Rechazado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    explain: 'Jelle no pudo ese día. Reserva otra fecha.',
  },
}

function formatES(dateIso: string) {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PhotoShootsSection({ shoots }: PhotoShootsSectionProps) {
  const [showBooking, setShowBooking] = useState(false)
  const [pending, startTransition] = useTransition()
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  function handleCancel(id: string) {
    setCancelingId(id)
    startTransition(async () => {
      await cancelShootAsAgent(id)
      setCancelingId(null)
    })
  }

  // Separar activos (futuros + pendientes) de históricos para mostrar lo relevante arriba
  const todayIso = new Date().toISOString().split('T')[0]
  const active = shoots.filter(
    (s) => s.shoot_date >= todayIso && s.status !== 'cancelled' && s.status !== 'rejected',
  )
  const past = shoots.filter(
    (s) => !active.includes(s),
  ).slice(0, 3)

  return (
    <div className="mb-5 rounded-2xl border border-white/8 bg-[#131313] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#F5F0E8]">Sesiones fotográficas</p>
          <p className="text-[11px] text-[#9A9080]">
            Tus shoots con <strong>Jelle</strong>
          </p>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#F5F0E8] transition hover:bg-white/10"
        >
          Book Shooting
        </button>
      </div>

      {shoots.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-[#9A9080]">
            Aún no has reservado ningún shoot
          </p>
          <p className="mt-1 text-xs text-[#9A9080]/60">
            Pulsa <strong>Book Shooting</strong> para reservar con Jelle
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9080]">
                Activos ({active.length})
              </p>
              {active.map((shoot) => {
                const meta = STATUS_META[shoot.status as string] ?? STATUS_META.requested
                const canCancel = shoot.status === 'requested' || shoot.status === 'scheduled'
                return (
                  <div key={shoot.id} className="rounded-xl border border-white/8 bg-[#1C1C1C] p-3.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-bold text-[#F5F0E8]">
                        {shoot.property_address || shoot.property_reference || 'Sin dirección'}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9A9080]">
                      📅 {formatES(shoot.shoot_date)} · {shoot.shoot_time?.slice(0, 5)}
                    </p>
                    <p className={`mt-1.5 text-[11px] ${meta.color}`}>{meta.explain}</p>
                    {canCancel && (
                      <button
                        disabled={pending && cancelingId === shoot.id}
                        onClick={() => handleCancel(shoot.id)}
                        className="mt-2.5 text-[11px] font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-50"
                      >
                        {cancelingId === shoot.id ? 'Cancelando...' : 'Cancelar shoot'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {past.length > 0 && (
            <>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[#9A9080]">
                Historial reciente
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((shoot) => {
                  const meta = STATUS_META[shoot.status as string] ?? STATUS_META.requested
                  return (
                    <div
                      key={shoot.id}
                      className="rounded-lg border border-white/6 bg-[#1C1C1C] p-3"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-[#F5F0E8]">
                          {shoot.property_address || shoot.property_reference || 'Sin dirección'}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9A9080]">
                        {formatES(shoot.shoot_date)} · {shoot.shoot_time?.slice(0, 5)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {showBooking && <BookShootingCalendar onClose={() => setShowBooking(false)} />}
    </div>
  )
}
