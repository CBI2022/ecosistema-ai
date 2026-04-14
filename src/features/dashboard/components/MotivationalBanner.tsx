interface MotivationalBannerProps {
  firstName: string | null
  motto: string | null
  why: string | null
}

export function MotivationalBanner({ firstName }: MotivationalBannerProps) {
  return (
    <div
      className="relative mb-5 overflow-hidden rounded-2xl border border-[#C9A84C]/15 px-8 py-8 sm:px-12 sm:py-10"
      style={{
        background:
          'linear-gradient(135deg, #1a0f2e 0%, #16132a 45%, #0d0a1c 100%)',
      }}
    >
      {/* Trophy background accent */}
      <div className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 text-[140px] leading-none opacity-[0.08] sm:text-[180px]">
        🏆
      </div>

      <div className="relative">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">
          CBI · Mission{firstName ? ` · ${firstName}` : ''}
        </p>
        <h2 className="max-w-4xl font-['Maharlika',serif] text-2xl font-bold uppercase leading-[1.05] tracking-tight text-[#F5F0E8] sm:text-3xl lg:text-[2.4rem]">
          We are building the #1 luxury real estate agency in Spain.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#9A9080]">
          Every call · every follow-up · every closing — gets us closer. Make today count.
        </p>
      </div>
    </div>
  )
}
