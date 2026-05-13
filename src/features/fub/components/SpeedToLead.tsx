interface Props {
  scope: 'month' | 'year'
  overall_median_min: number | null
  sample_size: number
  by_user: Array<{
    fub_user_id: number
    email: string
    median_min: number | null
    sample_size: number
  }>
}

function fmtMins(m: number | null): string {
  if (m === null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const hours = m / 60
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function tier(m: number | null): { label: string; color: string } {
  if (m === null) return { label: '—', color: '#9CA3AF' }
  if (m < 5) return { label: 'excelente', color: '#2ECC9A' }
  if (m < 30) return { label: 'bien', color: '#84CC16' }
  if (m < 60 * 4) return { label: 'mejorable', color: '#F59E0B' }
  return { label: 'crítico', color: '#EF4444' }
}

export function SpeedToLead({ scope, overall_median_min, sample_size, by_user }: Props) {
  const overallTier = tier(overall_median_min)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Speed to Lead</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </div>

      <div className="mb-5 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Mediana global</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-neutral-900">{fmtMins(overall_median_min)}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: overallTier.color }}
          >
            {overallTier.label}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-neutral-500">{sample_size} leads analizados</div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Por agente
        </div>
        {by_user.length === 0 ? (
          <div className="text-center text-xs text-neutral-500 py-3">Sin datos</div>
        ) : (
          <div className="space-y-1.5">
            {by_user.slice(0, 10).map((u) => {
              const t = tier(u.median_min)
              return (
                <div key={u.fub_user_id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-100 px-3 py-1.5">
                  <span className="truncate text-xs text-neutral-700">{u.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-neutral-900">{fmtMins(u.median_min)}</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                      title={t.label}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
