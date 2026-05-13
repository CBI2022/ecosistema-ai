interface Props {
  people: Array<{
    id: number
    name: string
    email: string | null
    phone: string | null
    source_canonical: string | null
    last_activity_at: string | null
    stage_id: number | null
  }>
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export function HotList({ people }: Props) {
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/50 to-orange-50/50 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <span className="text-base">🔥</span>
          Hot List
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-red-700">
          {people.length} urgentes
        </span>
      </div>
      {people.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">
          Sin leads calientes ahora. Buena oportunidad para prospectar.
        </div>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <a
                href={`/leads?personId=${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/60 bg-white p-3 hover:border-red-200 hover:shadow-sm transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-neutral-900">{p.name}</div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {p.source_canonical && (
                      <span className="mr-1.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
                        {p.source_canonical}
                      </span>
                    )}
                    {p.phone || p.email || '—'}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-red-600">{timeAgo(p.last_activity_at)}</div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
