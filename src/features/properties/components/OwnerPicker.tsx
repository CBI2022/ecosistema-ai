'use client'

import { useEffect, useRef, useState } from 'react'
import { searchOwners, createOwner } from '@/actions/owners'

interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  nif: string | null
  language: string | null
}

interface OwnerPickerProps {
  value: string | null
  onChange: (ownerId: string | null, owner: Owner | null) => void
}

export function OwnerPicker({ value, onChange }: OwnerPickerProps) {
  const [selected, setSelected] = useState<Owner | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load selected owner details
  useEffect(() => {
    if (!value) { setSelected(null); return }
    ;(async () => {
      const res = await searchOwners('')
      const found = (res.owners || []).find((o: Owner) => o.id === value) || null
      setSelected(found)
    })()
  }, [value])

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    if (!showPicker) return
    debRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await searchOwners(query)
      setOwners(res.owners || [])
      setLoading(false)
    }, 250)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [query, showPicker])

  function handlePick(owner: Owner) {
    setSelected(owner)
    onChange(owner.id, owner)
    setShowPicker(false)
    setQuery('')
  }

  function handleClear() {
    setSelected(null)
    onChange(null, null)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await createOwner(fd)
    if (res.error) { alert(res.error); return }
    if (res.owner) {
      handlePick(res.owner)
      setShowCreate(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
  const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

  return (
    <div>
      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[#F5F0E8]">👤 {selected.full_name}</p>
            <p className="mt-0.5 text-[11px] text-[#9A9080]">
              {selected.email || '—'} {selected.phone ? '· ' + selected.phone : ''} {selected.nif ? '· NIF ' + selected.nif : ''}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-[#9A9080] hover:text-[#F5F0E8]"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C9A84C]/40 bg-[#C9A84C]/5 px-4 py-3 text-sm font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
        >
          + Seleccionar propietario
        </button>
      )}

      {/* Hidden input para form */}
      <input type="hidden" name="owner_id" value={selected?.id || ''} />

      {/* Picker modal — bottom-sheet en mobile, centrado en desktop */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowPicker(false)}>
          <div className="pb-sheet flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#C9A84C]/25 bg-[#131313] px-5 pt-5 shadow-2xl sm:max-h-[85vh] sm:rounded-2xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-bold text-[#F5F0E8]">Buscar propietario</p>
              <button type="button" onClick={() => setShowPicker(false)} className="text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="🔍 Nombre, email, teléfono, NIF..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClass}
            />

            <div className="mt-3 max-h-[300px] overflow-y-auto rounded-lg border border-white/6">
              {loading ? (
                <p className="py-6 text-center text-sm text-[#9A9080]">Buscando...</p>
              ) : owners.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9A9080]">Sin resultados</p>
              ) : (
                owners.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handlePick(o)}
                    className="flex w-full items-center justify-between gap-3 border-b border-white/6 px-4 py-3 text-left last:border-0 hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#F5F0E8]">{o.full_name}</p>
                      <p className="text-[11px] text-[#9A9080]">
                        {o.email || '—'} {o.phone ? '· ' + o.phone : ''} {o.nif ? '· NIF ' + o.nif : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#C9A84C]">→</span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-3 w-full rounded-lg border border-[#2ECC9A]/25 bg-[#2ECC9A]/10 px-4 py-2.5 text-xs font-bold text-[#2ECC9A] hover:bg-[#2ECC9A]/15"
            >
              + Crear propietario nuevo
            </button>
          </div>
        </div>
      )}

      {/* Create modal — bottom-sheet en mobile */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="pb-sheet flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl border border-[#2ECC9A]/25 bg-[#131313] px-5 pt-5 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-[#F5F0E8]">+ Nuevo propietario</p>
              <button type="button" onClick={() => setShowCreate(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input name="first_name" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apellido</label>
                  <input name="last_name" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input name="phone" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>NIF / NIE</label>
                  <input name="nif" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Idioma</label>
                <select name="language" className={inputClass}>
                  <option value="">—</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="nl">Nederlands</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="ru">Русский</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Notas</label>
                <textarea name="notes" rows={2} className={inputClass} />
              </div>
            </div>
            <button type="submit" className="mt-4 h-12 w-full rounded-xl bg-[#2ECC9A] text-sm font-bold text-black transition active:scale-[0.98] hover:bg-[#3DDAAA]">
              Crear propietario
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
