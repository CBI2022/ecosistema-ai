'use client'

import { useTranslations } from 'next-intl'
import {
  inputClass,
  labelClass,
  sectionTitle,
  sectionSubtitle,
  ORIENTATION_OPTIONS,
  TERRAIN_OPTIONS,
  FLOORS_OPTIONS,
  FLOOR_LABEL_OPTIONS,
  FEATURE_CHECKBOXES,
  FEATURE_TEXT_FIELDS,
} from './property-form-constants'

/**
 * Pestaña Features (§1.5 + §4.7–4.11 de la especificación).
 * Inputs NO controlados: `defaultValue`/`defaultChecked` desde initialProperty.
 *
 * Floors = nº total de plantas de la propiedad/edificio (total_floors).
 * Floor nº = planta en la que está ubicada (floor_label).
 */
export function FeaturesTab({
  initialProperty,
}: {
  initialProperty: Record<string, unknown> | null
}) {
  const t = useTranslations('properties')
  const getStr = (k: string): string => {
    const v = initialProperty?.[k]
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    return ''
  }
  const getBool = (k: string): boolean => Boolean(initialProperty?.[k])

  return (
    <div>
      <h2 className={sectionTitle}>✨ {t('features.title')}</h2>
      <p className={sectionSubtitle}>
        {t('features.subtitle')}
      </p>

      {/* Desplegables */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{t('features.orientation')}</label>
          <select name="orientation" className={inputClass} defaultValue={getStr('orientation')}>
            <option value="">—</option>
            {ORIENTATION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('features.terrain')}</label>
          <select name="terrain_type" className={inputClass} defaultValue={getStr('terrain_type')}>
            <option value="">—</option>
            {TERRAIN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('features.totalFloors')}</label>
          <select name="total_floors" className={inputClass} defaultValue={getStr('total_floors')}>
            <option value="">—</option>
            {FLOORS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('features.floorLabel')}</label>
          <select name="floor_label" className={inputClass} defaultValue={getStr('floor_label')}>
            <option value="">—</option>
            {FLOOR_LABEL_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t('features.constructionType')}</label>
          <input
            name="construction_type"
            defaultValue={getStr('construction_type')}
            className={inputClass}
            placeholder={t('features.constructionTypePlaceholder')}
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_CHECKBOXES.map((c) => (
          <label
            key={c.name}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40"
          >
            <input
              type="checkbox"
              name={c.name}
              defaultChecked={getBool(c.name)}
              className="h-4 w-4 accent-[#C9A84C]"
            />
            {c.label}
          </label>
        ))}
      </div>

      {/* Campos de texto (distancias / servicios) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {FEATURE_TEXT_FIELDS.map((f) => (
          <div key={f.name}>
            <label className={labelClass}>{f.label}</label>
            <input
              name={f.name}
              defaultValue={getStr(f.name)}
              className={inputClass}
              placeholder="—"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
