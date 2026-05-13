import { CBI_HEX } from '../theme'

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
  if (m === null) return { label: '—', color: CBI_HEX.warmGray }
  if (m < 5) return { label: 'excelente', color: CBI_HEX.emerald }
  if (m < 30) return { label: 'bien', color: CBI_HEX.gold }
  if (m < 60 * 4) return { label: 'mejorable', color: CBI_HEX.amber }
  return { label: 'crítico', color: CBI_HEX.crimson }
}

export function SpeedToLead({ scope, overall_median_min, sample_size, by_user }: Props) {
  const overallTier = tier(overall_median_min)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Speed to Lead</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          últimos {scope === 'month' ? '30 días' : '12 meses'}
        </span>
      </header>

      <div className="mb-5 rounded-xl border border-[#C9A84C]/15 bg-gradient-to-br from-[#1A1408] to-[#0F0F0F] p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">Mediana global</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-[#F5F0E8]">{fmtMins(overall_median_min)}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black"
            style={{ backgroundColor: overallTier.color }}
          >
            {overallTier.label}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-[#9A9080]">{sample_size} leads analizados</div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A9080]">
          Por agente
        </div>
        {by_user.length === 0 ? (
          <div className="py-3 text-center text-xs text-[#9A9080]">Sin datos</div>
        ) : (
          <div className="space-y-1.5">
            {by_user.slice(0, 10).map((u) => {
              const t = tier(u.median_min)
              return (
                <div
                  key={u.fub_user_id}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-white/3 px-3 py-1.5"
                >
                  <span className="truncate text-xs text-[#D0C8B8]">{u.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#F5F0E8]">{fmtMins(u.median_min)}</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}` }}
                      title={t.label}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
