interface Props {
  scope: 'month' | 'year'
  rows: Array<{
    source: string
    leads: number
    closings: number
    revenue_eur: number
    conversion_pct: number
  }>
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
  return `€${n}`
}

export function SourceROI({ scope, rows }: Props) {
  const maxLeads = Math.max(...rows.map((r) => r.leads), 1)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Source ROI</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-[#9A9080]">Sin datos de sources</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">
                <th className="pb-2 text-left font-medium">Source</th>
                <th className="pb-2 text-right font-medium">Leads</th>
                <th className="pb-2 text-right font-medium">Closings</th>
                <th className="pb-2 text-right font-medium">Conv.</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r) => (
                <tr key={r.source} className="border-b border-white/5 last:border-0">
                  <td className="py-2">
                    <div className="font-medium capitalize text-[#F5F0E8]">{r.source}</div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(r.leads / maxLeads) * 100}%`,
                          background: 'linear-gradient(90deg, #C9A84C 0%, #E8C868 100%)',
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono text-[#D0C8B8]">{r.leads}</td>
                  <td className="py-2 text-right font-mono text-[#D0C8B8]">{r.closings}</td>
                  <td className="py-2 text-right">
                    <span
                      className={`font-mono ${
                        r.conversion_pct >= 5 ? 'font-semibold text-[#7FB069]' : 'text-[#9A9080]'
                      }`}
                    >
                      {r.conversion_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-[#F5F0E8]">
                    {r.revenue_eur > 0 ? fmtEur(r.revenue_eur) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
