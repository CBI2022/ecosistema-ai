'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { saveProperty, submitProperty } from '@/actions/properties'
import { AddressPicker } from './AddressPicker'
import { EquipmentTab } from './EquipmentTab'
import { FeaturesTab } from './FeaturesTab'
import {
  inputClass,
  labelClass,
  sectionClass,
  sectionTitle,
  sectionSubtitle,
  slug,
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
  initialOwner?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
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

export function PropertyForm({
  initialProperty = null,
  initialOwner = null,
}: PropertyFormProps = {}) {
  const t = useTranslations('properties')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isEditing = !!initialProperty?.id

  const ipAny = initialProperty as Record<string, unknown> | null
  const getStr = (k: string) => (ipAny?.[k] as string | null | undefined) ?? ''
  const getNum = (k: string) => {
    const v = ipAny?.[k] as number | null | undefined
    return v === null || v === undefined ? '' : String(v)
  }

  // ── Estado controlado mínimo ──
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

  // ── Validación: "Enviar propiedad" solo se activa con los datos completos ──
  const [canSubmit, setCanSubmit] = useState(false)
  const checkComplete = useCallback(() => {
    const form = document.getElementById('propForm') as HTMLFormElement | null
    if (!form) { setCanSubmit(false); return }
    const fd = new FormData(form)
    const filled = (n: string) => String(fd.get(n) || '').trim().length > 0
    const required = [
      'views', 'build_area_m2', 'bedrooms', 'bathrooms',
      'street_name', 'street_number', 'city', 'postal_code',
      'owner_name', 'owner_phone', 'owner_email',
    ]
    let ok = salePrice > 0 && required.every(filled)
    if (ok && !plotOptional) ok = filled('plot_area_m2')
    setCanSubmit(ok)
  }, [salePrice, plotOptional])
  useEffect(() => { checkComplete() }, [checkComplete])


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
      else setSuccess(`💾 ${t('form.draftSaved')}`)
    })
  }

  /**
   * Enviar propiedad a la oficina. NO dispara el robot Sooprema — le llega a
   * la oficina (Chloe) para subirla a mano a Sooprema.
   */
  function handleSubmit() {
    setError(null)
    setSuccess(null)

    const fd = buildFormData('hidden')
    if (!fd) return

    startTransition(async () => {
      const res = await submitProperty(fd)
      if (res && 'error' in res && res.error) setError(res.error)
      else setSuccess(`✅ ${t('form.submitted')}`)
    })
  }

  return (
    <form
      id="propForm"
      onSubmit={(e) => e.preventDefault()}
      onInput={checkComplete}
      onChange={checkComplete}
      className="space-y-4 pb-28"
    >
      {initialProperty?.id && <input type="hidden" name="id" value={initialProperty.id} />}

      {/* Banner edición */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C9A84C]">{t('form.editingProperty')}</p>
            <p className="mt-0.5 text-sm text-[#F5F0E8]">
              {initialProperty?.reference} — {initialProperty?.title_headline || initialProperty?.location || t('form.untitled')}
            </p>
          </div>
          <a
            href="/properties"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#9A9080] hover:text-[#F5F0E8]"
          >
            ✕ {t('form.cancel')}
          </a>
        </div>
      )}

      {/* ─── Una sola pantalla: todas las secciones en scroll vertical ─── */}
      <div className="space-y-4">
        {/* Precio (PRIMER campo) + calculadora de comisión */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>
            💰 {t('price.title')}<Req />
          </h2>
          <p className={sectionSubtitle}>
            {t.rich('price.subtitle', { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                {t('price.salePriceLabel')}<Req />
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
              <label className={labelClass}>{t('price.commissionPct')}</label>
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2ECC9A]">💵 {t('price.commissionCbi')}</p>
                <p className="mt-1 text-2xl font-bold text-[#2ECC9A]">€{calculation.commission.toLocaleString('es-ES')}</p>
                <p className="text-[10px] text-[#9A9080]">
                  {t('price.commissionOver', { pct: commissionPct, amount: salePrice.toLocaleString('es-ES') })}
                </p>
              </div>
              <div className="rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🏷️ {t('price.ownerReceives')}</p>
                <p className="mt-1 text-2xl font-bold text-[#C9A84C]">€{calculation.ownerReceives.toLocaleString('es-ES')}</p>
                <p className="text-[10px] text-[#9A9080]">{t('price.ownerReceivesHint')}</p>
              </div>
            </div>
          )}
        </section>

        {/* Zona / Tipo / Vistas */}
        <section className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                📍 {t('general.zone')}<Req />
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
                🏠 {t('general.propertyType')}<Req />
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={inputClass}
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {t(`opt.propertyType.${pt.id}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {t('general.views')}<Req />
              </label>
              <select name="views" className={inputClass} defaultValue={initialProperty?.views ?? ''}>
                <option value="">—</option>
                {VIEWS_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {t(`opt.views.${slug(v)}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tamaños y habitaciones */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>📐 {t('sizes.title')}</h2>
          <p className={sectionSubtitle}>{t('sizes.subtitle')}</p>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Columna izquierda: tamaños */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    {t('sizes.builtSize')}<Req />
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
                    {t('sizes.plotSize')}{!plotOptional && <Req />}
                  </label>
                  <input
                    name="plot_area_m2"
                    type="number"
                    defaultValue={getNum('plot_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                  <p className="mt-1 text-[10px] text-[#9A9080]">
                    {t('sizes.plotHint')}
                  </p>
                </div>
                <div>
                  <label className={labelClass}>{t('sizes.useful')}</label>
                  <input
                    name="useful_area_m2"
                    type="number"
                    defaultValue={getNum('useful_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('sizes.terrace')}</label>
                  <input
                    name="terrace_area_m2"
                    type="number"
                    defaultValue={getNum('terrace_area_m2')}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>{t('sizes.garden')}</label>
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
                <label className={labelClass}>{t('rooms.bedrooms')}</label>
                <NumberSelect name="bedrooms" defaultValue={getNum('bedrooms')} max={15} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.bathrooms')}</label>
                <NumberSelect name="bathrooms" defaultValue={getNum('bathrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.guestToilet')}</label>
                <NumberSelect name="toilets" defaultValue={getNum('toilets')} max={5} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.lounge')}</label>
                <NumberSelect name="living_rooms" defaultValue={getNum('living_rooms')} max={5} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.diningRoom')}</label>
                <NumberSelect name="dining_rooms" defaultValue={getNum('dining_rooms')} max={5} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.kitchen')}</label>
                <select
                  name="kitchen_type"
                  className={inputClass}
                  defaultValue={getStr('kitchen_type')}
                >
                  <option value="">—</option>
                  {KITCHEN_TYPES.map((k) => (
                    <option key={k} value={k}>
                      {t(`opt.kitchen.${slug(k)}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>{t('rooms.buildYear')}</label>
                  <input
                    name="year_built"
                    type="number"
                    defaultValue={getNum('year_built')}
                    className={inputClass}
                    placeholder="2013"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('rooms.renovatedIn')}</label>
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
              <h2 className={sectionTitle}>🛏️ {t('guest.title')}</h2>
              <p className={sectionSubtitle}>{t('guest.subtitle')}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-xs text-[#F5F0E8]">
              <input
                type="checkbox"
                checked={hasGuestApt}
                onChange={(e) => setHasGuestApt(e.target.checked)}
                className="accent-[#C9A84C]"
              />
              {t('guest.hasGuestApartment')}
            </label>
          </div>

          {hasGuestApt && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>{t('rooms.bedrooms')}</label>
                <NumberSelect name="guest_bedrooms" defaultValue={getNum('guest_bedrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.bathrooms')}</label>
                <NumberSelect name="guest_bathrooms" defaultValue={getNum('guest_bathrooms')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.toilet')}</label>
                <NumberSelect name="guest_toilets" defaultValue={getNum('guest_toilets')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.lounge')}</label>
                <NumberSelect name="guest_lounge_count" defaultValue={getNum('guest_lounge_count')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.diningRoom')}</label>
                <NumberSelect name="guest_dining_count" defaultValue={getNum('guest_dining_count')} max={10} />
              </div>
              <div>
                <label className={labelClass}>{t('rooms.kitchen')}</label>
                <NumberSelect name="guest_kitchen_count" defaultValue={getNum('guest_kitchen_count')} max={10} />
              </div>
            </div>
          )}
        </section>

        {/* Certificado energético */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>⚡ {t('energy.title')}</h2>
          <p className={sectionSubtitle}>{t('energy.subtitle')}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('energy.emissionsRating')}</label>
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
              <label className={labelClass}>{t('energy.consumptionRating')}</label>
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
      <div>
        <section className={sectionClass}>
          <EquipmentTab initialProperty={ipAny} />
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 3 — FEATURES                                           */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div>
        <section className={sectionClass}>
          <FeaturesTab initialProperty={ipAny} />
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 4 — UBICACIÓN Y PROPIETARIO                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Dirección — NO TOCAR la lógica */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>📍 {t('location.addressTitle')}</h2>
          <p className={sectionSubtitle}>{t('location.addressSubtitle')}</p>

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
                {t('location.street')} <span className="text-red-400">*</span>
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
                {t('location.number')} <span className="text-red-400">*</span>
              </label>
              <input
                name="street_number"
                defaultValue={getStr('street_number')}
                className={inputClass}
                placeholder="7"
              />
            </div>
            <div>
              <label className={labelClass}>{t('location.floor')}</label>
              <input
                name="apartment_floor"
                defaultValue={getStr('apartment_floor')}
                className={inputClass}
                placeholder="2"
              />
            </div>
            <div>
              <label className={labelClass}>{t('location.door')}</label>
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
                {t('location.city')} <span className="text-red-400">*</span>
              </label>
              <input
                name="city"
                defaultValue={getStr('city')}
                className={inputClass}
                placeholder={t('location.cityPlaceholder')}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t('location.postalCode')} <span className="text-red-400">*</span>
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

        {/* Propietario — inline. Se guarda en el listado de propietarios y se
            vincula a esta propiedad al enviar. */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>👤 {t('owner.title')}</h2>
          <p className={sectionSubtitle}>{t('owner.subtitle')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t('owner.name')}</label>
              <input name="owner_name" defaultValue={initialOwner?.full_name ?? ''} className={inputClass} placeholder={t('owner.namePlaceholder')} />
            </div>
            <div>
              <label className={labelClass}>{t('owner.phone')}</label>
              <input name="owner_phone" type="tel" defaultValue={initialOwner?.phone ?? ''} className={inputClass} placeholder="+34 600 000 000" />
            </div>
            <div>
              <label className={labelClass}>{t('owner.email')}</label>
              <input name="owner_email" type="email" defaultValue={initialOwner?.email ?? ''} className={inputClass} placeholder="email@ejemplo.com" />
            </div>
          </div>
          <input type="hidden" name="owner_id" defaultValue={getStr('owner_id')} />
        </section>
      </div>


      {/* ════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 6 — GASTOS Y PORTALES                                  */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Community costs */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>🏘️ {t('costs.title')}</h2>
          <p className={sectionSubtitle}>{t('costs.subtitle')}</p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t('costs.communityAnnual')}</label>
              <input
                name="community_annual"
                type="number"
                defaultValue={getNum('community_annual')}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>{t('costs.ibiAnnual')}</label>
              <input
                name="ibi_annual"
                type="number"
                defaultValue={getNum('ibi_annual')}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>{t('costs.wasteAnnual')}</label>
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

        {/* Publicación en portales — de momento solo Idealista */}
        <section className={sectionClass}>
          <h2 className={sectionTitle}>🌐 {t('portals.title')}</h2>
          <p className={sectionSubtitle}>{t('portals.subtitle')}</p>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40 sm:max-w-xs">
            <input
              type="checkbox"
              name="publish_idealista"
              defaultChecked={Boolean(ipAny?.publish_idealista)}
              className="h-4 w-4 accent-[#C9A84C]"
            />
            Idealista
          </label>
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

      {/* Barra de acción FIJA abajo — minimalista, segmento conectado */}
      <div className="pb-safe fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-white/[0.06] bg-[#0A0A0A]/95 px-3 pt-2.5 backdrop-blur-xl sm:px-6 md:bottom-0 md:pb-2.5 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          {!canSubmit && (
            <p className="mb-2 text-center text-[12px] text-[#C9A84C]/90">{t('form.fillAll')}</p>
          )}
          <div className="flex overflow-hidden rounded-2xl border border-[#C9A84C]/40 shadow-[0_4px_20px_rgba(201,168,76,0.18)]">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="flex-1 border-r border-[#C9A84C]/30 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-[#9A9080] transition active:scale-[0.99] hover:bg-white/[0.08] hover:text-[#F5F0E8] disabled:opacity-50"
            >
              {isPending ? t('form.savingDraft') : t('form.draftShort')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !canSubmit}
              className="flex-[2] bg-[#C9A84C] px-4 py-3.5 text-sm font-bold text-black transition active:scale-[0.99] hover:bg-[#E8C96A] disabled:cursor-not-allowed disabled:bg-[#C9A84C]/30 disabled:text-black/50"
            >
              {isPending ? t('form.submitting') : t('form.submitProperty')}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
