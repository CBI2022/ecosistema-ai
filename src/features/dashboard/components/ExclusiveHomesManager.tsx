'use client'

import { useState, useTransition, useRef } from 'react'
import { addExclusiveHome, updateExclusiveHome, deleteExclusiveHome } from '@/actions/exclusive-homes'
import type { Database } from '@/types/database'

type ExclusiveHome = Database['public']['Tables']['exclusive_homes']['Row']

interface ExclusiveHomesManagerProps {
  homes: ExclusiveHome[]
  canManage: boolean
}

const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

function fmt(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

function HomeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ExclusiveHome
  onSave: (fd: FormData) => void
  onCancel: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initial?.cover_image ?? null)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget)) }}
      className="space-y-4 rounded-2xl border border-[#C9A84C]/20 bg-[#131313] p-5"
      style={{ borderTop: '1px solid #C9A84C' }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
        {initial ? '✏️ Editar Exclusive Home' : '➕ Nueva Exclusive Home'}
      </p>

      {/* Cover image */}
      <div>
        <label className={labelClass}>Cover Image</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-[#C9A84C]/30 bg-[#0A0A0A] transition hover:border-[#C9A84C]/60"
          style={{ height: 140 }}
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover opacity-80" />
          ) : (
            <div className="flex h-full items-center justify-center flex-col gap-2">
              <span className="text-3xl opacity-30">🏡</span>
              <p className="text-xs text-[#9A9080]">Click para subir imagen</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            name="cover_image"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPreview(URL.createObjectURL(f))
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Título *</label>
          <input type="text" name="title" className={inputClass} defaultValue={initial?.title} required placeholder="Villa Mediterránea con vistas al mar" />
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input type="text" name="location" className={inputClass} defaultValue={initial?.location ?? ''} placeholder="Moraira, Alicante" />
        </div>
        <div>
          <label className={labelClass}>Precio €</label>
          <input type="number" name="price" className={inputClass} defaultValue={initial?.price ?? ''} placeholder="1500000" />
        </div>
        <div>
          <label className={labelClass}>Dormitorios</label>
          <input type="number" name="bedrooms" className={inputClass} defaultValue={initial?.bedrooms ?? ''} placeholder="4" />
        </div>
        <div>
          <label className={labelClass}>Baños</label>
          <input type="number" name="bathrooms" className={inputClass} defaultValue={initial?.bathrooms ?? ''} placeholder="3" />
        </div>
        <div>
          <label className={labelClass}>Superficie m²</label>
          <input type="number" name="area_m2" className={inputClass} defaultValue={initial?.area_m2 ?? ''} placeholder="350" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Características (separadas por coma)</label>
          <input
            type="text"
            name="features"
            className={inputClass}
            defaultValue={initial?.features?.join(', ') ?? ''}
            placeholder="Piscina infinita, Vistas al mar, Garaje doble"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea name="description" rows={2} className={inputClass} defaultValue={initial?.description ?? ''} placeholder="Descripción confidencial para el equipo..." />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 rounded-xl bg-[#C9A84C] py-2.5 text-sm font-bold text-black hover:bg-[#E8C96A]">
          {initial ? 'Guardar cambios' : 'Añadir'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-[#9A9080] hover:text-[#F5F0E8]">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function ExclusiveHomesManager({ homes: initial, canManage }: ExclusiveHomesManagerProps) {
  const [homes, setHomes] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(fd: FormData) {
    startTransition(async () => {
      await addExclusiveHome(fd)
      setShowForm(false)
    })
  }

  function handleUpdate(id: string, fd: FormData) {
    startTransition(async () => {
      await updateExclusiveHome(id, fd)
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta Exclusive Home?')) return
    startTransition(async () => {
      await deleteExclusiveHome(id)
      setHomes((prev) => prev.filter((h) => h.id !== id))
    })
  }

  return (
    <div
      className="mb-5 rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] p-5"
      style={{ borderTop: '1px solid #C9A84C' }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#C9A84C]/20 bg-[#C9A84C]/12 text-xl">💎</div>
          <div>
            <p className="text-sm font-bold text-[#F5F0E8]">Exclusive Homes</p>
            <p className="text-[11px] text-[#9A9080]/70">Off-market · Private listings · Handle with discretion</p>
          </div>
        </div>
        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 py-1.5 text-xs font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/20"
          >
            ＋ Añadir
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5">
          <HomeForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {homes.length === 0 && !showForm ? (
        <div className="py-8 text-center text-sm text-[#9A9080]/50">No exclusive homes añadidas.</div>
      ) : (
        <div className="space-y-3">
          {homes.map((home) =>
            editingId === home.id ? (
              <HomeForm
                key={home.id}
                initial={home}
                onSave={(fd) => handleUpdate(home.id, fd)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={home.id}
                className="group overflow-hidden rounded-[14px] border border-[#C9A84C]/20 bg-[#1C1C1C] transition-all hover:border-[#C9A84C]/40"
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[#111]">
                    {home.cover_image ? (
                      <img src={home.cover_image} alt={home.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl opacity-20">🏡</div>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-[#C9A84C] px-1 py-0.5 text-[7px] font-black uppercase tracking-wider text-black">💎</span>
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#F5F0E8] truncate">{home.title}</p>
                    {home.location && <p className="text-xs text-[#9A9080]">📍 {home.location}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9A9080]">
                      {home.price && <span className="font-bold text-[#C9A84C]">{fmt(home.price)}</span>}
                      {home.bedrooms && <span>{home.bedrooms} bed</span>}
                      {home.bathrooms && <span>{home.bathrooms} bath</span>}
                      {home.area_m2 && <span>{home.area_m2}m²</span>}
                    </div>
                  </div>
                  {/* Actions */}
                  {canManage && (
                    <div className="flex shrink-0 flex-col gap-1.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => setEditingId(home.id)}
                        className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#9A9080] hover:text-[#F5F0E8]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(home.id)}
                        disabled={isPending}
                        className="rounded border border-red-500/20 px-2 py-1 text-[10px] text-red-400 hover:border-red-500/40"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
