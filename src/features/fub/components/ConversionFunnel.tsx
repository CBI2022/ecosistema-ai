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
    { label: 'Leads', value: leads, color: '#9CA3AF', next: leadToAppt, nextLabel: '→ Cita' },
    { label: 'Citas', value: appointments, color: '#A855F7', next: apptToOffer, nextLabel: '→ Oferta' },
    { label: 'Ofertas', value: offers, color: '#F59E0B', next: offerToClosing, nextLabel: '→ Closing' },
    { label: 'Closings', value: closings, color: '#2ECC9A', next: null, nextLabel: null },
  ]

  const max = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Conversion Funnel</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </div>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const widthPct = (s.value / max) * 100
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-medium text-neutral-700">{s.label}</span>
                <span className="text-sm font-bold text-neutral-900">{s.value}</span>
              </div>
              <div className="h-7 overflow-hidden rounded-md bg-neutral-100">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.max(widthPct, 4)}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
              {s.next !== null && i < stages.length - 1 && (
                <div className="mt-1 text-right text-[10px] text-neutral-500">
                  {s.next}% {s.nextLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
