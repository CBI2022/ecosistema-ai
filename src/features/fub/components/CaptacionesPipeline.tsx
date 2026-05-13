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

const STAGE_COLORS_SELLERS: Record<string, string> = {
  'Start Stage': '#9A9080',
  'Listing Agreement Signed': '#6FA8A3',
  Listed: '#9888B8',
  Offer: '#D4A056',
  Pending: '#C9A84C',
  Closed: '#7FB069',
}

export function CaptacionesPipeline({ columns }: Props) {
  const totalCount = columns.reduce((s, c) => s + c.count, 0)
  const totalValue = columns.reduce((s, c) => s + c.total_value_eur, 0)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F0E8]">Captaciones Pipeline</h3>
          <div className="mt-0.5 text-[10px] text-[#9A9080]">Pipeline Sellers · Follow Up Boss</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#C9A84C]">{fmtEur(totalValue)}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
            {totalCount} captaciones
          </div>
        </div>
      </header>
      {columns.length === 0 ? (
        <div className="py-6 text-center text-sm text-[#9A9080]">
          Sin deals en pipeline Sellers
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {columns.map((c) => {
            const color = STAGE_COLORS_SELLERS[c.stage_name] || '#9A9080'
            return (
              <div
                key={c.stage_id ?? c.stage_name}
                className="rounded-xl border border-white/8 bg-white/4 p-3 transition hover:border-[#C9A84C]/30"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  <span className="truncate text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">
                    {c.stage_name}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-[#F5F0E8]">{c.count}</div>
                <div className="text-[10px] text-[#9A9080]">{fmtEur(c.total_value_eur)}</div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
