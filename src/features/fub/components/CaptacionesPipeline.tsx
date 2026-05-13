interface Props {
  columns: Array<{
    stage_id: number | null
    stage_name: string
    count: number
    total_value_eur: number
  }>
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

const STAGE_COLORS: Record<string, string> = {
  'Start Stage': '#9CA3AF',
  'Listing Agreement Signed': '#3B82F6',
  Listed: '#A855F7',
  Offer: '#F59E0B',
  Pending: '#06B6D4',
  Closed: '#2ECC9A',
}

export function CaptacionesPipeline({ columns }: Props) {
  const totalCount = columns.reduce((s, c) => s + c.count, 0)
  const totalValue = columns.reduce((s, c) => s + c.total_value_eur, 0)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Captaciones Pipeline</h3>
          <div className="text-[10px] text-neutral-500 mt-0.5">Pipeline Sellers · Follow Up Boss</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-neutral-900">{fmtEur(totalValue)}</div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">
            {totalCount} captaciones
          </div>
        </div>
      </div>
      {columns.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">
          Sin deals en pipeline Sellers
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {columns.map((c) => {
            const color = STAGE_COLORS[c.stage_name] || '#9CA3AF'
            return (
              <div key={c.stage_id ?? c.stage_name} className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-neutral-600 truncate">{c.stage_name}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-neutral-900">{c.count}</div>
                <div className="text-[10px] text-neutral-500">{fmtEur(c.total_value_eur)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
