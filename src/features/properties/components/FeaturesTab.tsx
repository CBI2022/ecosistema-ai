'use client'

import { useTranslations } from 'next-intl'
import {
  inputClass,
  labelClass,
  sectionTitle,
  sectionSubtitle,
  slug,
  floorNthMatch,
  ORIENTATION_OPTIONS,
  TERRAIN_OPTIONS,
  FLOORS_OPTIONS,
  FLOOR_LABEL_OPTIONS,
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
                {t(`opt.orientation.${slug(o)}`)}
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
                {t(`opt.terrain.${slug(o)}`)}
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
            {FLOOR_LABEL_OPTIONS.map((o) => {
              const nth = floorNthMatch(o)
              return (
                <option key={o} value={o}>
                  {nth !== null ? t('opt.floor.nth', { n: nth }) : t(`opt.floor.${slug(o)}`)}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    </div>
  )
}
