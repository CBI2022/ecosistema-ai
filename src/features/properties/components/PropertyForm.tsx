'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { saveProperty, submitProperty } from '@/actions/properties'
import { OwnerPicker } from './OwnerPicker'
import { AddressPicker } from './AddressPicker'
import { TitleAndDescriptionEditor } from './TitleAndDescriptionEditor'
import { EquipmentTab } from './EquipmentTab'
import { FeaturesTab } from './FeaturesTab'
import {
  inputClass,
  labelClass,
  sectionClass,
  sectionTitle,
  sectionSubtitle,
  ZONES,
  PROPERTY_TYPES,
  PLOT_OPTIONAL_TYPES,
  VIEWS_OPTIONS,
  KITCHEN_TYPES,
  ENERGY,
} from './property-form-constants'
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

interface PrefilledFromShoot {
  drive_link: string | null
  reference: string | null
  address: string | null
  shoot_id: string | null
}

interface PropertyFormProps {
  availablePhotos?: AgentPhoto[]
  storageBaseUrl?: string
  initialProperty?: Property | null
  agentOptions?: AgentOption[] | null
  defaultAgentId?: string | null
  prefilledFromShoot?: PrefilledFromShoot | null
}

const Req = () => <span className="text-red-400"> *</span>

function NumberSelect({
  name,
  defaultValue,
  max = 10,
  emoji,
}: {
  name: string
  defaultValue?: string
  max?: number
  emoji?: string
}) {
  return (
    <select name={name} className={inputClass} defaultValue={defaultValue ?? ''}>
      <option value="">{emoji ? `${emoji} —` : '—'}</option>
      {Array.from({ length: max + 1 }, (_, i) => (
        <option key={i} value={String(i)}>
          {i}
        </option>
      ))}
    </select>
  )
}

type TabId = 'general' | 'equipment' | 'features' | 'location' | 'texts' | 'costs'

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: '🏠 Información general' },
  { id: 'equipment', label: '🛠️ Equipment' },
  { id: 'features', label: '✨ Features' },
  { id: 'location', label: '📍 Ubicación y propietario' },
  { id: 'texts', label: '✏️ Textos y fotos' },
  { id: 'costs', label: '💶 Gastos y portales' },
]

export function PropertyForm({
  availablePhotos = [],
  storageBaseUrl = '',
  initialProperty = null,
  agentOptions = null,
  defaultAgentId = null,
  prefilledFromShoot = null,
}: PropertyFormProps = {}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('general')

  const isEditing = !!initialProperty?.id
  const canPickAgent = !!agentOptions && agentOptions.length > 0

  const ipAny = initialProperty as Record<string, unknown> | null
  const getStr = (k: string) => (ipAny?.[k] as string | null | undefined) ?? ''
  const getNum = (k: string) => {
    const v = ipAny?.[k] as number | null | undefined
    return v === null || v === undefined ? '' : String(v)
  }

  // ── Estado controlado mínimo ──
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialProperty?.agent_id ?? defaultAgentId ?? (agentOptions?.[0]?.id ?? ''),
  )
  const [zone, setZone] = useState<string>(initialProperty?.zone ?? 'Altea')
  const [propertyType, setPropertyType] = useState<string>(initialProperty?.property_type ?? 'villa')
  const [hasGuestApt, setHasGuestApt] = useState<boolean>(Boolean(ipAny?.has_guest_apartment))

  const plotOptional = PLOT_OPTIONAL_TYPES.includes(propertyType)

  // ── Calculadora de comisión ──
  // input = Precio de venta (web) que YA incluye la comisión.
  // comisión = salePrice × %  ·  owner recibe = salePrice − comisión.
  const initialPrice = ((initialProperty as { price?: number | null } | null)?.price ?? 0)
  const initialCommissionPct = ((initialProperty as { commission_percentage?: number | null } | null)?.commission_percentage ?? 5)
  const [salePrice, setSalePrice] = useState<number>(0)
  const [commissionPct, setCommissionPct] = useState<number>(initialCommissionPct)

  // Al editar, el precio guardado YA es el precio de venta (web).
  useEffect(() => {
    if (initialPrice > 0) setSalePrice(initialPrice)
  }, [initialPrice])

  const calculation = useMemo(() => {
    const commission = Math.round(salePrice * (commissionPct / 100))
    const ownerReceives = salePrice - commission
    return { commission, ownerReceives }
  }, [salePrice, commissionPct])

  // Título y descripción — uncontrolled para fiabilidad (FormData los recoge directo)
  const initialTitle = initialProperty?.title_headline ?? ''
  const initialDescription =
    initialProperty?.description_es || initialProperty?.description_en || getStr('description_de') || ''

  // Owner
  const [ownerId, setOwnerId] = useState<string | null>(initialProperty?.owner_id ?? null)

  // Fotos
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isEditing) {
      const form = document.getElementById('propForm')
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isEditing])

  /**
   * Construye el FormData común con todo lo que el form gestiona vía state
   * (calculadora, owner, fotos, agent, has_guest, etc.).
   * Las pestañas ocultas siguen montadas → FormData recoge TODOS sus campos.
   */
  function buildFormData(publicationState: 'hidden' | 'published'): FormData | null {
    const form = document.getElementById('propForm') as HTMLFormElement
    if (!form) return null
    const fd = new FormData(form)

    fd.set('publication_state', publicationState)
    fd.set('zone', zone)
    fd.set('property_type', propertyType)
    fd.set('has_guest_apartment', hasGuestApt ? '1' : '0')

    // price = precio de venta (web, incluye comisión)
    // price_net = lo que recibe el propietario
    // commission_amount = comisión
    if (salePrice > 0) {
      fd.set('price', String(salePrice))
      fd.set('price_net', String(calculation.ownerReceives))
      fd.set('commission_percentage', String(commissionPct))
      fd.set('commission_amount', String(calculation.commission))
    }

    if (canPickAgent && selectedAgentId) {
      fd.set('agent_id', selectedAgentId)
    }

    if (ownerId) fd.set('owner_id', ownerId)

    fd.set('selected_photo_ids', JSON.stringify([...selectedPhotoIds]))

    return fd
  }

  /**
   * Guardar borrador: NO valida nada. Guarda lo que haya.
   */
  function handleSaveDraft() {
    setError(null)
    setSuccess(null)

    const fd = buildFormData('hidden')
    if (!fd) return

    startTransition(async () => {
      const res = await saveProperty(fd, false)
      if (res?.error) setError(res.error)
      else setSuccess('💾 Borrador guardado. Puedes seguir editando — solo tú lo ves hasta que pulses "Enviar propiedad".')
    })
  }

  /**
   * Enviar propiedad a la oficina: valida título y descripción antes.
   * NO dispara el robot Sooprema — le llega a la oficina (Chloe) para subirla a mano.
   */
  function handleSubmit() {
    setError(null)
    setSuccess(null)

    const fd = buildFormData('hidden')
    if (!fd) return

    const titleVal = String(fd.get('title_headline') || '').trim()
    const descVal = String(fd.get('description_es') || '').trim()

    if (!titleVal) {
      setError('Falta el título de la propiedad. Si no lo incluyes, la oficina no tendrá ese dato.')
      setActiveTab('texts')
      document.getElementById('section-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (!descVal) {
      setError('Falta la descripción de la propiedad. Escribe al menos un párrafo en cualquier idioma.')
      setActiveTab('texts')
      document.getElementById('section-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    startTransition(async () => {
      const res = await submitProperty(fd)
      if (res && 'error' in res && res.error) setError(res.error)
      else setSuccess('✅ Propiedad enviada a la oficina. Te avisaremos cuando esté publicada.')
    })
  }

  const hide = (tab: TabId) => (activeTab === tab ? '' : 'hidden')

  return (
    <form id="propForm" onSubmit={(e) => e.preventDefault()} className="space-y-5">
      {initialProperty?.id && <input type="hidden" name="id" value={initialProperty.id} />}

      {/* Banner edición */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C9A84C]">Editando propiedad</p>
            <p className="mt-0.5 text-sm text-[#F5F0E8]">
              {initialProperty?.reference} — {initialProperty?.title_headline || initialProperty?.location || 'Sin título'}
            </p>
          </div>
          <a
            href="/properties"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#9A9080] hover:text-[#F5F0E8]"
          >
            ✕ Cancelar
          </a>
        </div>
      )}

      {/* Selector de agente (admin/secretary) */}
      {canPickAgent && (
        <div className="rounded-xl border border-[#8B7CF6]/30 bg-[#8B7CF6]/8 px-4 py-3">
          <label className={`${labelClass} text-[#8B7CF6]`}>Agente dueño de la propiedad *</label>
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
          <p className="mt-1.5 text-[10px] text-[#9A9080]">La propiedad se guarda a nombre de este agente.</p>
        </div>
      )}

      {/* ═══ Barra de pestañas (scroll horizontal en móvil) ═══ */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-white/8 bg-[#0A0A0A]/95 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:border-white/8 sm:px-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeTab === t.id
                  ? 'bg-[#C9A84C] text-black'
                  : 'bg-white/5 text-[#9A9080] hover:bg-white/10 hover:text-[#F5F0E8]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 1 — INFORMACIÓN GENERAL                                */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={`space-y-5 ${hide('general')}`}>
        {/* Precio (PRIMER campo) + calculadora de comisión */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>
            💰 Precio<Req />
          </h2>
          <p className={sectionSubtitle}>
            Pon el <strong>precio de venta de la web</strong> (ya incluye la comisión de CBI) y el % de comisión.
            Calculamos la comisión y lo que recibe el propietario.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Precio de venta (web, €)<Req />
              </label>
              <input
                type="number"
                value={salePrice || ''}
                onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                className={inputClass}
                placeholder="400000"
              />
            </div>
            <div>
              <label className={labelClass}>% comisión CBI</label>
              <input
                type="number"
                step="0.1"
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value) || 0)}
                className={inputClass}
                placeholder="5"
              />
            </div>
          </div>

          {salePrice > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#2ECC9A]/30 bg-[#2ECC9A]/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2ECC9A]">💵 Comisión CBI</p>
                <p className="mt-1 text-2xl font-bold text-[#2ECC9A]">€{calculation.commission.toLocaleString('es-ES')}</p>
                <p className="text-[10px] text-[#9A9080]">
                  {commissionPct}% sobre €{salePrice.toLocaleString('es-ES')}
                </p>
              </div>
              <div className="rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🏷️ Recibe el propietario</p>
                <p className="mt-1 text-2xl font-bold text-[#C9A84C]">€{calculation.ownerReceives.toLocaleString('es-ES')}</p>
                <p className="text-[10px] text-[#9A9080]">Precio de venta − comisión</p>
              </div>
            </div>
          )}
        </section>

        {/* Zona / Tipo / Vistas */}
        <section className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                📍 Zona<Req />
              </label>
              <select value={zone} onChange={(e) => setZone(e.target.value)} className={inputClass}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                🏠 Tipo de propiedad<Req />
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={inputClass}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Vistas<Req />
              </label>
              <select name="views" className={inputClass} defaultValue={initialProperty?.views ?? ''}>
                <option value="">—</option>
                {VIEWS_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tamaños y habitaciones */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>📐 Tamaños y habitaciones</h2>
          <p className={sectionSubtitle}>Las medidas y habitaciones de la propiedad principal.</p>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Columna izquierda: tamaños */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Built size / Construido (m²)<Req />
                  </label>
                  <input
                    name="build_area_m2"
                    type="number"
                    defaultValue={getNum('build_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Plot size / Parcela (m²){!plotOptional && <Req />}
                  </label>
                  <input
                    name="plot_area_m2"
                    type="number"
                    defaultValue={getNum('plot_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                  <p className="mt-1 text-[10px] text-[#9A9080]">
                    Si la propiedad no tiene parcela, escribe aquí lo mismo que en Construido.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Useful (m²)</label>
                  <input
                    name="useful_area_m2"
                    type="number"
                    defaultValue={getNum('useful_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Terrace (m²)</label>
                  <input
                    name="terrace_area_m2"
                    type="number"
                    defaultValue={getNum('terrace_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Superficie Jardín (m²)</label>
                  <input
                    name="garden_area_m2"
                    type="number"
                    defaultValue={getNum('garden_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha: habitaciones */}
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Bedrooms</label>
                <NumberSelect name="bedrooms" defaultValue={getNum('bedrooms')} max={15} />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <NumberSelect name="bathrooms" defaultValue={getNum('bathrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Guest toilet</label>
                <NumberSelect name="toilets" defaultValue={getNum('toilets')} max={5} />
              </div>
              <div>
                <label className={labelClass}>Lounge</label>
                <NumberSelect name="living_rooms" defaultValue={getNum('living_rooms')} max={5} />
              </div>
              <div>
                <label className={labelClass}>Dining room</label>
                <NumberSelect name="dining_rooms" defaultValue={getNum('dining_rooms')} max={5} />
              </div>
              <div>
                <label className={labelClass}>Kitchen</label>
                <select
                  name="kitchen_type"
                  className={inputClass}
                  defaultValue={getStr('kitchen_type')}
                >
                  <option value="">—</option>
                  {KITCHEN_TYPES.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Build year</label>
                  <input
                    name="year_built"
                    type="number"
                    defaultValue={getNum('year_built')}
                    className={inputClass}
                    placeholder="2013"
                  />
                </div>
                <div>
                  <label className={labelClass}>Renovated in</label>
                  <input
                    name="year_reformed"
                    type="number"
                    defaultValue={getNum('year_reformed')}
                    className={inputClass}
                    placeholder="2022"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Guest Apartment */}
        <section className={sectionClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>🛏️ Guest Apartment</h2>
              <p className={sectionSubtitle}>Apartamento de invitados (si la propiedad lo tiene).</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-xs text-[#F5F0E8]">
              <input
                type="checkbox"
                checked={hasGuestApt}
                onChange={(e) => setHasGuestApt(e.target.checked)}
                className="accent-[#C9A84C]"
              />
              Tiene apartamento de invitados
            </label>
          </div>

          {hasGuestApt && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Bedrooms</label>
                <NumberSelect name="guest_bedrooms" defaultValue={getNum('guest_bedrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <NumberSelect name="guest_bathrooms" defaultValue={getNum('guest_bathrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Toilet</label>
                <NumberSelect name="guest_toilets" defaultValue={getNum('guest_toilets')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Lounge</label>
                <NumberSelect name="guest_lounge_count" defaultValue={getNum('guest_lounge_count')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Dining room</label>
                <NumberSelect name="guest_dining_count" defaultValue={getNum('guest_dining_count')} max={10} />
              </div>
              <div>
                <label className={labelClass}>Kitchen</label>
                <NumberSelect name="guest_kitchen_count" defaultValue={getNum('guest_kitchen_count')} max={10} />
              </div>
            </div>
          )}
        </section>

        {/* Certificado energético */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>⚡ Certificado energético</h2>
          <p className={sectionSubtitle}>Las dos calificaciones oficiales (emisiones y consumo).</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Energy rating (emisiones)</label>
              <select
                name="energy_certificate"
                className={inputClass}
                defaultValue={initialProperty?.energy_certificate ?? ''}
              >
                <option value="">—</option>
                {ENERGY.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Calificación energética consumo</label>
              <select
                name="energy_consumption_rating"
                className={inputClass}
                defaultValue={getStr('energy_consumption_rating')}
              >
                <option value="">—</option>
                {ENERGY.map((e) => (
                  <option key={`c-${e}`} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 2 — EQUIPMENT                                          */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={hide('equipment')}>
        <section className={sectionClass}>
          <EquipmentTab initialProperty={ipAny} />
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 3 — FEATURES                                           */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={hide('features')}>
        <section className={sectionClass}>
          <FeaturesTab initialProperty={ipAny} />
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 4 — UBICACIÓN Y PROPIETARIO                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={`space-y-5 ${hide('location')}`}>
        {/* Dirección — NO TOCAR la lógica */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>📍 Dirección</h2>
          <p className={sectionSubtitle}>Busca la dirección oficial. Si no se valida, los portales pueden rechazarla.</p>

          <AddressPicker
            initialQuery={getStr('location')}
            initialLat={(ipAny?.latitude as number) ?? null}
            initialLng={(ipAny?.longitude as number) ?? null}
            onSelect={(d) => {
              const form = document.getElementById('propForm') as HTMLFormElement | null
              if (!form) return
              const setVal = (n: string, v: string) => {
                const el = form.querySelector<HTMLInputElement>(`[name="${n}"]`)
                if (el) el.value = v
              }
              setVal('street_name', d.street_name)
              setVal('street_number', d.street_number)
              setVal('postal_code', d.postal_code)
              setVal('city', d.city)
              setVal('location', d.location)
            }}
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <label className={labelClass}>
                Calle <span className="text-red-400">*</span>
              </label>
              <input
                name="street_name"
                defaultValue={getStr('street_name')}
                className={inputClass}
                placeholder="Carrer Barro"
              />
            </div>
            <div>
              <label className={labelClass}>
                Número <span className="text-red-400">*</span>
              </label>
              <input
                name="street_number"
                defaultValue={getStr('street_number')}
                className={inputClass}
                placeholder="7"
              />
            </div>
            <div>
              <label className={labelClass}>Planta</label>
              <input
                name="apartment_floor"
                defaultValue={getStr('apartment_floor')}
                className={inputClass}
                placeholder="2"
              />
            </div>
            <div>
              <label className={labelClass}>Puerta</label>
              <input
                name="apartment_door"
                defaultValue={getStr('apartment_door')}
                className={inputClass}
                placeholder="A"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Población <span className="text-red-400">*</span>
              </label>
              <input
                name="city"
                defaultValue={getStr('city')}
                className={inputClass}
                placeholder="p. ej. Alicante"
              />
            </div>
            <div>
              <label className={labelClass}>
                Código postal <span className="text-red-400">*</span>
              </label>
              <input
                name="postal_code"
                defaultValue={getStr('postal_code')}
                className={inputClass}
                placeholder="03590"
              />
            </div>
          </div>

          <input type="hidden" name="location" defaultValue={getStr('location')} />
        </section>

        {/* Propietario */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>👤 Propietario</h2>
          <p className={sectionSubtitle}>Asocia un propietario existente o crea uno nuevo.</p>
          <OwnerPicker value={ownerId} onChange={(id) => setOwnerId(id)} />
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 5 — TEXTOS Y FOTOS                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={`space-y-5 ${hide('texts')}`}>
        {/* Título + Descripción (CBI lo refina y traduce a 7 idiomas) */}
        <section id="section-title" className={sectionClass}>
          <h2 className={sectionTitle}>✏️ Título y descripción</h2>
          <p className={sectionSubtitle}>
            CBI genera y traduce con su IA propia los textos profesionales en 7 idiomas. Lo que aquí veas Pro es lo que se sube a Sooprema.
          </p>

          <TitleAndDescriptionEditor
            initial={{
              description_base: initialProperty?.description_base ?? null,
              description_source_lang: initialProperty?.description_source_lang ?? 'es',
              title_es: initialProperty?.title_es ?? null,
              title_en: initialProperty?.title_en ?? null,
              title_de: initialProperty?.title_de ?? null,
              title_fr: initialProperty?.title_fr ?? null,
              title_nl: initialProperty?.title_nl ?? null,
              title_ru: initialProperty?.title_ru ?? null,
              title_pl: initialProperty?.title_pl ?? null,
              description_es: initialProperty?.description_es ?? null,
              description_en: initialProperty?.description_en ?? null,
              description_de: initialProperty?.description_de ?? null,
              description_fr: initialProperty?.description_fr ?? null,
              description_nl: initialProperty?.description_nl ?? null,
              description_ru: initialProperty?.description_ru ?? null,
              description_pl: initialProperty?.description_pl ?? null,
              legacy_title: initialTitle,
              legacy_description: initialDescription,
            }}
            getContext={() => {
              const form = document.getElementById('propForm') as HTMLFormElement | null
              const fd = form ? new FormData(form) : null
              const num = (k: string): number | null => {
                const v = fd?.get(k)
                if (v === null || v === undefined || v === '') return null
                const n = Number(v)
                return isNaN(n) ? null : n
              }
              const str = (k: string): string | null => {
                const v = fd?.get(k)
                if (v === null || v === undefined || v === '') return null
                return String(v)
              }
              const bool = (k: string): boolean => {
                const v = fd?.get(k)
                return v === 'on' || v === 'true' || v === '1'
              }
              return {
                property_type: str('property_type'),
                zone: str('zone'),
                bedrooms: num('bedrooms'),
                bathrooms: num('bathrooms'),
                build_area_m2: num('build_area_m2'),
                plot_area_m2: num('plot_area_m2'),
                terrace_area_m2: num('terrace_area_m2'),
                garden_area_m2: num('garden_area_m2'),
                price: num('price'),
                views: str('views'),
                has_pool: bool('has_pool'),
                has_garage: bool('has_garage'),
                has_garden: bool('has_garden'),
                has_terrace: bool('has_terrace'),
                has_ac: bool('has_ac'),
                has_sea_view: bool('has_sea_view'),
                year_built: num('year_built'),
                year_reformed: num('year_reformed'),
              }
            }}
          />
        </section>

        {/* Fotos (opcional) */}
        <section className={sectionClass}>
          {/* Campo Carpeta de Drive — la automation pesca las fotos de aquí al publicar a Sooprema */}
          <div className="mb-5">
            <label className={labelClass}>
              🔗 Carpeta de Drive con fotos (opcional)
            </label>
            <input
              type="url"
              name="photos_drive_link"
              defaultValue={
                prefilledFromShoot?.drive_link ||
                (initialProperty as { photos_drive_link?: string | null } | null)?.photos_drive_link ||
                ''
              }
              placeholder="https://drive.google.com/drive/folders/..."
              className={inputClass}
            />
            <p className="mt-2 text-[11px] text-[#9A9080]">
              Si Jelle te ha enviado un link de Drive con las fotos, pégalo aquí. La automation las descargará y subirá a Sooprema.
              Asegúrate de que la carpeta esté pública (Cualquiera con el enlace puede ver).
            </p>
            {prefilledFromShoot?.shoot_id && (
              <input type="hidden" name="linked_shoot_id" value={prefilledFromShoot.shoot_id} />
            )}
            {prefilledFromShoot?.drive_link && (
              <p className="mt-1 text-[11px] text-[#C9A84C]">
                ✓ Link de Drive precargado desde la sesión de fotos de Jelle.
              </p>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className={sectionTitle}>📸 Fotos del SaaS (opcional)</h2>
              <p className={sectionSubtitle}>
                {availablePhotos.length} disponibles · {selectedPhotoIds.size} seleccionadas. Las fotos NO son obligatorias para subir.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedPhotoIds(new Set(availablePhotos.map((p) => p.id)))}
                disabled={availablePhotos.length === 0}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] disabled:opacity-40"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhotoIds(new Set())}
                disabled={selectedPhotoIds.size === 0}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-[#9A9080] disabled:opacity-40"
              >
                Limpiar
              </button>
            </div>
          </div>

          {availablePhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#0A0A0A] p-8 text-center">
              <p className="text-sm text-[#9A9080]">Sin fotos disponibles. Cuando el fotógrafo suba fotos aparecerán aquí.</p>
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
                    onClick={() =>
                      setSelectedPhotoIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(photo.id)) next.delete(photo.id)
                        else next.add(photo.id)
                        return next
                      })
                    }
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                      selected ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/30' : 'border-white/8 hover:border-white/20'
                    }`}
                  >
                    <img src={imgUrl} alt="" className="h-full w-full object-cover" />
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
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 6 — GASTOS Y PORTALES                                  */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className={`space-y-5 ${hide('costs')}`}>
        {/* Community costs */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>🏘️ Community costs</h2>
          <p className={sectionSubtitle}>Gastos anuales (€). No obligatorios, pero importantes en pisos.</p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Gastos comunidad / año</label>
              <input
                name="community_annual"
                type="number"
                defaultValue={getNum('community_annual')}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>IBI / año</label>
              <input
                name="ibi_annual"
                type="number"
                defaultValue={getNum('ibi_annual')}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Basura / año</label>
              <input
                name="basura_annual"
                type="number"
                defaultValue={getNum('basura_annual')}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>
        </section>

        {/* Publicación en portales + Feeds XML */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>🌐 Publicación en portales</h2>
          <p className={sectionSubtitle}>Marca dónde quieres que se publique. Sooprema viene marcado por defecto.</p>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40">
              <input
                type="checkbox"
                name="publish_sooprema"
                defaultChecked={ipAny ? (ipAny.publish_sooprema as boolean) !== false : true}
                className="h-4 w-4 accent-[#C9A84C]"
              />
              Sooprema
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40">
              <input
                type="checkbox"
                name="publish_kyero"
                defaultChecked={Boolean(ipAny?.publish_kyero)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
              Kyero
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40">
              <input
                type="checkbox"
                name="publish_idealista"
                defaultChecked={Boolean(ipAny?.publish_idealista)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
              Idealista
            </label>
          </div>

          <h3 className="mb-3 mt-6 text-sm font-bold text-[#F5F0E8]">⚡ Feeds XML</h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40">
              <input
                type="checkbox"
                name="xml_class_villas"
                defaultChecked={Boolean(ipAny?.xml_class_villas)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
              Class and villas
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40">
              <input
                type="checkbox"
                name="publish_imoluc"
                defaultChecked={Boolean(ipAny?.publish_imoluc)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
              INMOLUK
            </label>
          </div>
        </section>
      </div>

      {/* Feedback */}
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-[#2ECC9A]/20 bg-[#2ECC9A]/10 px-4 py-3 text-sm text-[#2ECC9A]">
          {success}
        </p>
      )}

      {/* Botones — sticky bottom */}
      <div
        className="pb-safe sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 -mx-6 flex flex-col gap-2 border-t border-[#C9A84C]/15 bg-[#0A0A0A]/95 px-4 pt-3 backdrop-blur-xl sm:flex-row sm:px-6 sm:py-3 md:bottom-0"
      >
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-[#F5F0E8] transition active:scale-[0.98] hover:bg-white/10 disabled:opacity-50 sm:w-auto sm:flex-1"
        >
          {isPending ? '⏳ Guardando...' : '💾 Guardar borrador'}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full rounded-xl bg-[#C9A84C] px-6 py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition active:scale-[0.98] hover:bg-[#E8C96A] disabled:opacity-50 sm:w-auto sm:flex-[2]"
        >
          {isPending ? '⏳ Enviando...' : '📨 Enviar propiedad'}
        </button>
      </div>
    </form>
  )
}
