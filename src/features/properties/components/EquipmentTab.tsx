'use client'

import {
  inputClass,
  labelClass,
  sectionTitle,
  sectionSubtitle,
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
  const getStr = (k: string): string => {
    const v = initialProperty?.[k]
    return typeof v === 'string' ? v : ''
  }
  const getBool = (k: string): boolean => Boolean(initialProperty?.[k])

  const dropdowns: { name: string; label: string; options: string[] }[] = [
    { name: 'heating_type', label: 'Heating', options: HEATING_OPTIONS },
    { name: 'pool_type', label: 'Pool', options: POOL_OPTIONS },
    { name: 'ac_type', label: 'Air Conditioning', options: AC_OPTIONS },
    { name: 'furniture_status', label: 'Furnitures type', options: FURNITURE_OPTIONS },
  ]

  return (
    <div>
      <h2 className={sectionTitle}>🛠️ Equipment</h2>
      <p className={sectionSubtitle}>
        Calefacción, piscina, climatización, mobiliario y el resto de equipamiento de la propiedad.
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
                  {o}
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
            {c.label}
          </label>
        ))}
      </div>
    </div>
  )
}
