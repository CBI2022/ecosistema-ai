import { getTranslations } from 'next-intl/server'
import type { LeaderboardRow } from '@/actions/fub-stats'

interface Props {
  rows: LeaderboardRow[]
  scope: 'week' | 'month'
}

export async function ActivityLeaderboard({ rows, scope }: Props) {
  const t = await getTranslations('fub')
  const max = Math.max(...rows.map((r) => r.score), 1)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">{t('leaderboard.title')}</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          {scope === 'week' ? t('leaderboard.scopeWeek') : t('leaderboard.scopeMonth')}
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-[#9A9080]">{t('leaderboard.empty')}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const widthPct = (r.score / max) * 100
            return (
              <div key={r.fub_user_id} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                <div className="text-right font-mono text-xs text-[#9A9080]">{i + 1}</div>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate text-sm font-medium text-[#F5F0E8]">
                      <span className="truncate">{r.name}</span>
                      {r.is_admin && (
                        <span className="flex-shrink-0 rounded bg-[#C9A84C]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#C9A84C]">
                          {t('leaderboard.adminBadge')}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[#9A9080]">{r.score}</div>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        background: 'linear-gradient(90deg, #C9A84C 0%, #E8C868 100%)',
                      }}
                    />
                  </div>
                  <div className="mt-1 grid grid-cols-5 gap-1 text-[10px] text-[#9A9080]">
                    <span title={t('leaderboard.tipCalls')}>📞 {r.calls}</span>
                    <span title={t('leaderboard.tipConversations')}>💬 {r.conversations}</span>
                    <span title={t('leaderboard.tipTexts')}>📱 {r.texts}</span>
                    <span title={t('leaderboard.tipEmails')}>✉️ {r.emails}</span>
                    <span title={t('leaderboard.tipAppointmentsHeld')}>📅 {r.appointments_held}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#F5F0E8]">{r.new_leads}</div>
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#9A9080]">{t('leaderboard.leadsLabel')}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
