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
    <section className="rounded-2xl border border-[#C84B45]/30 bg-gradient-to-br from-[#1A0F0E] to-[#0F0F0F] p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#F5F0E8]">
          <span className="text-base">🔥</span>
          Hot List
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#E8907A]">
          {people.length} urgentes
        </span>
      </header>
      {people.length === 0 ? (
        <div className="py-6 text-center text-sm text-[#9A9080]">
          Sin leads calientes ahora. Buena oportunidad para prospectar.
        </div>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <a
                href={`/leads?personId=${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 p-3 transition hover:border-[#C84B45]/40 hover:bg-white/6"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#F5F0E8]">{p.name}</div>
                  <div className="mt-0.5 truncate text-xs text-[#9A9080]">
                    {p.source_canonical && (
                      <span className="mr-1.5 inline-block rounded bg-white/6 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#D0C8B8]">
                        {p.source_canonical}
                      </span>
                    )}
                    {p.phone || p.email || '—'}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#E8907A]">
                    {timeAgo(p.last_activity_at)}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
