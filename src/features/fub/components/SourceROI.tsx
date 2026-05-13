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
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Source ROI</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">Sin datos de sources</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 text-left font-medium">Source</th>
              <th className="pb-2 text-right font-medium">Leads</th>
              <th className="pb-2 text-right font-medium">Closings</th>
              <th className="pb-2 text-right font-medium">Conv.</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((r) => (
              <tr key={r.source} className="border-b border-neutral-50">
                <td className="py-2">
                  <div className="font-medium text-neutral-900 capitalize">{r.source}</div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(r.leads / maxLeads) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="py-2 text-right font-mono text-neutral-700">{r.leads}</td>
                <td className="py-2 text-right font-mono text-neutral-700">{r.closings}</td>
                <td className="py-2 text-right">
                  <span className={`font-mono ${r.conversion_pct >= 5 ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                    {r.conversion_pct}%
                  </span>
                </td>
                <td className="py-2 text-right font-mono font-semibold text-neutral-900">
                  {r.revenue_eur > 0 ? fmtEur(r.revenue_eur) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
