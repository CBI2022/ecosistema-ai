interface StatCardsProps {
  thisMonthRevenue: number
  monthlyGoal: number
  ytdRevenue: number
  annualGoal: number
  totalClosings: number
  currentMonth: number
}

function fmt(n: number) {
  return n >= 1000
    ? `€${(n / 1000).toFixed(1)}K`
    : `€${n.toLocaleString()}`
}

function pct(value: number, total: number) {
  if (!total) return 0
  return Math.min(Math.round((value / total) * 100), 999)
}

export function StatCards({
  thisMonthRevenue,
  monthlyGoal,
  ytdRevenue,
  annualGoal,
  totalClosings,
  currentMonth,
}: StatCardsProps) {
  const remaining = annualGoal - ytdRevenue
  const monthPct = pct(thisMonthRevenue, monthlyGoal)
  const ytdPct = pct(ytdRevenue, annualGoal)

  const cards = [
    {
      label: 'This Month',
      value: fmt(thisMonthRevenue),
      sub: monthlyGoal ? `${monthPct}% of €${(monthlyGoal / 1000).toFixed(0)}K goal` : 'No goal set',
      color: '#2ECC9A',
      borderColor: '#2ECC9A',
    },
    {
      label: 'Year to Date',
      value: fmt(ytdRevenue),
      sub: annualGoal ? `${ytdPct}% of €${(annualGoal / 1000).toFixed(0)}K annual` : 'No goal set',
      color: '#C9A84C',
      borderColor: '#C9A84C',
    },
    {
      label: 'Remaining',
      value: fmt(Math.max(0, remaining)),
      sub: remaining <= 0 ? '🎯 Goal achieved!' : `To hit annual goal`,
      color: remaining <= 0 ? '#2ECC9A' : '#E05555',
      borderColor: remaining <= 0 ? '#2ECC9A' : '#E05555',
    },
    {
      label: 'Closings',
      value: `${totalClosings}`,
      sub: `${currentMonth} months tracked`,
      color: '#8B5CF6',
      borderColor: '#8B5CF6',
    },
  ]

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-2.5 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-4 sm:rounded-[10px] sm:p-3.5"
          style={{ borderTop: `2px solid ${card.borderColor}` }}
        >
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] sm:text-[9px]">
            {card.label}
          </div>
          <div
            className="font-['Maharlika',serif] text-[26px] font-bold leading-none sm:text-3xl"
            style={{ color: card.color }}
          >
            {card.value}
          </div>
          <div className="mt-1.5 text-[11px] leading-snug text-[#9A9080] sm:text-[10px]">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
