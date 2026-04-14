'use client'

import { useState, useTransition } from 'react'
import { deletePhoto, deletePhotoSet, updatePhoto } from '@/actions/photographer'

interface PhotoItem {
  id: string
  storage_path: string
  file_name: string | null
  is_drone: boolean
  sort_order: number
  shoot_id: string | null
  created_at: string
  agent_id: string
}

interface PhotoSet {
  key: string
  shoot_id: string | null
  agent_id: string
  agent_name: string | null
  property_reference: string | null
  property_address: string | null
  photos: PhotoItem[]
  created_at: string
}

interface PhotoSetsManagerProps {
  sets: PhotoSet[]
}

export function PhotoSetsManager({ sets: initialSets }: PhotoSetsManagerProps) {
  const [sets, setSets] = useState(initialSets)
  const [viewSet, setViewSet] = useState<PhotoSet | null>(null)
  const [isPending, startTransition] = useTransition()

  function removePhotoLocally(photoId: string) {
    setSets((prev) =>
      prev
        .map((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== photoId) }))
        .filter((s) => s.photos.length > 0)
    )
    setViewSet((prev) => prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : null)
  }

  function handleDeletePhoto(photoId: string) {
    if (!window.confirm('¿Eliminar esta foto? No se puede recuperar.')) return
    removePhotoLocally(photoId)
    startTransition(async () => { await deletePhoto(photoId) })
  }

  function handleDeleteSet(shootId: string | null) {
    if (!shootId) {
      window.alert('Este set no está vinculado a un shoot. Elimina las fotos individualmente.')
      return
    }
    if (!window.confirm('¿Eliminar TODO el set? Todas las fotos y el shoot vuelve a "scheduled".')) return
    setSets((prev) => prev.filter((s) => s.shoot_id !== shootId))
    setViewSet(null)
    startTransition(async () => { await deletePhotoSet(shootId) })
  }

  function handleToggleDrone(photoId: string, current: boolean) {
    setSets((prev) =>
      prev.map((s) => ({
        ...s,
        photos: s.photos.map((p) => (p.id === photoId ? { ...p, is_drone: !current } : p)),
      }))
    )
    setViewSet((prev) =>
      prev ? { ...prev, photos: prev.photos.map((p) => (p.id === photoId ? { ...p, is_drone: !current } : p)) } : null
    )
    startTransition(async () => { await updatePhoto(photoId, { is_drone: !current }) })
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          📁 Mis sets subidos ({sets.length})
        </p>
      </div>

      {sets.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9A9080]/60">No has subido sets todavía</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <div
              key={set.key}
              className="group rounded-xl border border-white/8 bg-[#1C1C1C] p-4 transition hover:border-[#C9A84C]/40"
            >
              <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-[#0A0A0A]">
                {set.photos[0] && (
                  <img src={set.photos[0].storage_path} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="text-sm font-semibold text-[#F5F0E8]">
                {set.property_reference || set.property_address || 'Set sin referencia'}
              </p>
              <p className="mt-0.5 text-xs text-[#9A9080]">
                {set.agent_name ?? 'Agente'} · {set.photos.length} foto{set.photos.length !== 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-[10px] text-[#9A9080]/60">
                {new Date(set.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setViewSet(set)}
                  className="flex-1 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 py-1.5 text-[10px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/20"
                >
                  👁 Ver / editar
                </button>
                <button
                  onClick={() => handleDeleteSet(set.shoot_id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400 transition hover:bg-red-500/20"
                  title="Eliminar set completo"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set viewer modal */}
      {viewSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#C9A84C]/25 bg-[#131313] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-[#F5F0E8]">
                  {viewSet.property_reference || viewSet.property_address || 'Set'}
                </p>
                <p className="text-xs text-[#9A9080]">
                  {viewSet.agent_name} · {viewSet.photos.length} fotos
                </p>
              </div>
              <button onClick={() => setViewSet(null)} className="text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
            </div>

            {viewSet.photos.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#9A9080]">El set está vacío</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {viewSet.photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-white/8 bg-[#0A0A0A]">
                    <div className="aspect-square">
                      <img src={photo.storage_path} alt={photo.file_name || ''} className="h-full w-full object-cover" />
                    </div>
                    {photo.is_drone && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-[#C9A84C]">
                        🚁 DRONE
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => handleToggleDrone(photo.id, photo.is_drone)}
                        disabled={isPending}
                        className="flex-1 rounded-md bg-[#C9A84C]/80 px-2 py-1 text-[10px] font-bold text-black hover:bg-[#C9A84C] disabled:opacity-50"
                        title="Marcar/desmarcar drone"
                      >
                        {photo.is_drone ? '🚁 Es drone' : 'Marcar drone'}
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={isPending}
                        className="rounded-md bg-red-500/80 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
