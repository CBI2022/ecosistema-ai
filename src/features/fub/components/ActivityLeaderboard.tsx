import type { LeaderboardRow } from '@/actions/fub-stats'

interface Props {
  rows: LeaderboardRow[]
  scope: 'week' | 'month'
}

export function ActivityLeaderboard({ rows, scope }: Props) {
  const max = Math.max(...rows.map((r) => r.score), 1)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Activity Leaderboard</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          esta {scope === 'week' ? 'semana' : 'mes'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">Sin actividad registrada</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const widthPct = (r.score / max) * 100
            return (
              <div key={r.fub_user_id} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                <div className="text-right text-xs font-mono text-neutral-400">{i + 1}</div>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {r.name}
                      {r.is_admin && (
                        <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-700">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">{r.score}</div>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="mt-1 grid grid-cols-5 gap-1 text-[10px] text-neutral-500">
                    <span title="Llamadas">📞 {r.calls}</span>
                    <span title="Conversaciones (>60s)">💬 {r.conversations}</span>
                    <span title="Texts">📱 {r.texts}</span>
                    <span title="Emails">✉️ {r.emails}</span>
                    <span title="Citas held">📅 {r.appointments_held}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-neutral-900">{r.new_leads}</div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-400">leads</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
