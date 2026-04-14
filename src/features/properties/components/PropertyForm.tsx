'use client'

import { useState, useTransition, useEffect } from 'react'
import { saveProperty, generateDescription } from '@/actions/properties'

interface AgentPhoto {
  id: string
  storage_path: string
  file_name: string | null
  is_drone: boolean
  property_id: string | null
}

interface PropertyFormProps {
  availablePhotos?: AgentPhoto[]
  storageBaseUrl?: string
}

const ZONES = [
  'Altea','Albir','Calpe','Javea','Moraira','Benissa',
  'Denia','Benidorm','La Nucia','Polop','Finestrat',
]

const TYPES = ['villa','apartment','townhouse','land','commercial','penthouse']

const FEATURES = [
  { id: 'has_pool', label: 'Pool' },
  { id: 'has_garage', label: 'Garage' },
  { id: 'has_garden', label: 'Garden' },
  { id: 'has_terrace', label: 'Terrace' },
  { id: 'has_ac', label: 'A/C' },
  { id: 'has_sea_view', label: 'Sea View' },
]

const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'
const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'

export function PropertyForm({ availablePhotos = [], storageBaseUrl = '' }: PropertyFormProps = {}) {
  const [isPending, startTransition] = useTransition()
  const [isAI, startAI] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [descEN, setDescEN] = useState('')
  const [descNL, setDescNL] = useState('')
  const [reference, setReference] = useState('')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [formState, setFormState] = useState({
    property_type: 'villa',
    zone: 'Altea',
    bedrooms: '',
    bathrooms: '',
    build_area_m2: '',
    plot_area_m2: '',
    price: '',
    location: '',
    title: '',
    description_es: '',
    ibi_annual: '',
    basura_annual: '',
    community_annual: '',
  })

  function update(k: string, v: string) {
    setFormState((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(publish: boolean) {
    setError(null)
    setSuccess(null)
    const fd = new FormData()
    Object.entries(formState).forEach(([k, v]) => fd.append(k, v))
    fd.append('description_en', descEN)
    fd.append('description_nl', descNL)
    fd.append('reference', reference)
    fd.append('selected_photo_ids', JSON.stringify([...selectedPhotoIds]))
    const form = document.getElementById('propForm') as HTMLFormElement
    if (form) {
      FEATURES.forEach((f) => {
        const el = form.querySelector(`input[name="${f.id}"]`) as HTMLInputElement
        if (el?.checked) fd.append(f.id, 'on')
      })
    }
    startTransition(async () => {
      const res = await saveProperty(fd, publish)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(publish ? '🚀 Propiedad enviada a publicar en Suprema — recibirás una notificación cuando termine' : '✅ Borrador guardado')
        setTimeout(() => setSuccess(null), 5000)
      }
    })
  }

  function handleGenerateAI(lang: 'en' | 'es' | 'nl' = 'en') {
    const fd = new FormData()
    Object.entries(formState).forEach(([k, v]) => fd.append(k, v))
    fd.append('lang', lang)
    const features = FEATURES
      .filter((f) => {
        const el = document.getElementById(f.id) as HTMLInputElement
        return el?.checked
      })
      .map((f) => f.label)
      .join(',')
    fd.append('features', features)

    startAI(async () => {
      const res = await generateDescription(fd)
      if (res.description) {
        if (lang === 'en') setDescEN(res.description)
        else if (lang === 'nl') setDescNL(res.description)
        else if (lang === 'es') update('description_es', res.description)
      }
      if (res.error) setError(res.error)
    })
  }

  return (
    <form id="propForm" onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Basic Info */}
      <section className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          📋 Información básica
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Tipo de propiedad</label>
            <select className={inputClass} value={formState.property_type} onChange={(e) => update('property_type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Zona *</label>
            <select className={inputClass} value={formState.zone} onChange={(e) => update('zone', e.target.value)}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Precio €</label>
            <input type="number" className={inputClass} placeholder="750000" value={formState.price} onChange={(e) => update('price', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección / Ubicación</label>
            <input type="text" className={inputClass} placeholder="Calle Mayor 12, Altea" value={formState.location} onChange={(e) => update('location', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Título</label>
            <input type="text" className={inputClass} placeholder="Luxury Villa Sea Views" value={formState.title} onChange={(e) => update('title', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          📐 Características
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Habitaciones</label>
            <input type="number" className={inputClass} placeholder="4" value={formState.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Baños</label>
            <input type="number" className={inputClass} placeholder="3" value={formState.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Superficie construida m²</label>
            <input type="number" className={inputClass} placeholder="280" value={formState.build_area_m2} onChange={(e) => update('build_area_m2', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Parcela m²</label>
            <input type="number" className={inputClass} placeholder="1200" value={formState.plot_area_m2} onChange={(e) => update('plot_area_m2', e.target.value)} />
          </div>
        </div>

        {/* Features toggles */}
        <div className="mt-4 flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3.5 py-2 text-xs font-medium text-[#9A9080] transition has-[:checked]:border-[#C9A84C]/40 has-[:checked]:bg-[#C9A84C]/10 has-[:checked]:text-[#C9A84C]">
              <input type="checkbox" id={f.id} name={f.id} className="sr-only" />
              {f.label}
            </label>
          ))}
        </div>
      </section>

      {/* Photos - Jelle's uploads + extra */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📸 Fotos de Jelle ({availablePhotos.length} disponibles) · {selectedPhotoIds.size} seleccionadas
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedPhotoIds(new Set(availablePhotos.map((p) => p.id)))}
              disabled={availablePhotos.length === 0}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] transition hover:text-[#F5F0E8] disabled:opacity-40"
            >
              Seleccionar todas
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhotoIds(new Set())}
              disabled={selectedPhotoIds.size === 0}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] transition hover:text-[#F5F0E8] disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>
        </div>

        {availablePhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#0A0A0A] p-8 text-center">
            <p className="text-sm text-[#9A9080]">Aún no hay fotos subidas por Jelle.</p>
            <p className="mt-1 text-xs text-[#9A9080]/60">Cuando Jelle suba fotos para tu propiedad, aparecerán aquí para seleccionarlas.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {availablePhotos.map((photo) => {
              const selected = selectedPhotoIds.has(photo.id)
              const imgUrl = `${storageBaseUrl}/storage/v1/object/public/property-photos/${photo.storage_path}`
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setSelectedPhotoIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(photo.id)) next.delete(photo.id)
                      else next.add(photo.id)
                      return next
                    })
                  }}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                    selected ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/30' : 'border-white/8 hover:border-white/20'
                  }`}
                >
                  <img src={imgUrl} alt={photo.file_name || ''} className="h-full w-full object-cover" />
                  {photo.is_drone && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-[#C9A84C]">
                      🚁 DRONE
                    </span>
                  )}
                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#C9A84C]/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-sm font-bold text-black">
                        ✓
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <p className="mt-3 text-[11px] text-[#9A9080]/70">
          💡 Las fotos con drone se ordenan automáticamente al final al publicar en Suprema.
        </p>
      </section>

      {/* Descriptions */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          📝 Descripción multi-idioma
        </p>

        <div className="space-y-5">
          {/* English */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelClass}>🇬🇧 English (Suprema, principal)</label>
              <button
                type="button"
                onClick={() => handleGenerateAI('en')}
                disabled={isAI}
                className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/15 disabled:opacity-50"
              >
                {isAI ? '⏳' : '✨ AI'}
              </button>
            </div>
            <textarea
              rows={4}
              className={inputClass}
              placeholder="Professional description without bullets or emojis..."
              value={descEN}
              onChange={(e) => setDescEN(e.target.value)}
            />
          </div>

          {/* Spanish */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelClass}>🇪🇸 Español</label>
              <button
                type="button"
                onClick={() => handleGenerateAI('es')}
                disabled={isAI}
                className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/15 disabled:opacity-50"
              >
                {isAI ? '⏳' : '✨ AI'}
              </button>
            </div>
            <textarea
              rows={4}
              className={inputClass}
              placeholder="Descripción en español..."
              value={formState.description_es}
              onChange={(e) => update('description_es', e.target.value)}
            />
          </div>

          {/* Dutch */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelClass}>🇳🇱 Nederlands (Dutch)</label>
              <button
                type="button"
                onClick={() => handleGenerateAI('nl')}
                disabled={isAI}
                className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/15 disabled:opacity-50"
              >
                {isAI ? '⏳' : '✨ AI'}
              </button>
            </div>
            <textarea
              rows={4}
              className={inputClass}
              placeholder="Professionele beschrijving in het Nederlands..."
              value={descNL}
              onChange={(e) => setDescNL(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Annual expenses */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          💰 Gastos anuales
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>IBI €</label>
            <input type="number" className={inputClass} placeholder="1200" value={formState.ibi_annual} onChange={(e) => update('ibi_annual', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Basura €</label>
            <input type="number" className={inputClass} placeholder="150" value={formState.basura_annual} onChange={(e) => update('basura_annual', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Comunidad €/mes</label>
            <input type="number" className={inputClass} placeholder="120" value={formState.community_annual} onChange={(e) => update('community_annual', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Feedback */}
      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {success && <p className="rounded-lg border border-[#2ECC9A]/20 bg-[#2ECC9A]/10 px-4 py-3 text-sm text-[#2ECC9A]">{success}</p>}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-[#9A9080] transition hover:border-white/20 hover:text-[#F5F0E8] disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : '💾 Guardar borrador'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isPending}
          className="flex-1 rounded-xl bg-[#C9A84C] py-3 text-sm font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-50 sm:flex-none sm:px-8"
        >
          {isPending ? 'Publicando...' : '🚀 Publicar en Suprema'}
        </button>
      </div>
    </form>
  )
}
