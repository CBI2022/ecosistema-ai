import type { PipelineColumn } from '@/actions/fub-stats'
import { STAGE_COLORS } from '../theme'

interface Props {
  columns: PipelineColumn[]
  compact?: boolean
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

export function PipelineKanban({ columns, compact = false }: Props) {
  if (!columns.length) {
    return (
      <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-6 text-center text-sm text-[#9A9080]">
        Sin stages configurados. Aplicar el seed de Follow Up Boss.
      </div>
    )
  }

  const total = columns.reduce((sum, c) => sum + c.count, 0)

  return (
    <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[#F5F0E8]">Pipeline</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A9080]">
          {total} leads activos
        </span>
      </header>
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const color = STAGE_COLORS[col.stage_name] || '#9A9080'
          return (
            <div
              key={col.stage_id}
              className={`flex-shrink-0 ${compact ? 'w-56' : 'w-64'} rounded-xl border border-white/8 bg-white/3`}
            >
              <div className="border-b border-white/8 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-xs font-medium text-[#F5F0E8]">{col.stage_name}</span>
                  <span className="ml-auto rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-[#F5F0E8]">
                    {col.count}
                  </span>
                </div>
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto p-2">
                {col.people.length === 0 && (
                  <div className="py-6 text-center text-[11px] text-[#9A9080]/70">vacío</div>
                )}
                {col.people.map((p) => (
                  <a
                    key={p.id}
                    href={`/leads?personId=${p.id}`}
                    className="block rounded-lg border border-white/6 bg-white/3 p-2 transition hover:border-[#C9A84C]/40 hover:bg-white/6"
                  >
                    <div className="truncate text-xs font-medium text-[#F5F0E8]">{p.name}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-[#9A9080]">
                      <span className="truncate">{p.source_canonical || p.email || '—'}</span>
                      <span className="flex-shrink-0 font-mono">{timeAgo(p.last_activity_at)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
