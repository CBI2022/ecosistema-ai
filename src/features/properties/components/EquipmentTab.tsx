'use client'

import { useTranslations } from 'next-intl'
import {
  inputClass,
  labelClass,
  sectionTitle,
  sectionSubtitle,
  slug,
  HEATING_OPTIONS,
  POOL_OPTIONS,
  AC_OPTIONS,
  FURNITURE_OPTIONS,
  EQUIPMENT_CHECKBOXES,
} from './property-form-constants'

/**
 * Pestaña Equipment (§1.4 + §4.3–4.6 de la especificación).
 * Inputs NO controlados: `defaultValue`/`defaultChecked` desde initialProperty.
 * Así `new FormData(form)` recoge los valores aunque la pestaña esté oculta.
 */
export function EquipmentTab({
  initialProperty,
}: {
  initialProperty: Record<string, unknown> | null
}) {
  const t = useTranslations('properties')
  const getStr = (k: string): string => {
    const v = initialProperty?.[k]
    return typeof v === 'string' ? v : ''
  }
  const getBool = (k: string): boolean => Boolean(initialProperty?.[k])

  const dropdowns: { name: string; label: string; group: string; options: string[] }[] = [
    { name: 'heating_type', label: t('equipment.heating'), group: 'heating', options: HEATING_OPTIONS },
    { name: 'pool_type', label: t('equipment.pool'), group: 'pool', options: POOL_OPTIONS },
    { name: 'ac_type', label: t('equipment.airConditioning'), group: 'ac', options: AC_OPTIONS },
    { name: 'furniture_status', label: t('equipment.furnitureType'), group: 'furniture', options: FURNITURE_OPTIONS },
  ]

  return (
    <div>
      <h2 className={sectionTitle}>🛠️ {t('equipment.title')}</h2>
      <p className={sectionSubtitle}>
        {t('equipment.subtitle')}
      </p>

      {/* Desplegables */}
      <div className="grid gap-4 sm:grid-cols-2">
        {dropdowns.map((d) => (
          <div key={d.name}>
            <label className={labelClass}>{d.label}</label>
            <select name={d.name} className={inputClass} defaultValue={getStr(d.name)}>
              <option value="">—</option>
              {d.options.map((o) => (
                <option key={o} value={o}>
                  {t(`opt.${d.group}.${slug(o)}`)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Checkboxes */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {EQUIPMENT_CHECKBOXES.map((c) => (
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
            {t(`opt.equipment.${c.name}`)}
          </label>
        ))}
      </div>
    </div>
  )
}
