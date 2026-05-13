import { CBI_HEX } from '../theme'

interface Props {
  scope: 'month' | 'year'
  leads: number
  appointments: number
  offers: number
  closings: number
  leadToAppt: number
  apptToOffer: number
  offerToClosing: number
}

export function ConversionFunnel({
  scope,
  leads,
  appointments,
  offers,
  closings,
  leadToAppt,
  apptToOffer,
  offerToClosing,
}: Props) {
  const stages = [
    { label: 'Leads',     value: leads,        color: CBI_HEX.warmGray,  next: leadToAppt,     nextLabel: '→ Cita' },
    { label: 'Citas',     value: appointments, color: CBI_HEX.violet,    next: apptToOffer,    nextLabel: '→ Oferta' },
    { label: 'Ofertas',   value: offers,       color: CBI_HEX.amber,     next: offerToClosing, nextLabel: '→ Closing' },
    { label: 'Closings',  value: closings,     color: CBI_HEX.emerald,   next: null,           nextLabel: null },
  ]

  const max = Math.max(...stages.map((s) => s.value), 1)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Conversion Funnel</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </header>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const widthPct = (s.value / max) * 100
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-medium text-[#D0C8B8]">{s.label}</span>
                <span className="text-sm font-bold text-[#F5F0E8]">{s.value}</span>
              </div>
              <div className="h-7 overflow-hidden rounded-md bg-white/6">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.max(widthPct, 4)}%`,
                    backgroundColor: s.color,
                    boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.2)`,
                  }}
                />
              </div>
              {s.next !== null && i < stages.length - 1 && (
                <div className="mt-1 text-right text-[10px] text-[#9A9080]">
                  <span className="text-[#C9A84C] font-semibold">{s.next}%</span> {s.nextLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
