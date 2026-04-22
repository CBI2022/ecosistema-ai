'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProperty } from '@/actions/properties'
import type { Property } from '@/types/database'

interface PropertyListProps {
  properties: Property[]
}

function StatusBadge({ status }: { status: Property['suprema_status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Draft', cls: 'bg-white/10 text-[#9A9080]' },
    publishing: { label: 'Publishing...', cls: 'bg-yellow-500/15 text-yellow-400' },
    published: { label: 'Published', cls: 'bg-[#2ECC9A]/15 text-[#2ECC9A]' },
    error: { label: 'Error', cls: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status ?? 'pending'] ?? map.pending
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${s.cls}`}>{s.label}</span>
}

export function PropertyList({ properties }: PropertyListProps) {
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleEdit(id: string) {
    router.push(`/properties?edit=${id}`)
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await deleteProperty(id)
      if (res?.error) {
        setError(res.error)
      } else {
        setConfirmId(null)
        router.refresh()
      }
    })
  }

  if (properties.length === 0) return null

  const confirmProp = properties.find((p) => p.id === confirmId)

  return (
    <div>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">My Properties</h2>

      <div className="space-y-2.5">
        {properties.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-xl border border-white/8 bg-[#131313] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#F5F0E8]">
                {p.reference} — {p.title || p.location || 'Unnamed'}
              </p>
              <p className="mt-0.5 text-xs text-[#9A9080]">
                {p.zone} · €{p.price?.toLocaleString() ?? '—'} · {p.property_type}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={p.suprema_status} />

              <button
                type="button"
                onClick={() => handleEdit(p.id)}
                disabled={isPending}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#F5F0E8] disabled:opacity-50"
                aria-label={`Editar ${p.reference}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="hidden sm:inline">Editar</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmId(p.id)}
                disabled={isPending}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                aria-label={`Eliminar ${p.reference}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Bottom sheet de confirmación — mobile first */}
      {confirmProp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => !isPending && setConfirmId(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#131313] px-6 pb-sheet pt-6 shadow-2xl sm:rounded-2xl sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#F5F0E8]">¿Eliminar propiedad?</h3>
              <p className="mt-1 text-sm text-[#9A9080]">
                <strong className="text-[#F5F0E8]">{confirmProp.reference}</strong> — {confirmProp.title || confirmProp.location}
              </p>
              <p className="mt-3 text-xs text-[#9A9080]">
                Se eliminará de la base de datos. Esta acción no borra la propiedad de Sooprema si ya fue publicada.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-[#F5F0E8] hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmProp.id)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
