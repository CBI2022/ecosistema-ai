'use client'

import { useState, useRef, useEffect } from 'react'

const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'
const inputClass = 'block w-full min-w-0 max-w-full box-border rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080] appearance-none [&::-webkit-date-and-time-value]:text-left'

interface InvoiceFormProps {
  defaultAgentName?: string
  defaultAgentEmail?: string
  defaultAgentPhone?: string
}

export function InvoiceForm({
  defaultAgentName = '',
  defaultAgentEmail = '',
  defaultAgentPhone = '',
}: InvoiceFormProps = {}) {
  const [loading, setLoading] = useState(false)
  const [commissionPct, setCommissionPct] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [commissionAmount, setCommissionAmount] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  // Autogenerar número de factura: CBI-YYYY-NNN (fallback timestamp)
  const autoInvoiceNumber = `CBI-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

  useEffect(() => {
    const price = parseFloat(salePrice) || 0
    const pct = parseFloat(commissionPct) || 0
    if (price > 0 && pct > 0) {
      setCommissionAmount(String((price * pct / 100).toFixed(2)))
    }
  }, [salePrice, commissionPct])

  async function handlePDF() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    setLoading(true)

    const { generateInvoicePDF } = await import('@/actions/tools')
    const res = await generateInvoicePDF(fd)
    setLoading(false)

    if (res?.pdfUrl) {
      window.open(res.pdfUrl, '_blank')
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Invoice Info */}
      <section className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-4 sm:p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          🧾 Invoice Info
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className={labelClass}>Invoice Number</label>
            <input type="text" name="invoice_number" className={inputClass} defaultValue={autoInvoiceNumber} />
          </div>
          <div className="min-w-0">
            <label className={labelClass}>Invoice Date</label>
            <input
              type="date"
              name="invoice_date"
              className={inputClass}
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </section>

      {/* CBI Agency (pre-loaded) */}
      <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#131313] p-5" style={{ borderLeft: '3px solid #C9A84C' }}>
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          🏢 CBI Agency (datos precargados)
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Razón social</label>
            <input type="text" name="cbi_name" className={inputClass} defaultValue="Costa Blanca Investments S.L." />
          </div>
          <div>
            <label className={labelClass}>CIF</label>
            <input type="text" name="cbi_cif" className={inputClass} defaultValue="B12345678" />
          </div>
          <div>
            <label className={labelClass}>Teléfono CBI</label>
            <input type="text" name="cbi_phone" className={inputClass} defaultValue="+34 651 77 03 68" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input type="text" name="cbi_address" className={inputClass} defaultValue="Costa Blanca Norte, Alicante, España" />
          </div>
          <div>
            <label className={labelClass}>Web</label>
            <input type="text" name="cbi_website" className={inputClass} defaultValue="costablancainvestments.com" />
          </div>
        </div>
      </section>

      {/* Agent (From) — precargado con datos del perfil */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          👤 Agente (autónomo que emite la factura)
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo</label>
            <input type="text" name="agent_name" className={inputClass} defaultValue={defaultAgentName} placeholder="Maria García" />
          </div>
          <div>
            <label className={labelClass}>NIF / NIE</label>
            <input type="text" name="agent_nif" className={inputClass} placeholder="12345678A" />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input type="text" name="agent_phone" className={inputClass} defaultValue={defaultAgentPhone} placeholder="+34 600 000 000" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Email</label>
            <input type="email" name="agent_email" className={inputClass} defaultValue={defaultAgentEmail} placeholder="agent@cbi.com" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>IBAN (opcional)</label>
            <input type="text" name="agent_iban" className={inputClass} placeholder="ES91 2100 0418 45 0200051332" />
          </div>
        </div>
      </section>

      {/* Client (To) */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          🏢 Client (To)
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Client Name</label>
            <input type="text" name="client_name" className={inputClass} placeholder="John Smith" />
          </div>
          <div>
            <label className={labelClass}>NIF / NIE / Passport</label>
            <input type="text" name="client_nif" className={inputClass} placeholder="X1234567A" />
          </div>
          <div>
            <label className={labelClass}>Client Email</label>
            <input type="email" name="client_email" className={inputClass} placeholder="client@email.com" />
          </div>
        </div>
      </section>

      {/* Transaction */}
      <section className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          💰 Transaction
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>Property Address</label>
            <input type="text" name="property_address" className={inputClass} placeholder="Calle Mayor 12, Altea" />
          </div>
          <div>
            <label className={labelClass}>Sale Price €</label>
            <input
              type="number"
              name="sale_price"
              className={inputClass}
              placeholder="750000"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Commission %</label>
            <input
              type="number"
              name="commission_pct"
              className={inputClass}
              placeholder="3"
              step="0.1"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Commission Amount € (net)</label>
            <input
              type="number"
              name="commission_amount"
              className={`${inputClass} font-bold text-[#C9A84C]`}
              placeholder="22500"
              value={commissionAmount}
              onChange={(e) => setCommissionAmount(e.target.value)}
            />
          </div>
        </div>

        {commissionAmount && (
          <div className="mt-4 rounded-xl bg-[#0A0A0A] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9A9080]">Subtotal</span>
              <span className="text-[#F5F0E8]">€{parseFloat(commissionAmount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-[#9A9080]">IVA 21%</span>
              <span className="text-[#F5F0E8]">€{(parseFloat(commissionAmount) * 0.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-base font-bold">
              <span className="text-[#C9A84C]">Total (with VAT)</span>
              <span className="text-[#C9A84C]">€{(parseFloat(commissionAmount) * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className={labelClass}>Notes</label>
          <textarea name="notes" rows={2} className={inputClass} placeholder="Payment terms, bank details, references..." />
        </div>
      </section>

      <button
        type="button"
        onClick={handlePDF}
        disabled={loading}
        className="w-full rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
      >
        {loading ? 'Generating PDF...' : '🧾 Generate Invoice PDF'}
      </button>
    </form>
  )
}
