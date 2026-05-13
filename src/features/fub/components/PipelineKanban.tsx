import type { PipelineColumn } from '@/actions/fub-stats'

interface Props {
  columns: PipelineColumn[]
  compact?: boolean
}

const STAGE_COLORS: Record<string, string> = {
  Lead: '#9CA3AF',
  'A - Hot 1-3 Months': '#EF4444',
  'B - Warm 3-6 Months': '#F59E0B',
  'C - Cold 6+ Months': '#3B82F6',
  Viewings: '#A855F7',
  Pending: '#06B6D4',
  Closed: '#2ECC9A',
  Sphere: '#737373',
  Unresponsive: '#525252',
  Trash: '#404040',
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Sin stages configurados. Aplicar el seed de Follow Up Boss.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Pipeline</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          {columns.reduce((sum, c) => sum + c.count, 0)} leads activos
        </span>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const color = STAGE_COLORS[col.stage_name] || '#9CA3AF'
          return (
            <div
              key={col.stage_id}
              className={`flex-shrink-0 ${compact ? 'w-56' : 'w-64'} rounded-xl border border-neutral-100 bg-neutral-50/40`}
            >
              <div className="border-b border-neutral-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-neutral-700">{col.stage_name}</span>
                  <span className="ml-auto rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                    {col.count}
                  </span>
                </div>
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto p-2">
                {col.people.length === 0 && (
                  <div className="py-6 text-center text-[11px] text-neutral-400">vacío</div>
                )}
                {col.people.map((p) => (
                  <a
                    key={p.id}
                    href={`/leads?personId=${p.id}`}
                    className="block rounded-lg border border-neutral-100 bg-white p-2 hover:border-neutral-300 hover:shadow-sm transition"
                  >
                    <div className="text-xs font-medium text-neutral-900 truncate">{p.name}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-neutral-500">
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
    </div>
  )
}
