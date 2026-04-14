import type { Database } from '@/types/database'

type ExclusiveHome = Database['public']['Tables']['exclusive_homes']['Row']

interface ExclusiveHomesProps {
  homes: ExclusiveHome[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

export function ExclusiveHomes({ homes }: ExclusiveHomesProps) {
  return (
    <div
      className="mb-5 rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] p-5"
      style={{ borderTop: '1px solid #C9A84C' }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#C9A84C]/20 bg-[#C9A84C]/12 text-xl">
          💎
        </div>
        <div>
          <p className="text-sm font-bold text-[#F5F0E8]">Exclusive Homes</p>
          <p className="text-[11px] text-[#9A9080]/70">
            Off-market · Private listings · Handle with discretion
          </p>
        </div>
      </div>

      {homes.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#9A9080]/50">
          No exclusive homes added yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homes.map((home) => (
            <div
              key={home.id}
              className="group overflow-hidden rounded-[14px] border border-[#C9A84C]/20 bg-[#1C1C1C] transition-all hover:-translate-y-1 hover:border-[#C9A84C] hover:shadow-[0_12px_40px_rgba(201,168,76,0.15)]"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-[#111]">
                {home.cover_image ? (
                  <img
                    src={home.cover_image}
                    alt={home.title}
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl opacity-20">
                    🏡
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Badge */}
                <div className="absolute left-3 top-3 rounded bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-black">
                  💎 Exclusive
                </div>
                {/* Title */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-['Maharlika',serif] text-lg font-bold leading-tight text-white">
                    {home.title}
                  </p>
                  {home.location && (
                    <p className="text-[11px] text-white/60">📍 {home.location}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex items-start justify-between p-3.5">
                <div className="space-y-1">
                  {home.price && (
                    <p className="text-sm font-bold text-[#C9A84C]">
                      {fmt(home.price)}
                    </p>
                  )}
                  <p className="text-[11px] text-[#9A9080]">
                    {[
                      home.bedrooms && `${home.bedrooms} bed`,
                      home.bathrooms && `${home.bathrooms} bath`,
                      home.area_m2 && `${home.area_m2}m²`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#C9A84C] opacity-0 transition group-hover:opacity-100">
                  View →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
