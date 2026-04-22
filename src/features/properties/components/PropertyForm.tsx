'use client'

import { useState, useTransition, useEffect } from 'react'
import { saveProperty, generateDescription } from '@/actions/properties'
import { OwnerPicker } from './OwnerPicker'
import type { Property } from '@/types/database'

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
  initialProperty?: Property | null
}

const ZONES = ['Altea','Albir','Calpe','Javea','Moraira','Benissa','Denia','Benidorm','La Nucia','Polop','Finestrat']
const PROPERTY_TYPES = [
  'villa', 'apartment', 'penthouse', 'townhouse', 'flat', 'bungalow', 'duplex',
  'finca', 'country_house', 'detached_house', 'semi_detached', 'terraced_house',
  'loft', 'plot', 'commercial',
]
const LISTING_TYPES = [
  { id: 'sale', label: 'Venta' },
  { id: 'rental', label: 'Alquiler' },
  { id: 'rental_temporary', label: 'Alquiler temporal' },
]
const STATUS_TAGS = [
  'Exclusive', 'New', 'New build', 'Reduced', 'Offer', 'Opportunity',
  'Front line', 'Sea views', 'Key ready', 'To reform', 'Investment',
  'In the center', 'Bank', 'Licencia Turística', 'No Commissions',
]
const VIEWS_OPTIONS = [
  'Sea and mountains', 'To the sea', 'First line', 'Open', 'Panoramas',
  'To the mountain', 'Good views', 'To the garden', 'Community area',
  'Golf course', 'Others',
]
const KITCHEN_TYPES = ['American', 'French', 'Furnished', 'Independent', 'Open', 'With cupboards', 'With island', 'Two kitchens']
const ORIENTATIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const POOL_TYPES = ['Private', 'Community', 'Salt', 'Chlorine', 'Indoor', 'Heated']
const AC_TYPES = ['Cold', 'Heat', 'Cold and heat']
const TERRACE_TYPES = ['Open', 'Closed', 'Both']
const GARDEN_TYPES = ['Private', 'Community']
const FURNITURE_STATUS = [
  { id: 'none', label: 'No amueblado' },
  { id: 'some', label: 'Algunos muebles' },
  { id: 'full', label: 'Con muebles' },
]
const OCCUPATION = [
  { id: 'free', label: 'Libre' },
  { id: 'empty', label: 'Propiedad vacía' },
  { id: 'rented', label: 'Con inquilino' },
  { id: 'occupied_illegally', label: 'Ocupada ilegalmente' },
]
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const PERIODS = [
  { id: 'annual', label: 'Anual' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'bimonthly', label: 'Bimensual' },
  { id: 'quarterly', label: 'Trimestral' },
  { id: 'weekly', label: 'Semanal' },
]

type TabId = 'basics' | 'structure' | 'equipment' | 'price' | 'owner' | 'address' | 'descriptions' | 'photos' | 'portals' | 'keys'

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'basics', label: 'Datos', emoji: '📋' },
  { id: 'structure', label: 'Estructura', emoji: '📐' },
  { id: 'equipment', label: 'Equipamiento', emoji: '✨' },
  { id: 'price', label: 'Precio', emoji: '💰' },
  { id: 'owner', label: 'Propietario', emoji: '👤' },
  { id: 'address', label: 'Dirección', emoji: '📍' },
  { id: 'descriptions', label: 'Textos', emoji: '📝' },
  { id: 'photos', label: 'Fotos', emoji: '📸' },
  { id: 'portals', label: 'Portales', emoji: '🌐' },
  { id: 'keys', label: 'Llaves', emoji: '🔑' },
]

const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080] disabled:opacity-50'
const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

function CheckField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-xs text-[#F5F0E8] transition hover:border-[#C9A84C]/40 has-[:checked]:border-[#C9A84C]/60 has-[:checked]:bg-[#C9A84C]/10">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-[#C9A84C]" />
      <span>{label}</span>
    </label>
  )
}

export function PropertyForm({ availablePhotos = [], storageBaseUrl = '', initialProperty = null }: PropertyFormProps = {}) {
  const [activeTab, setActiveTab] = useState<TabId>('basics')
  const [isPending, startTransition] = useTransition()
  const [isAI, startAI] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const isEditing = !!initialProperty?.id

  // Shared state
  const [formState, setFormState] = useState({
    property_type: initialProperty?.property_type ?? 'villa',
    listing_type: initialProperty?.listing_type ?? 'sale',
    zone: initialProperty?.zone ?? 'Altea',
    status_tags: (initialProperty?.status_tags as string[] | null) ?? [] as string[],
    // Textos (multi-lang)
    title: initialProperty?.title ?? '',
    title_headline: initialProperty?.title_headline ?? '',
    title_in_text: initialProperty?.title_in_text ?? '',
    description_es: initialProperty?.description_es ?? '',
    description_en: initialProperty?.description_en ?? '',
    description_nl: initialProperty?.description_nl ?? '',
  })

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [ownerId, setOwnerId] = useState<string | null>(initialProperty?.owner_id ?? null)

  // Scroll al form cuando entramos en modo edición
  useEffect(() => {
    if (isEditing) {
      const form = document.getElementById('propForm')
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isEditing])

  // Precarga TODOS los inputs uncontrolled desde initialProperty al montar
  useEffect(() => {
    if (!initialProperty) return
    const form = document.getElementById('propForm') as HTMLFormElement | null
    if (!form) return

    // Entries del initialProperty → setea el input/select con ese name si existe
    for (const [key, value] of Object.entries(initialProperty)) {
      if (value === null || value === undefined) continue
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        `[name="${key}"]`
      )
      if (!el) continue
      if (el.type === 'checkbox' && el instanceof HTMLInputElement) {
        el.checked = Boolean(value)
      } else {
        el.value = String(value)
      }
    }
    // Owner
    if (initialProperty.owner_id) setOwnerId(initialProperty.owner_id)
    // Fotos ya vinculadas a esta propiedad
    // (not loaded here — el form siempre muestra las disponibles)
  }, [initialProperty])

  function update<K extends keyof typeof formState>(k: K, v: (typeof formState)[K]) {
    setFormState((p) => ({ ...p, [k]: v }))
  }

  function toggleStatusTag(tag: string) {
    setFormState((p) => ({
      ...p,
      status_tags: p.status_tags.includes(tag) ? p.status_tags.filter((t) => t !== tag) : [...p.status_tags, tag],
    }))
  }

  async function handleGenerateAI(lang: 'en' | 'es' | 'nl') {
    const form = document.getElementById('propForm') as HTMLFormElement
    if (!form) return
    const fd = new FormData(form)
    fd.append('lang', lang)
    // Features para prompt
    const features: string[] = []
    const featureKeys = ['has_pool', 'has_garage', 'has_garden', 'has_terrace', 'has_ac', 'has_sea_view', 'has_fireplace', 'has_jacuzzi', 'has_balcony']
    for (const k of featureKeys) {
      if (fd.get(k)) features.push(k.replace('has_', '').replace('_', ' '))
    }
    fd.append('features', features.join(','))

    startAI(async () => {
      const res = await generateDescription(fd)
      if (res.description) {
        if (lang === 'en') update('description_en', res.description)
        else if (lang === 'nl') update('description_nl', res.description)
        else update('description_es', res.description)
      }
      if (res.error) setError(res.error)
    })
  }

  function handleSubmit(publish: boolean) {
    setError(null); setSuccess(null)
    const form = document.getElementById('propForm') as HTMLFormElement
    if (!form) return
    const fd = new FormData(form)
    fd.set('title', formState.title)
    fd.set('title_headline', formState.title_headline)
    fd.set('title_in_text', formState.title_in_text)
    fd.set('description_es', formState.description_es)
    fd.set('description_en', formState.description_en)
    fd.set('description_nl', formState.description_nl)
    fd.set('status_tags', formState.status_tags.join(','))
    fd.set('selected_photo_ids', JSON.stringify([...selectedPhotoIds]))

    startTransition(async () => {
      const res = await saveProperty(fd, publish)
      if (res?.error) setError(res.error)
      else setSuccess(publish ? '🚀 Propiedad enviada a Sooprema — recibirás notificación al completarse' : '✅ Borrador guardado')
    })
  }

  const sectionClass = 'rounded-2xl border border-white/8 bg-[#131313] p-5'

  const ip = initialProperty
  const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

  return (
    <form id="propForm" onSubmit={(e) => e.preventDefault()} className="space-y-5">
      {/* Hidden id para edición */}
      {ip?.id && <input type="hidden" name="id" value={ip.id} />}

      {/* Banner modo edición */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C9A84C]">Editando propiedad</p>
            <p className="mt-0.5 text-sm text-[#F5F0E8]">{ip?.reference} — {ip?.title || ip?.location || 'Sin título'}</p>
          </div>
          <a href="/properties" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#9A9080] hover:text-[#F5F0E8]">✕ Cancelar</a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === tab.id ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Datos básicos ═══ */}
      <section hidden={activeTab !== 'basics'} className={sectionClass} style={{ borderTop: '1px solid #C9A84C' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Tipo de operación</label>
              <select name="listing_type" value={formState.listing_type} onChange={(e) => update('listing_type', e.target.value as typeof formState.listing_type)} className={inputClass}>
                {LISTING_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo de propiedad</label>
              <select name="property_type" value={formState.property_type} onChange={(e) => update('property_type', e.target.value as typeof formState.property_type)} className={inputClass}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Zona *</label>
              <select name="zone" value={formState.zone} onChange={(e) => update('zone', e.target.value)} className={inputClass}>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Referencia (auto si vacío)</label>
              <input name="reference" defaultValue={ip?.reference ?? ''} className={inputClass} placeholder="A001" />
            </div>
            <div>
              <label className={labelClass}>Título de trabajo</label>
              <input value={formState.title} onChange={(e) => update('title', e.target.value)} className={inputClass} placeholder="Villa con vistas al mar" />
            </div>
            <div>
              <label className={labelClass}>Vistas</label>
              <select name="views" className={inputClass} defaultValue={ip?.views ?? ''}>
                <option value="">—</option>
                {VIEWS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Status tags */}
          <div className="mt-5">
            <label className={labelClass}>Etiquetas (multi-selección)</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_TAGS.map((tag) => {
                const selected = formState.status_tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleStatusTag(tag)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                      selected ? 'border-[#C9A84C] bg-[#C9A84C] text-black' : 'border-white/10 bg-[#1C1C1C] text-[#9A9080] hover:text-[#F5F0E8]'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Año construcción</label>
              <input name="year_built" type="number" defaultValue={num(ip?.year_built)} className={inputClass} placeholder="2013" />
            </div>
            <div>
              <label className={labelClass}>Año reforma</label>
              <input name="year_reformed" type="number" defaultValue={num(ip?.year_reformed)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado ocupación</label>
              <select name="occupation_status" className={inputClass} defaultValue={ip?.occupation_status ?? ''}>
                <option value="">—</option>
                {OCCUPATION.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
      </section>

      {/* ═══ TAB: Estructura ═══ */}
      <section hidden={activeTab !== 'structure'} className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={labelClass}>Habitaciones</label>
              <input name="bedrooms" type="number" className={inputClass} placeholder="3" />
            </div>
            <div>
              <label className={labelClass}>Baños</label>
              <input name="bathrooms" type="number" className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Aseos</label>
              <input name="toilets" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Salones</label>
              <input name="living_rooms" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Comedores</label>
              <input name="dining_rooms" type="number" className={inputClass} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Tipo de cocina</label>
              <select name="kitchen_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {KITCHEN_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Planta</label>
              <input name="floor_number" type="number" className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Total plantas casa</label>
              <input name="total_floors" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Orientación</label>
              <select name="orientation" className={inputClass} defaultValue="">
                <option value="">—</option>
                {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Superficies (m²)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={labelClass}>Parcela</label>
              <input name="plot_area_m2" type="number" className={inputClass} placeholder="873" />
            </div>
            <div>
              <label className={labelClass}>Construidos</label>
              <input name="build_area_m2" type="number" className={inputClass} placeholder="127" />
            </div>
            <div>
              <label className={labelClass}>Útiles</label>
              <input name="useful_area_m2" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Terraza</label>
              <input name="terrace_area_m2" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Jardín</label>
              <input name="garden_area_m2" type="number" className={inputClass} />
            </div>
          </div>
      </section>

      {/* ═══ TAB: Equipamiento ═══ */}
      <section hidden={activeTab !== 'equipment'} className={sectionClass}>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Principales</h3>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <CheckField name="has_pool" label="🏊 Piscina" />
            <CheckField name="has_garage" label="🚗 Garaje" />
            <CheckField name="has_garden" label="🌳 Jardín" />
            <CheckField name="has_terrace" label="☀️ Terraza" />
            <CheckField name="has_ac" label="❄️ A/C" />
            <CheckField name="has_sea_view" label="🌊 Vistas al mar" />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Detalle de equipamiento</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Tipo piscina</label>
              <select name="pool_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {POOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo A/C</label>
              <select name="ac_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {AC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Plazas garaje</label>
              <input name="garage_spaces" type="number" className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Tipo terraza</label>
              <select name="terrace_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {TERRACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo jardín</label>
              <select name="garden_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {GARDEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Muebles</label>
              <select name="furniture_status" className={inputClass} defaultValue="">
                <option value="">—</option>
                {FURNITURE_STATUS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Extras</h3>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <CheckField name="has_fireplace" label="🔥 Chimenea" />
            <CheckField name="has_storage" label="📦 Trastero" />
            <CheckField name="has_bbq" label="🍖 Barbacoa" />
            <CheckField name="has_alarm" label="🚨 Alarma" />
            <CheckField name="has_elevator" label="🛗 Ascensor" />
            <CheckField name="has_jacuzzi" label="🛁 Jacuzzi" />
            <CheckField name="has_balcony" label="🏠 Balcón" />
            <CheckField name="has_bar" label="🍷 Bar" />
            <CheckField name="has_guest_apartment" label="🏡 Apt. invitados" />
            <CheckField name="has_summer_kitchen" label="🌞 Cocina verano" />
          </div>
      </section>

      {/* ═══ TAB: Precio ═══ */}
      <section hidden={activeTab !== 'price'} className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Precio € *</label>
              <input name="price" type="number" className={inputClass} placeholder="549000" />
            </div>
            <div>
              <label className={labelClass}>Precio neto €</label>
              <input name="price_net" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Precio final €</label>
              <input name="price_final" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraoferta €</label>
              <input name="price_counter_offer" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>% Comisión</label>
              <input name="commission_percentage" type="number" step="0.1" className={inputClass} placeholder="5" />
            </div>
            <div>
              <label className={labelClass}>Importe comisión €</label>
              <input name="commission_amount" type="number" className={inputClass} />
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Alquiler (si aplica)</h3>
          <div>
            <label className={labelClass}>Importe renta €/mes</label>
            <input name="rental_amount" type="number" className={`${inputClass} sm:max-w-xs`} />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Gastos anuales</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div>
                <label className={labelClass}>IBI</label>
                <input name="ibi_annual" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Periodo</label>
                <select name="ibi_period" className={inputClass} defaultValue="annual">
                  {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div>
                <label className={labelClass}>Basura</label>
                <input name="basura_annual" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Periodo</label>
                <select name="basura_period" className={inputClass} defaultValue="annual">
                  {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div>
                <label className={labelClass}>Comunidad</label>
                <input name="community_annual" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Periodo</label>
                <select name="community_period" className={inputClass} defaultValue="annual">
                  {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Observaciones comunidad</label>
            <textarea name="community_observations" rows={2} className={inputClass} />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Vivienda turística</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Código vivienda turística</label>
              <input name="tourist_housing_code" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select name="tourist_housing_status" className={inputClass} defaultValue="">
                <option value="">—</option>
                <option value="available">Disponible</option>
                <option value="in_process">En proceso</option>
              </select>
            </div>
          </div>
      </section>

      {/* ═══ TAB: Propietario ═══ */}
      <section hidden={activeTab !== 'owner'} className={sectionClass}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">👤 Propietario</p>
        <p className="mb-4 text-xs text-[#9A9080]">Busca un propietario existente o crea uno nuevo. Estos datos se reusan en futuras propiedades del mismo propietario.</p>
        <OwnerPicker value={ownerId} onChange={(id) => setOwnerId(id)} />
      </section>

      {/* ═══ TAB: Dirección ═══ */}
      <section hidden={activeTab !== 'address'} className={sectionClass}>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className={labelClass}>Calle</label>
              <input name="street_name" className={inputClass} placeholder="Carrer Barro" />
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input name="street_number" className={inputClass} placeholder="7" />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Población</label>
              <input name="city" className={inputClass} placeholder="Altea" />
            </div>
            <div>
              <label className={labelClass}>Código postal</label>
              <input name="postal_code" className={inputClass} placeholder="03590" />
            </div>
            <div>
              <label className={labelClass}>Ubicación (texto libre)</label>
              <input name="location" className={inputClass} placeholder="Paradiso, Altea" />
            </div>
          </div>
        <p className="mt-3 text-[11px] text-[#9A9080]/70">
          💡 Si Sooprema marca la dirección en rojo, prueba variantes (ej: &quot;Carrer Barro&quot; vs &quot;Calle La Basa&quot;). Población debe ser la oficial (Altea, Moraira...).
        </p>
      </section>

      {/* ═══ TAB: Descripciones ═══ */}
      <section hidden={activeTab !== 'descriptions'} className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Título principal (web header)</label>
              <input value={formState.title_headline} onChange={(e) => update('title_headline', e.target.value)} className={inputClass} placeholder="Mediterranean Villa with Flat Garden" />
            </div>
            <div>
              <label className={labelClass}>Título en texto (negrita)</label>
              <input value={formState.title_in_text} onChange={(e) => update('title_in_text', e.target.value)} className={inputClass} placeholder="For sale in Altea" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {([
              { lang: 'en', flag: '🇬🇧', label: 'English (Sooprema principal)', key: 'description_en' },
              { lang: 'es', flag: '🇪🇸', label: 'Español', key: 'description_es' },
              { lang: 'nl', flag: '🇳🇱', label: 'Nederlands (Dutch)', key: 'description_nl' },
            ] as const).map((d) => (
              <div key={d.lang}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={labelClass}>{d.flag} {d.label}</label>
                  <button type="button" onClick={() => handleGenerateAI(d.lang)} disabled={isAI} className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold text-[#C9A84C] hover:bg-[#C9A84C]/15 disabled:opacity-50">
                    {isAI ? '⏳' : '✨ AI'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={formState[d.key]}
                  onChange={(e) => update(d.key, e.target.value)}
                  className={inputClass}
                  placeholder="Descripción profesional sin bullets ni emojis..."
                />
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-[#9A9080]/70">
            💡 Sooprema traduce automáticamente a 7 idiomas desde el inglés. Basta con tener EN bien escrito, pero ES/NL ayudan con el SEO en local.
          </p>
      </section>

      {/* ═══ TAB: Fotos ═══ */}
      <section hidden={activeTab !== 'photos'} className={sectionClass}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              📸 Fotos de Jelle ({availablePhotos.length} disponibles) · {selectedPhotoIds.size} seleccionadas
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedPhotoIds(new Set(availablePhotos.map((p) => p.id)))} disabled={availablePhotos.length === 0} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] disabled:opacity-40">
                Todas
              </button>
              <button type="button" onClick={() => setSelectedPhotoIds(new Set())} disabled={selectedPhotoIds.size === 0} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] disabled:opacity-40">
                Limpiar
              </button>
            </div>
          </div>

          {availablePhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#0A0A0A] p-8 text-center">
              <p className="text-sm text-[#9A9080]">Sin fotos aún. Cuando Jelle suba fotos aparecerán aquí.</p>
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
                    onClick={() => setSelectedPhotoIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(photo.id)) next.delete(photo.id)
                      else next.add(photo.id)
                      return next
                    })}
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition ${selected ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/30' : 'border-white/8 hover:border-white/20'}`}
                  >
                    <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                    {photo.is_drone && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-[#C9A84C]">🚁 DRONE</span>}
                    {selected && <div className="absolute inset-0 flex items-center justify-center bg-[#C9A84C]/30"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-sm font-bold text-black">✓</div></div>}
                  </button>
                )
              })}
            </div>
          )}
        <p className="mt-3 text-[11px] text-[#9A9080]/70">
          💡 Las fotos de drone se ordenan automáticamente al final (Idealista no las acepta como principal).
        </p>
      </section>

      {/* ═══ TAB: Portales ═══ */}
      <section hidden={activeTab !== 'portals'} className={sectionClass}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🌐 Publicar en</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckField name="publish_sooprema" label="✓ Web CBI (Sooprema)" defaultChecked />
            <CheckField name="publish_idealista" label="✓ Idealista" defaultChecked />
            <CheckField name="publish_imoluc" label="Imoluc (XML feed)" />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Certificado energético</h3>
          <div className="flex flex-wrap gap-2">
            {ENERGY.map((e) => (
              <label key={e} className="flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-2 text-xs font-bold text-[#F5F0E8] has-[:checked]:border-[#C9A84C] has-[:checked]:bg-[#C9A84C] has-[:checked]:text-black">
                <input type="radio" name="energy_certificate" value={e} defaultChecked={e === 'D'} className="sr-only" />
                {e}
              </label>
            ))}
          </div>
      </section>

      {/* ═══ TAB: Llaves ═══ */}
      <section hidden={activeTab !== 'keys'} className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>¿Quién tiene las llaves?</label>
              <input name="keys_holder" className={inputClass} placeholder="Propietario, agente, portería..." />
            </div>
            <div>
              <label className={labelClass}>Teléfono de contacto</label>
              <input name="keys_phone" type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Recoger llaves en</label>
              <input name="keys_pickup" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número de llaves</label>
              <input name="keys_count" type="number" className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Info de visita</label>
            <textarea name="visit_info" rows={3} className={inputClass} placeholder="Horarios, accesos especiales, contacto..." />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Notas internas</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Descripción oficina (solo interno)</label>
              <textarea name="office_description" rows={3} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nota de propiedad (interna)</label>
              <textarea name="internal_note" rows={3} className={inputClass} />
            </div>
          </div>
      </section>

      {/* Feedback */}
      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {success && <p className="rounded-lg border border-[#2ECC9A]/20 bg-[#2ECC9A]/10 px-4 py-3 text-sm text-[#2ECC9A]">{success}</p>}

      {/* Actions (fixed bottom bar) — sobre el bottom-nav en mobile */}
      <div
        className="pb-safe sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 -mx-6 flex flex-col gap-2 border-t border-[#C9A84C]/15 bg-[#0A0A0A]/95 px-4 pt-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3 md:bottom-0"
      >
        <div className="flex justify-center gap-1.5 sm:justify-start">
          {TABS.map((t, i) => (
            <span key={t.id} className={`h-1.5 w-5 rounded-full transition ${activeTab === t.id ? 'bg-[#C9A84C]' : 'bg-white/10'}`} title={`${i + 1}. ${t.label}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isPending}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#9A9080] active:scale-[0.98] hover:text-[#F5F0E8] disabled:opacity-50 sm:flex-none sm:py-2.5"
          >
            💾 Borrador
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isPending}
            className="flex-1 rounded-xl bg-[#C9A84C] px-6 py-3 text-xs font-bold uppercase tracking-[0.06em] text-black active:scale-[0.98] hover:bg-[#E8C96A] disabled:opacity-50 sm:flex-none sm:py-2.5"
          >
            🚀 Publicar
          </button>
        </div>
      </div>
    </form>
  )
}
