import { getTranslations } from 'next-intl/server'
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

function tier(
  m: number | null,
  t: (key: string) => string,
): { label: string; color: string } {
  if (m === null) return { label: '—', color: CBI_HEX.warmGray }
  if (m < 5) return { label: t('speedToLead.tierExcellent'), color: CBI_HEX.emerald }
  if (m < 30) return { label: t('speedToLead.tierGood'), color: CBI_HEX.gold }
  if (m < 60 * 4) return { label: t('speedToLead.tierImprovable'), color: CBI_HEX.amber }
  return { label: t('speedToLead.tierCritical'), color: CBI_HEX.crimson }
}

export async function SpeedToLead({ scope, overall_median_min, sample_size, by_user }: Props) {
  const t = await getTranslations('fub')
  const overallTier = tier(overall_median_min, t)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">{t('speedToLead.title')}</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          {scope === 'month' ? t('common.last30Days') : t('common.last12Months')}
        </span>
      </header>

      <div className="mb-5 rounded-xl border border-[#C9A84C]/15 bg-gradient-to-br from-[#1A1408] to-[#0F0F0F] p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">{t('speedToLead.globalMedian')}</div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-[#F5F0E8]">{fmtMins(overall_median_min)}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black"
            style={{ backgroundColor: overallTier.color }}
          >
            {overallTier.label}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-[#9A9080]">{t('speedToLead.leadsAnalyzed', { count: sample_size })}</div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A9080]">
          {t('speedToLead.byAgent')}
        </div>
        {by_user.length === 0 ? (
          <div className="py-3 text-center text-xs text-[#9A9080]">{t('speedToLead.noData')}</div>
        ) : (
          <div className="space-y-1.5">
            {by_user.slice(0, 10).map((u) => {
              const userTier = tier(u.median_min, t)
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
                      style={{ backgroundColor: userTier.color, boxShadow: `0 0 6px ${userTier.color}` }}
                      title={userTier.label}
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
