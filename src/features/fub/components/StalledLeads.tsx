interface Props {
  threshold_days: number
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

function daysAgo(iso: string | null): string {
  if (!iso) return 'nunca'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 3600 * 24))
  return `${days}d sin contacto`
}

export function StalledLeads({ threshold_days, people }: Props) {
  return (
    <section className="rounded-2xl border border-[#D4A056]/30 bg-gradient-to-br from-[#1A1408] to-[#0F0F0F] p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#F5F0E8]">
          <span className="text-base">⏱️</span>
          Stalled — recuperar
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4A056]">
          ≥ {threshold_days} días
        </span>
      </header>
      {people.length === 0 ? (
        <div className="py-6 text-center text-sm text-[#9A9080]">
          Sin leads abandonados. Excelente seguimiento.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {people.slice(0, 8).map((p) => (
            <li key={p.id}>
              <a
                href={`/leads?personId=${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2 transition hover:border-[#D4A056]/40 hover:bg-white/6"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#F5F0E8]">{p.name}</div>
                  <div className="truncate text-[11px] text-[#9A9080]">
                    {p.source_canonical || p.email || p.phone || '—'}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right text-[10px] font-medium text-[#D4A056]">
                  {daysAgo(p.last_activity_at)}
                </div>
              </a>
            </li>
          ))}
          {people.length > 8 && (
            <li className="pt-1 text-center text-[11px] text-[#9A9080]">
              +{people.length - 8} más en{' '}
              <a href="/leads?filter=stalled" className="font-medium text-[#C9A84C] hover:underline">
                /leads
              </a>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
