'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkShootToProperty } from '@/actions/photo-shoots'

interface DeliveredShoot {
  id: string
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  delivered_at: string | null
  photos_drive_link: string | null
  notes: string | null
}

interface AgentDraftProperty {
  id: string
  reference: string | null
  zone: string | null
  property_type: string | null
  street_name: string | null
}

interface Props {
  deliveries: DeliveredShoot[]
  draftProperties: AgentDraftProperty[]
}

/**
 * Banner que aparece en el Dashboard del agente cuando Jelle le ha entregado
 * fotos pero el agente aún no las ha asociado a ninguna propiedad.
 *
 * Permite asociar a una propiedad existente (en draft o publicada) o crear una
 * propiedad nueva con el link Drive ya cargado.
 */
export function PhotosDeliveredBanner({ deliveries, draftProperties }: Props) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (deliveries.length === 0) return null

  function handleLink(shootId: string) {
    if (!selectedPropertyId) {
      setError('Selecciona una propiedad')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await linkShootToProperty(shootId, selectedPropertyId)
      if (res?.error) {
        setError(res.error)
        return
      }
      setOpenId(null)
      setSelectedPropertyId('')
      router.refresh()
    })
  }

  function handleCreateNew(d: DeliveredShoot) {
    // Pasamos el link y referencia a la nueva propiedad vía query param
    const params = new URLSearchParams()
    if (d.photos_drive_link) params.set('drive_link', d.photos_drive_link)
    if (d.property_reference) params.set('reference', d.property_reference)
    if (d.property_address) params.set('address', d.property_address)
    params.set('shoot_id', d.id)
    router.push(`/properties?new=1&${params.toString()}`)
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#C9A84C]/30 bg-[#131313] p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-bold text-[#F5F0E8]">
          {deliveries.length === 1
            ? 'Tienes 1 set de fotos pendiente de Jelle'
            : `Tienes ${deliveries.length} sets de fotos pendientes de Jelle`}
        </h3>
      </div>

      <div className="space-y-2">
        {deliveries.map((d) => {
          const refOrAddr = d.property_reference || d.property_address || 'Sin referencia'
          const isOpen = openId === d.id
          return (
            <div
              key={d.id}
              className="rounded-xl border border-white/8 bg-[#131313] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#C9A84C]/20 px-2 py-0.5 text-[9px] font-bold uppercase text-[#C9A84C]">
                      {refOrAddr}
                    </span>
                    {d.delivered_at && (
                      <span className="text-[10px] text-[#9A9080]">
                        entregado{' '}
                        {new Date(d.delivered_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                  {d.property_address && d.property_reference && (
                    <p className="mt-1 truncate text-xs text-[#9A9080]">
                      📍 {d.property_address}
                    </p>
                  )}
                  {d.photos_drive_link && (
                    <a
                      href={d.photos_drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#C9A84C] hover:underline"
                    >
                      🔗 Ver carpeta de Drive
                    </a>
                  )}
                </div>
                {!isOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(d.id)
                      setSelectedPropertyId('')
                      setError(null)
                    }}
                    className="shrink-0 rounded-lg bg-[#C9A84C] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[#E8C96A]"
                  >
                    Asociar
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-3 space-y-3 rounded-lg border border-[#C9A84C]/20 bg-[#0A0A0A] p-3">
                  <p className="text-[10px] font-bold uppercase text-[#C9A84C]">
                    Asocia las fotos a una propiedad
                  </p>

                  {draftProperties.length > 0 ? (
                    <>
                      <p className="text-[11px] text-[#9A9080]">
                        Selecciona una propiedad que ya tengas creada (en cualquier estado):
                      </p>
                      <select
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                      >
                        <option value="">— Elige una propiedad —</option>
                        {draftProperties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.reference ?? '(sin ref)'} — {p.property_type ?? '?'} en {p.zone ?? '?'}{' '}
                            {p.street_name ? `· ${p.street_name}` : ''}
                          </option>
                        ))}
                      </select>
                      {error && <p className="text-xs text-red-400">{error}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleLink(d.id)}
                          disabled={isPending || !selectedPropertyId}
                          className="rounded-lg bg-[#C9A84C] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                        >
                          {isPending ? 'Asociando…' : 'Asociar a esta propiedad'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateNew(d)}
                          disabled={isPending}
                          className="rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-2 text-[11px] font-bold uppercase text-[#C9A84C] transition hover:bg-[#C9A84C]/20"
                        >
                          O crear propiedad nueva
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(null)
                            setError(null)
                          }}
                          className="rounded-lg px-3 py-2 text-[11px] text-[#9A9080] hover:text-[#F5F0E8]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-[#9A9080]">
                        No tienes propiedades existentes. Crea una nueva con estas fotos:
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCreateNew(d)}
                        className="rounded-lg bg-[#C9A84C] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[#E8C96A]"
                      >
                        + Crear propiedad nueva con estas fotos
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
