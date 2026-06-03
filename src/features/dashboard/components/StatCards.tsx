'use client'

import { useTranslations } from 'next-intl'

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
  const t = useTranslations('dashboard')
  const remaining = annualGoal - ytdRevenue
  const monthPct = pct(thisMonthRevenue, monthlyGoal)
  const ytdPct = pct(ytdRevenue, annualGoal)

  const cards = [
    {
      label: t('thisMonth'),
      value: fmt(thisMonthRevenue),
      sub: monthlyGoal ? t('ofMonthlyGoal', { pct: monthPct, goal: (monthlyGoal / 1000).toFixed(0) }) : t('noGoalSet'),
      color: '#F5F0E8',
    },
    {
      label: t('yearToDate'),
      value: fmt(ytdRevenue),
      sub: annualGoal ? t('ofAnnualGoal', { pct: ytdPct, goal: (annualGoal / 1000).toFixed(0) }) : t('noGoalSet'),
      color: '#F5F0E8',
    },
    {
      label: t('remaining'),
      value: fmt(Math.max(0, remaining)),
      sub: remaining <= 0 ? t('goalAchievedShort') : t('toAnnualGoal'),
      color: remaining <= 0 ? '#2ECC9A' : '#F5F0E8',
    },
    {
      label: t('closings'),
      value: `${totalClosings}`,
      sub: t('closingsTracked', { months: currentMonth }),
      color: '#F5F0E8',
    },
  ]

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-2.5 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-4 sm:rounded-[10px] sm:p-3.5"
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
