'use client'

import { useState, useRef } from 'react'

const ZONES = ['Altea','Albir','Calpe','Javea','Moraira','Benissa','Denia','Benidorm','La Nucia','Polop','Finestrat']
const TYPES = ['Villa','Apartment','Townhouse','Land','Commercial','Penthouse']

const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'
const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
const sectionClass = 'rounded-2xl border border-white/8 bg-[#131313] p-5'
const sectionTitleClass = 'mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]'

function fmt(n: number) {
  if (!n || isNaN(n)) return '€0'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function ValuationForm() {
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Commission calculator state
  const [salePrice, setSalePrice] = useState('')
  const [commissionPct, setCommissionPct] = useState('5')

  // Comparables
  const [comparables, setComparables] = useState<
    Array<{ address: string; price: string; area: string; distance: string }>
  >([
    { address: '', price: '', area: '', distance: '' },
  ])

  const priceNum = parseFloat(salePrice) || 0
  const pctNum = parseFloat(commissionPct) || 0
  const commissionAmount = (priceNum * pctNum) / 100
  const vat = commissionAmount * 0.21
  const totalAgencyFee = commissionAmount + vat
  const netToSeller = priceNum - totalAgencyFee

  function updateComparable(idx: number, field: string, value: string) {
    setComparables((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  function addComparable() {
    if (comparables.length >= 5) return
    setComparables((prev) => [...prev, { address: '', price: '', area: '', distance: '' }])
  }

  function removeComparable(idx: number) {
    if (comparables.length <= 1) return
    setComparables((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handlePDF() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)

    // Inyectar comparables como JSON
    fd.append('comparables_json', JSON.stringify(comparables.filter((c) => c.address || c.price)))
    // Inyectar valores calculados
    fd.append('commission_amount', String(commissionAmount))
    fd.append('commission_vat', String(vat))
    fd.append('net_to_seller', String(netToSeller))

    setLoading(true)
    const { generateValuationPDF } = await import('@/actions/tools')
    const res = await generateValuationPDF(fd)
    setLoading(false)
    if (res?.pdfUrl) window.open(res.pdfUrl, '_blank')
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Property Details */}
      <section className={sectionClass} style={{ borderTop: '1px solid #C9A84C' }}>
        <p className={sectionTitleClass}>📋 Detalles de la propiedad</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Nombre del propietario</label>
            <input type="text" name="owner_name" className={inputClass} placeholder="John Smith" />
          </div>
          <div>
            <label className={labelClass}>Email del propietario</label>
            <input type="email" name="owner_email" className={inputClass} placeholder="john@email.com" />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input type="tel" name="owner_phone" className={inputClass} placeholder="+34 ..." />
          </div>
          <div>
            <label className={labelClass}>Tipo de propiedad</label>
            <select name="property_type" className={inputClass}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input type="text" name="address" className={inputClass} placeholder="Calle Mayor 12, Altea" />
          </div>
          <div>
            <label className={labelClass}>Zona</label>
            <select name="zone" className={inputClass}>
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Referencia catastral (opcional)</label>
            <input type="text" name="cadastral_ref" className={inputClass} placeholder="1234567XX1234" />
          </div>
          <div>
            <label className={labelClass}>Año de construcción</label>
            <input type="number" name="year_built" className={inputClass} placeholder="2008" />
          </div>
        </div>
      </section>

      {/* Specifications */}
      <section className={sectionClass}>
        <p className={sectionTitleClass}>📐 Especificaciones</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Dormitorios</label>
            <input type="number" name="bedrooms" className={inputClass} placeholder="4" />
          </div>
          <div>
            <label className={labelClass}>Baños</label>
            <input type="number" name="bathrooms" className={inputClass} placeholder="3" />
          </div>
          <div>
            <label className={labelClass}>Superficie construida m²</label>
            <input type="number" name="build_area" className={inputClass} placeholder="280" />
          </div>
          <div>
            <label className={labelClass}>Parcela m²</label>
            <input type="number" name="plot_area" className={inputClass} placeholder="1200" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={sectionClass}>
        <p className={sectionTitleClass}>✨ Características</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { name: 'has_pool', label: 'Piscina', emoji: '🏊' },
            { name: 'has_garage', label: 'Garaje', emoji: '🚗' },
            { name: 'has_garden', label: 'Jardín', emoji: '🌳' },
            { name: 'has_terrace', label: 'Terraza', emoji: '☀️' },
            { name: 'has_ac', label: 'A/C', emoji: '❄️' },
            { name: 'has_sea_view', label: 'Vistas al mar', emoji: '🌊' },
          ].map((f) => (
            <label
              key={f.name}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] transition hover:border-[#C9A84C]/40 has-[:checked]:border-[#C9A84C]/60 has-[:checked]:bg-[#C9A84C]/10"
            >
              <input type="checkbox" name={f.name} className="accent-[#C9A84C]" />
              <span>{f.emoji}</span>
              <span className="text-xs">{f.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Gastos */}
      <section className={sectionClass}>
        <p className={sectionTitleClass}>🧾 Gastos anuales (opcional)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>IBI €/año</label>
            <input type="number" name="ibi_annual" className={inputClass} placeholder="850" />
          </div>
          <div>
            <label className={labelClass}>Basura €/año</label>
            <input type="number" name="basura_annual" className={inputClass} placeholder="120" />
          </div>
          <div>
            <label className={labelClass}>Comunidad €/año</label>
            <input type="number" name="community_annual" className={inputClass} placeholder="1200" />
          </div>
        </div>
      </section>

      {/* Valuation */}
      <section className={sectionClass}>
        <p className={sectionTitleClass}>💰 Valoración</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Valor estimado €</label>
            <input type="number" name="estimated_value" className={inputClass} placeholder="750000" />
          </div>
          <div>
            <label className={labelClass}>Valor mínimo €</label>
            <input type="number" name="min_value" className={inputClass} placeholder="700000" />
          </div>
          <div>
            <label className={labelClass}>Valor máximo €</label>
            <input type="number" name="max_value" className={inputClass} placeholder="800000" />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Notas del agente</label>
          <textarea name="notes" rows={3} className={inputClass} placeholder="Comentario de mercado, razones de la valoración, detalles únicos..." />
        </div>
      </section>

      {/* Commission + Net — en vivo */}
      <section className={sectionClass} style={{ borderTop: '1px solid #2ECC9A' }}>
        <p className={sectionTitleClass}>🧮 Comisión y neto para el vendedor</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Precio de venta propuesto €</label>
            <input
              type="number"
              name="sale_price"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className={inputClass}
              placeholder="750000"
            />
          </div>
          <div>
            <label className={labelClass}>Comisión %</label>
            <input
              type="number"
              step="0.1"
              name="commission_pct"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className={inputClass}
              placeholder="5"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Precio venta', value: fmt(priceNum), color: '#F5F0E8' },
            { label: `Comisión (${pctNum}%)`, value: fmt(commissionAmount), color: '#C9A84C' },
            { label: 'IVA 21%', value: fmt(vat), color: '#9A9080' },
            { label: 'Neto al vendedor', value: fmt(netToSeller), color: '#2ECC9A' },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5"
              style={{ borderTop: `2px solid ${row.color}` }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A9080]">
                {row.label}
              </p>
              <p className="mt-1 font-['Maharlika',serif] text-xl font-bold" style={{ color: row.color }}>
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparables */}
      <section className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            🏘️ Comparables de mercado
          </p>
          <button
            type="button"
            onClick={addComparable}
            disabled={comparables.length >= 5}
            className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 py-1.5 text-[10px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/20 disabled:opacity-40"
          >
            + Añadir comparable
          </button>
        </div>
        <div className="space-y-3">
          {comparables.map((c, idx) => (
            <div key={idx} className="grid gap-3 rounded-xl border border-white/8 bg-[#0A0A0A] p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={c.address}
                  onChange={(e) => updateComparable(idx, 'address', e.target.value)}
                  className={inputClass}
                  placeholder="Calle vecina..."
                />
              </div>
              <div>
                <label className={labelClass}>Precio €</label>
                <input
                  type="number"
                  value={c.price}
                  onChange={(e) => updateComparable(idx, 'price', e.target.value)}
                  className={inputClass}
                  placeholder="720000"
                />
              </div>
              <div>
                <label className={labelClass}>m² construidos</label>
                <input
                  type="number"
                  value={c.area}
                  onChange={(e) => updateComparable(idx, 'area', e.target.value)}
                  className={inputClass}
                  placeholder="265"
                />
              </div>
              <div>
                <label className={labelClass}>Distancia (m)</label>
                <input
                  type="number"
                  value={c.distance}
                  onChange={(e) => updateComparable(idx, 'distance', e.target.value)}
                  className={inputClass}
                  placeholder="250"
                />
              </div>
              <div className="flex items-end">
                {comparables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeComparable(idx)}
                    className="h-[42px] rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
                    aria-label="Eliminar"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent info */}
      <section className={sectionClass}>
        <p className={sectionTitleClass}>🧑‍💼 Agente CBI (aparecerá en la página de firmas)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nombre del agente</label>
            <input type="text" name="agent_name" className={inputClass} placeholder="Bruno Felipe" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="agent_email" className={inputClass} placeholder="bruno@cbi.com" />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input type="tel" name="agent_phone" className={inputClass} placeholder="+34 651 77 03 68" />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={handlePDF}
        disabled={loading}
        className="w-full rounded-xl bg-[#C9A84C] py-4 text-sm font-bold uppercase tracking-[0.08em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
      >
        {loading ? 'Generando PDF...' : '📄 Generar informe de valoración (PDF)'}
      </button>
    </form>
  )
}
