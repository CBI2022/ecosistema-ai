'use client'

import { useState, useTransition, useEffect } from 'react'
import { saveProperty, generateDescription } from '@/actions/properties'
import { OwnerPicker } from './OwnerPicker'
import { AddressPicker } from './AddressPicker'
import type { Property } from '@/types/database'

interface AgentPhoto {
  id: string
  storage_path: string
  file_name: string | null
  is_drone: boolean
  property_id: string | null
}

interface AgentOption {
  id: string
  full_name: string | null
  email: string
}

interface PropertyFormProps {
  availablePhotos?: AgentPhoto[]
  storageBaseUrl?: string
  initialProperty?: Property | null
  agentOptions?: AgentOption[] | null
  defaultAgentId?: string | null
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
// Lista oficial Sooprema (Type of Label) — incluye Negotiable, Sea views como tag
const STATUS_TAGS = [
  'Exclusive', 'New', 'New build', 'Reduced', 'Offer', 'Opportunity',
  'Front line', 'Sea views', 'Key ready', 'To reform', 'Investment',
  'In the center', 'Bank', 'Licencia Turística', 'No Commissions',
  'Negotiable', 'Rented', 'Unused', 'Under construction', 'Cancelled',
  'Awarded', 'Suspended',
]
// Lista oficial Sooprema (21 opciones de vistas — captura confirmada)
const VIEWS_OPTIONS = [
  'Community area', 'First line', 'Golf course', 'Good views', 'Green zone',
  'National Park', 'Open', 'Others', 'Panoramas', 'Sea and mountains',
  'Sports area', 'To the Castle', 'To the city', 'To the exterior',
  'To the garden', 'To the mountain', 'To the park', 'To the sea',
  'To the square', 'To the street', 'To the valley',
]
const KITCHEN_TYPES = ['American', 'French', 'Furnished', 'Independent', 'Open', 'With cupboards', 'With island', 'Two kitchens']
const ORIENTATIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
// Lista oficial Sooprema (Pool) — captura confirmada
const POOL_TYPES = ['Climatized', 'Community', 'Cover', 'Infinity', 'Inside', 'Not available', 'Pool with Jacuzzi', 'Private', 'Yes']
// Lista oficial Sooprema (Air Conditioning) — captura confirmada
const AC_TYPES = ['Centralised', 'Cold', 'Duct-based', 'Hot/Cold', 'Not available', 'Pre-installation', 'Split', 'Yes']
const TERRACE_TYPES = ['Open', 'Closed', 'Both']
const GARDEN_TYPES = ['Private', 'Community']
// Lista oficial Sooprema (Furnitures type) — captura confirmada
const FURNITURE_STATUS = [
  { id: 'unfurnished', label: 'Unfurnished' },
  { id: 'partially_furnished', label: 'Partially furnished' },
  { id: 'furnished_kitchen', label: 'Furnished kitchen' },
  { id: 'furnished', label: 'Furnished' },
  { id: 'negotiable', label: 'Negotiable' },
]
// Lista oficial Sooprema (Heating) — captura confirmada
const HEATING_TYPES = [
  'Storage heaters', 'Aerothermal energy', 'Biomass', 'Blue heat radiators',
  'Centralised', 'Centralised fuel oil', 'Centralised gas', 'Central electric',
  'Diesel Boiler', 'Duct-based', 'Electric', 'Electric marble plate',
  'Electric underfloor heating', 'Fireplace', 'Firewood heater',
  'Gas underfloor heating', 'Geothermal energy', 'Heater', 'Heat pumps',
  'Hot/Cold', 'Individual city gas', 'Natural Gas', 'Not available',
  'Oil underfloor heating', 'Pellets',
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
// Idiomas oficiales Sooprema (7) — captura confirmada
const LANGUAGES: Array<{ code: 'es' | 'en' | 'de' | 'fr' | 'nl' | 'ru' | 'pl'; flag: string; label: string; key: 'description_es' | 'description_en' | 'description_de' | 'description_fr' | 'description_nl' | 'description_ru' | 'description_pl' }> = [
  { code: 'en', flag: '🇬🇧', label: 'English (fuente)', key: 'description_en' },
  { code: 'es', flag: '🇪🇸', label: 'Español', key: 'description_es' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch', key: 'description_de' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', key: 'description_fr' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands', key: 'description_nl' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', key: 'description_ru' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski', key: 'description_pl' },
]
// Feeds XML disponibles en Sooprema (capturas)
const XML_FEEDS = [
  { id: 'classandvillas', label: 'Class and Villas' },
  { id: 'inmoluk', label: 'Inmoluk' },
]

type TabId = 'basics' | 'structure' | 'equipment' | 'guests' | 'price' | 'owner' | 'address' | 'descriptions' | 'photos' | 'portals' | 'keys'

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'basics', label: 'Datos', emoji: '📋' },
  { id: 'structure', label: 'Estructura', emoji: '📐' },
  { id: 'equipment', label: 'Equipamiento', emoji: '✨' },
  { id: 'guests', label: 'Invitados', emoji: '🛏️' },
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

export function PropertyForm({ availablePhotos = [], storageBaseUrl = '', initialProperty = null, agentOptions = null, defaultAgentId = null }: PropertyFormProps = {}) {
  const [activeTab, setActiveTab] = useState<TabId>('basics')
  const [isPending, startTransition] = useTransition()
  const [isAI, startAI] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const isEditing = !!initialProperty?.id
  const canPickAgent = !!agentOptions && agentOptions.length > 0
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialProperty?.agent_id ?? defaultAgentId ?? (agentOptions?.[0]?.id ?? '')
  )

  // Shared state
  const ipAny = initialProperty as Record<string, unknown> | null
  const getStr = (k: string) => (ipAny?.[k] as string | null | undefined) ?? ''
  const getBool = (k: string) => Boolean(ipAny?.[k])
  const [formState, setFormState] = useState({
    property_type: initialProperty?.property_type ?? 'villa',
    listing_type: initialProperty?.listing_type ?? 'sale',
    zone: initialProperty?.zone ?? 'Altea',
    status_tags: (initialProperty?.status_tags as string[] | null) ?? [] as string[],
    is_new_build: getBool('is_new_build'),
    is_plot: getBool('is_plot'),
    // Título único (Sooprema solo tiene 1)
    title_headline: initialProperty?.title_headline ?? '',
    // Textos (7 idiomas)
    description_es: initialProperty?.description_es ?? '',
    description_en: initialProperty?.description_en ?? '',
    description_de: getStr('description_de'),
    description_fr: getStr('description_fr'),
    description_nl: initialProperty?.description_nl ?? '',
    description_ru: getStr('description_ru'),
    description_pl: getStr('description_pl'),
  })

  // Calculadora de precio (en vivo)
  const [calcPrice, setCalcPrice] = useState<number>((initialProperty as { price?: number | null } | null)?.price ?? 0)
  const [calcCommissionPct, setCalcCommissionPct] = useState<number>(
    ((initialProperty as { commission_percentage?: number | null } | null)?.commission_percentage ?? 5)
  )
  const calcCommissionAmount = Math.round(calcPrice * (calcCommissionPct / 100))
  const calcOwnerReceives = Math.max(calcPrice - calcCommissionAmount, 0)

  // XML feeds (multi)
  const [xmlFeeds, setXmlFeeds] = useState<Set<string>>(
    new Set((ipAny?.xml_feeds as string[] | undefined) ?? [])
  )

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

  async function handleGenerateAI(lang: 'en' | 'es' | 'de' | 'fr' | 'nl' | 'ru' | 'pl') {
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
        const target = LANGUAGES.find((l) => l.code === lang)
        if (target) update(target.key, res.description)
      }
      if (res.error) setError(res.error)
    })
  }

  function handleSubmit(publishMode: 'hidden' | 'published' | 'private') {
    setError(null); setSuccess(null)
    const form = document.getElementById('propForm') as HTMLFormElement
    if (!form) return
    const fd = new FormData(form)
    fd.set('title_headline', formState.title_headline)
    LANGUAGES.forEach((lang) => {
      fd.set(lang.key, formState[lang.key])
    })
    fd.set('status_tags', formState.status_tags.join(','))
    fd.set('selected_photo_ids', JSON.stringify([...selectedPhotoIds]))
    fd.set('is_new_build', formState.is_new_build ? '1' : '0')
    fd.set('is_plot', formState.is_plot ? '1' : '0')
    fd.set('publication_state', publishMode)
    fd.set('xml_feeds', JSON.stringify([...xmlFeeds]))
    // Calculadora — sobrescribe los inputs sueltos para garantizar consistencia
    if (calcPrice > 0) {
      fd.set('price', String(calcPrice))
      fd.set('commission_percentage', String(calcCommissionPct))
      fd.set('commission_amount', String(calcCommissionAmount))
      fd.set('price_net', String(calcOwnerReceives))
    }
    if (canPickAgent && selectedAgentId) {
      fd.set('agent_id', selectedAgentId)
    }

    const isActualPublish = publishMode === 'published'
    startTransition(async () => {
      const res = await saveProperty(fd, isActualPublish)
      if (res?.error) setError(res.error)
      else if (publishMode === 'published') setSuccess('🚀 Propiedad enviada a Sooprema — recibirás notificación al completarse')
      else if (publishMode === 'private') setSuccess('🔒 Propiedad guardada como PRIVADA (no aparecerá en la web pública)')
      else setSuccess('✅ Propiedad guardada como OCULTA (puedes seguir editando)')
    })
  }

  // Traducción automática desde EN al resto de idiomas (single-shot via OpenRouter)
  async function handleTranslateAll() {
    if (!formState.description_en.trim()) {
      setError('Escribe primero la descripción en INGLÉS antes de traducir')
      return
    }
    startAI(async () => {
      const targets = LANGUAGES.filter((l) => l.code !== 'en')
      for (const t of targets) {
        const fd = new FormData()
        fd.append('property_type', formState.property_type)
        fd.append('zone', formState.zone)
        fd.append('source_text', formState.description_en)
        fd.append('lang', t.code)
        fd.append('translate', '1')
        const res = await generateDescription(fd)
        if (res.description) update(t.key, res.description)
      }
      setSuccess('🌐 Traducción completada a los 6 idiomas')
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

      {/* Selector de agente (solo admin/secretary) */}
      {canPickAgent && (
        <div className="rounded-xl border border-[#8B7CF6]/30 bg-[#8B7CF6]/8 px-4 py-3">
          <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#8B7CF6]">
            Agente dueño de la propiedad *
          </label>
          <select
            name="agent_id"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className={inputClass}
          >
            {agentOptions!.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || a.email}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] text-[#9A9080]">
            La propiedad se guardará a nombre de este agente. Solo admins y secretarías ven este campo.
          </p>
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
          {/* Precio + Referencia arriba (Chloe: lo más importante) */}
          <div className="mb-5 grid gap-4 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>💰 Precio total € *</label>
              <input
                type="number"
                value={calcPrice || ''}
                onChange={(e) => setCalcPrice(Number(e.target.value) || 0)}
                className={inputClass}
                placeholder="549000"
              />
              <p className="mt-1 text-[10px] text-[#9A9080]">Este precio es el que sale en la web pública.</p>
            </div>
            <div>
              <label className={labelClass}>🏷️ Referencia (auto si vacío)</label>
              <input name="reference" defaultValue={ip?.reference ?? ''} className={inputClass} placeholder="A001" />
              <p className="mt-1 text-[10px] text-[#9A9080]">Se genera por zona (Altea = A###) si lo dejas vacío.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Tipo de operación</label>
              <select name="listing_type" value={formState.listing_type} onChange={(e) => update('listing_type', e.target.value as typeof formState.listing_type)} className={inputClass}>
                {LISTING_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {formState.listing_type === 'sale' && (
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F5F0E8]">
                    <input
                      type="checkbox"
                      checked={formState.is_new_build}
                      onChange={(e) => update('is_new_build', e.target.checked)}
                      className="accent-[#C9A84C]"
                    />
                    🏗️ Obra nueva
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F5F0E8]">
                    <input
                      type="checkbox"
                      checked={formState.is_plot}
                      onChange={(e) => update('is_plot', e.target.checked)}
                      className="accent-[#C9A84C]"
                    />
                    🌳 Parcela
                  </label>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Tipo de propiedad</label>
              <select name="property_type" value={formState.property_type} onChange={(e) => update('property_type', e.target.value as typeof formState.property_type)} className={inputClass}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Zona</label>
              <select name="zone" value={formState.zone} onChange={(e) => update('zone', e.target.value)} className={inputClass}>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
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
          {/* Superficies PRIMERO (Chloe: m² es lo más importante) */}
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Superficies (m²)</h3>
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

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Estancias</h3>
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
          <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Vistas</h3>
          <select name="views" className={inputClass} defaultValue={ip?.views ?? ''}>
            <option value="">—</option>
            {VIEWS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
      </section>

      {/* ═══ TAB: Equipamiento ═══ */}
      <section hidden={activeTab !== 'equipment'} className={sectionClass}>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Principales</h3>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <CheckField name="has_garage" label="🚗 Garaje" />
            <CheckField name="has_garden" label="🌳 Jardín" />
            <CheckField name="has_guest_apartment" label="🏡 Apt. invitados" />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Calefacción / Climatización</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Calefacción (Heating)</label>
              <select name="heating_type" className={inputClass} defaultValue={getStr('heating_type')}>
                <option value="">—</option>
                {HEATING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Aire acondicionado</label>
              <select name="ac_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {AC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Piscina / Garaje / Terraza / Jardín / Muebles</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Tipo piscina</label>
              <select name="pool_type" className={inputClass} defaultValue="">
                <option value="">—</option>
                {POOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
            <CheckField name="has_summer_kitchen" label="🌞 Cocina verano" />
            <CheckField name="has_water_deposit" label="💧 Depósito agua" />
            <CheckField name="has_sat_tv" label="📺 TV/SAT" />
            <CheckField name="has_internet" label="🌐 Internet" />
            <CheckField name="has_laundry" label="🧺 Lavadero" />
            <CheckField name="has_outdoor_shower" label="🚿 Ducha exterior" />
            <CheckField name="has_double_glazing" label="🪟 Doble cristal" />
            <CheckField name="has_security_door" label="🚪 Puerta seguridad" />
            <CheckField name="has_enclosed_plot" label="🏘️ Parcela cerrada" />
          </div>
      </section>

      {/* ═══ TAB: Apartamento de invitados ═══ */}
      <section hidden={activeTab !== 'guests'} className={sectionClass}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🛏️ Apartamento de invitados</p>
          <p className="mb-4 text-xs text-[#9A9080]">
            Si la propiedad incluye apartamento de invitados, rellena estos campos.
            En la web pública saldrá como <strong>&quot;3+2 habitaciones&quot;</strong> (casa principal + invitados).
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Habitaciones invitados</label>
              <input name="guest_bedrooms" type="number" defaultValue={ipAny?.guest_bedrooms as number ?? ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Baños invitados</label>
              <input name="guest_bathrooms" type="number" defaultValue={ipAny?.guest_bathrooms as number ?? ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Aseos invitados</label>
              <input name="guest_toilets" type="number" defaultValue={ipAny?.guest_toilets as number ?? ''} className={inputClass} />
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <CheckField name="guest_lounge" label="🛋️ Salón en invitados" defaultChecked={getBool('guest_lounge')} />
            <CheckField name="guest_dining_room" label="🍽️ Comedor en invitados" defaultChecked={getBool('guest_dining_room')} />
            <CheckField name="guest_kitchen" label="🍳 Cocina en invitados" defaultChecked={getBool('guest_kitchen')} />
          </div>
      </section>

      {/* ═══ TAB: Precio ═══ */}
      <section hidden={activeTab !== 'price'} className={sectionClass}>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">💰 Calculadora de precio y comisión</h3>
          <div className="rounded-2xl border border-[#C9A84C]/40 bg-[#C9A84C]/5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Precio total que verá el cliente €</label>
                <input
                  type="number"
                  value={calcPrice || ''}
                  onChange={(e) => setCalcPrice(Number(e.target.value) || 0)}
                  className={inputClass}
                  placeholder="549000"
                />
              </div>
              <div>
                <label className={labelClass}>% Comisión CBI</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcCommissionPct(4)}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${calcCommissionPct === 4 ? 'bg-[#C9A84C] text-black' : 'border border-white/10 bg-[#1C1C1C] text-[#9A9080]'}`}
                  >4%</button>
                  <button
                    type="button"
                    onClick={() => setCalcCommissionPct(5)}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${calcCommissionPct === 5 ? 'bg-[#C9A84C] text-black' : 'border border-white/10 bg-[#1C1C1C] text-[#9A9080]'}`}
                  >5%</button>
                  <input
                    type="number"
                    step="0.1"
                    value={calcCommissionPct}
                    onChange={(e) => setCalcCommissionPct(Number(e.target.value) || 0)}
                    className={`${inputClass} w-24`}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#2ECC9A]/30 bg-[#2ECC9A]/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2ECC9A]">💵 Comisión CBI</p>
                <p className="mt-1 text-2xl font-bold text-[#2ECC9A]">€{calcCommissionAmount.toLocaleString()}</p>
                <p className="text-[10px] text-[#9A9080]">{calcCommissionPct}% de €{calcPrice.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[#8B7CF6]/30 bg-[#8B7CF6]/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B7CF6]">🧑 Recibe el propietario</p>
                <p className="mt-1 text-2xl font-bold text-[#8B7CF6]">€{calcOwnerReceives.toLocaleString()}</p>
                <p className="text-[10px] text-[#9A9080]">€{calcPrice.toLocaleString()} − €{calcCommissionAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Otros precios (opcional)</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Precio final €</label>
              <input name="price_final" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraoferta €</label>
              <input name="price_counter_offer" type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Importe renta €/mes</label>
              <input name="rental_amount" type="number" className={inputClass} />
            </div>
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
          <AddressPicker
            initialQuery={getStr('location')}
            initialLat={(ipAny?.latitude as number) ?? null}
            initialLng={(ipAny?.longitude as number) ?? null}
            onSelect={(d) => {
              const form = document.getElementById('propForm') as HTMLFormElement | null
              if (!form) return
              const setVal = (name: string, value: string) => {
                const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`)
                if (el) el.value = value
              }
              setVal('street_name', d.street_name)
              setVal('street_number', d.street_number)
              setVal('postal_code', d.postal_code)
              setVal('city', d.city)
              setVal('location', d.location)
            }}
          />

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Detalles editables</h3>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <label className={labelClass}>Calle</label>
              <input name="street_name" defaultValue={getStr('street_name')} className={inputClass} placeholder="Carrer Barro" />
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input name="street_number" defaultValue={getStr('street_number')} className={inputClass} placeholder="7" />
            </div>
            <div>
              <label className={labelClass}>Planta</label>
              <input name="apartment_floor" defaultValue={getStr('apartment_floor')} className={inputClass} placeholder="2" />
            </div>
            <div>
              <label className={labelClass}>Puerta</label>
              <input name="apartment_door" defaultValue={getStr('apartment_door')} className={inputClass} placeholder="A" />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Población</label>
              <input name="city" defaultValue={getStr('city')} className={inputClass} placeholder="Altea" />
            </div>
            <div>
              <label className={labelClass}>Código postal</label>
              <input name="postal_code" defaultValue={getStr('postal_code')} className={inputClass} placeholder="03590" />
            </div>
            <div>
              <label className={labelClass}>Urbanización</label>
              <input name="urbanization" defaultValue={getStr('urbanization')} className={inputClass} placeholder="Mascarat" />
            </div>
          </div>
          <input type="hidden" name="location" defaultValue={getStr('location')} />
          <p className="mt-3 text-[11px] text-yellow-400/80">
            ⚠️ <strong>IMPORTANTE:</strong> usa la búsqueda arriba y selecciona una dirección oficial del desplegable. Si la dirección no se valida en el mapa, Idealista rechazará la propiedad.
          </p>
      </section>

      {/* ═══ TAB: Descripciones ═══ */}
      <section hidden={activeTab !== 'descriptions'} className={sectionClass}>
          <div>
            <label className={labelClass}>Título principal (web header) *</label>
            <input
              value={formState.title_headline}
              onChange={(e) => update('title_headline', e.target.value)}
              className={inputClass}
              placeholder="Mediterranean Villa with Flat Garden"
            />
            <p className="mt-1 text-[10px] text-red-400">⚠️ Si no incluyes el título, la propiedad NO aparecerá en la web pública.</p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🌐 Descripción en 7 idiomas</p>
            <button
              type="button"
              onClick={handleTranslateAll}
              disabled={isAI}
              className="rounded-lg border border-[#8B7CF6]/40 bg-[#8B7CF6]/15 px-3 py-1.5 text-[11px] font-bold text-[#8B7CF6] hover:bg-[#8B7CF6]/25 disabled:opacity-50"
            >
              {isAI ? '⏳ Traduciendo...' : '🌐 Traducir desde EN a los otros 6 idiomas'}
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {LANGUAGES.map((d) => (
              <div key={d.code}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={labelClass}>{d.flag} {d.label}</label>
                  <button
                    type="button"
                    onClick={() => handleGenerateAI(d.code)}
                    disabled={isAI}
                    className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold text-[#C9A84C] hover:bg-[#C9A84C]/15 disabled:opacity-50"
                  >
                    {isAI ? '⏳' : '✨ Generar IA'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={formState[d.key]}
                  onChange={(e) => update(d.key, e.target.value)}
                  className={inputClass}
                  placeholder={d.code === 'en' ? 'Escribe primero aquí, luego traduce a los demás idiomas...' : 'Traducción automática desde EN o escribir manualmente'}
                />
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-[#9A9080]/70">
            💡 Escribe primero la descripción en INGLÉS (idioma fuente). Luego pulsa el botón morado para traducir automáticamente a los 6 idiomas restantes.
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
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🌐 Publicar en portales principales</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckField name="publish_sooprema" label="✓ Web CBI (Sooprema)" defaultChecked />
            <CheckField name="publish_kyero" label="✓ Kyero" defaultChecked={getBool('publish_kyero')} />
            <CheckField name="publish_idealista" label="✓ Idealista" defaultChecked />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">📤 Feeds XML (compartir con otras agencias)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {XML_FEEDS.map((f) => {
              const checked = xmlFeeds.has(f.id)
              return (
                <label
                  key={f.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-xs transition ${
                    checked ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#F5F0E8]' : 'border-white/10 bg-[#1C1C1C] text-[#9A9080]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setXmlFeeds((prev) => {
                        const next = new Set(prev)
                        if (next.has(f.id)) next.delete(f.id)
                        else next.add(f.id)
                        return next
                      })
                    }}
                    className="accent-[#C9A84C]"
                  />
                  {f.label}
                </label>
              )
            })}
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🔒 Permisos del propietario</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckField name="owner_allows_web" label="Permite publicar en la web" defaultChecked={ipAny?.owner_allows_web !== false} />
            <CheckField name="owner_allows_idealista" label="Permite publicar en Idealista" defaultChecked={ipAny?.owner_allows_idealista !== false} />
            <CheckField name="allow_billboard" label="🪧 Cartel de CBI permitido" defaultChecked={getBool('allow_billboard')} />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">⭐ Destacar en la web</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckField name="featured_homepage" label="🏠 Propiedad de la semana (Homepage)" defaultChecked={getBool('featured_homepage')} />
            <CheckField name="featured_first_position" label="1️⃣ Primera posición" defaultChecked={getBool('featured_first_position')} />
            <CheckField name="featured_promote" label="📣 Promote / Highlights" defaultChecked={getBool('featured_promote')} />
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">⚡ Certificado energético (Energy Rating)</h3>
          <div className="flex flex-wrap gap-2">
            {ENERGY.map((e) => (
              <label key={e} className="flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-2 text-xs font-bold text-[#F5F0E8] has-[:checked]:border-[#C9A84C] has-[:checked]:bg-[#C9A84C] has-[:checked]:text-black">
                <input type="radio" name="energy_certificate" value={e} defaultChecked={ip?.energy_certificate === e || (!ip?.energy_certificate && e === 'D')} className="sr-only" />
                {e}
              </label>
            ))}
          </div>

          <h3 className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">⚡ Calificación energética de consumo</h3>
          <div className="flex flex-wrap gap-2">
            {ENERGY.map((e) => (
              <label key={`cons-${e}`} className="flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-2 text-xs font-bold text-[#F5F0E8] has-[:checked]:border-[#2ECC9A] has-[:checked]:bg-[#2ECC9A] has-[:checked]:text-black">
                <input type="radio" name="energy_consumption_rating" value={e} defaultChecked={getStr('energy_consumption_rating') === e} className="sr-only" />
                {e}
              </label>
            ))}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Consumo kWh/m²/año</label>
              <input name="energy_consumption_kwh" type="number" defaultValue={ipAny?.energy_consumption_kwh as number ?? ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Emisiones CO2 kg/m²/año</label>
              <input name="co2_emissions" type="number" defaultValue={ipAny?.co2_emissions as number ?? ''} className={inputClass} />
            </div>
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
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={() => handleSubmit('hidden')}
            disabled={isPending}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9A9080] active:scale-[0.98] hover:text-[#F5F0E8] disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-xs"
            title="Guardar oculta — solo visible para CBI, no publica en web"
          >
            👁️‍🗨️ Oculta
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('private')}
            disabled={isPending}
            className="rounded-xl border border-[#8B7CF6]/40 bg-[#8B7CF6]/10 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.06em] text-[#8B7CF6] active:scale-[0.98] hover:bg-[#8B7CF6]/20 disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-xs"
            title="Privada — propiedad existe pero el propietario no quiere que aparezca en web"
          >
            🔒 Privada
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('published')}
            disabled={isPending}
            className="rounded-xl bg-[#C9A84C] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.06em] text-black active:scale-[0.98] hover:bg-[#E8C96A] disabled:opacity-50 sm:px-6 sm:py-2.5 sm:text-xs"
            title="Publicar — la propiedad sale en la web pública y se envía a Sooprema"
          >
            🚀 Publicar
          </button>
        </div>
      </div>
    </form>
  )
}
