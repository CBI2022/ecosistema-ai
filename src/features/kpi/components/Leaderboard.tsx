'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { getLeaderboardByYear } from '@/actions/kpi'

interface AgentEntry {
  id: string
  full_name: string | null
  avatar_url: string | null
  revenue: number
  closings: number
}

interface LeaderboardProps {
  agents: AgentEntry[]
  currentYear: number
  viewerId: string
  viewerRole: 'admin' | 'secretary' | 'agent' | 'photographer' | 'dc'
  viewerAnnualGoal?: number
}

function fmt(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

const RANK_COLORS = ['#C9A84C', '#9A9090', '#C97A3A']

export function Leaderboard({
  agents: initialAgents,
  currentYear,
  viewerId,
  viewerRole,
  viewerAnnualGoal = 0,
}: LeaderboardProps) {
  const t = useTranslations('leaderboard')
  const [year, setYear] = useState(currentYear)
  const [agents, setAgents] = useState(initialAgents)
  const [isPending, startTransition] = useTransition()

  function handleYearChange(newYear: number) {
    setYear(newYear)
    startTransition(async () => {
      const data = await getLeaderboardByYear(newYear)
      setAgents(data)
    })
  }

  const isPrivileged = viewerRole === 'admin' || viewerRole === 'secretary'

  // Agentes/fotógrafos/DC ven SOLO su propia performance (privado).
  // Admin/secretary ven el leaderboard completo del equipo.
  if (!isPrivileged) {
    const me = agents.find((a) => a.id === viewerId)
    const myRevenue = me?.revenue ?? 0
    const myClosings = me?.closings ?? 0
    const myAvg = myClosings ? Math.round(myRevenue / myClosings) : 0
    const myPct = viewerAnnualGoal
      ? Math.min(Math.round((myRevenue / viewerAnnualGoal) * 100), 999)
      : 0
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    return (
      <div className="space-y-5">
        <div
          className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5"
          style={{ borderTop: '1px solid #C9A84C' }}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
                🎯 {t('myPerformance')}
              </p>
              <p className="mt-0.5 text-[11px] text-[#9A9080]">
                {t('myPerformanceSubtitle', { year })}
              </p>
            </div>
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={isPending}
              className="rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-1.5 text-xs text-[#F5F0E8] outline-none disabled:opacity-50"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-white/8 bg-[#0F0F0F] p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                {t('myRevenue')}
              </p>
              <p className="mt-2 truncate text-xl font-bold text-[#C9A84C] sm:text-2xl">
                {myRevenue > 0 ? fmt(myRevenue) : '€0'}
              </p>
              <p className="mt-1 text-[11px] text-[#9A9080]">
                {t('deals', { count: myClosings })}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-white/8 bg-[#0F0F0F] p-3 sm:p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                {t('avgDeal')}
              </p>
              <p className="mt-2 truncate text-xl font-bold text-[#F5F0E8] sm:text-2xl">
                {myAvg > 0 ? fmt(myAvg) : '€0'}
              </p>
              <p className="mt-1 text-[11px] text-[#9A9080]">
                {t('avgCommission')}
              </p>
            </div>
          </div>

          {viewerAnnualGoal > 0 && (
            <div className="mt-4 rounded-xl border border-white/8 bg-[#0F0F0F] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
                🎯 {t('myAnnualGoal')}
              </p>
              <div className="mt-3 mb-2 flex justify-between text-[11px]">
                <span className="text-[#9A9080]">{t('current')}</span>
                <span className="font-bold text-[#C9A84C]">
                  {fmt(myRevenue)} / {fmt(viewerAnnualGoal)}
                </span>
              </div>
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(myPct, 100)}%`,
                    background:
                      myPct >= 100 ? '#2ECC9A' : myPct >= 60 ? '#C9A84C' : '#E05555',
                  }}
                />
              </div>
              <p
                className="text-2xl font-bold"
                style={{
                  color:
                    myPct >= 100 ? '#2ECC9A' : myPct >= 60 ? '#C9A84C' : '#E05555',
                }}
              >
                {myPct}%
              </p>
              <p className="text-[10px] text-[#9A9080]">{t('ofAnnualGoal')}</p>
            </div>
          )}

          <p className="mt-5 text-center text-[10px] text-[#6A6070]">
            🔒 {t('privateLeaderboardNote')}
          </p>
        </div>
      </div>
    )
  }

  // ====== VISTA ADMIN / SECRETARY ======
  const top = agents[0]
  const totalRevenue = agents.reduce((s, a) => s + a.revenue, 0)
  const totalDeals = agents.reduce((s, a) => s + a.closings, 0)
  const avgDeal = totalDeals ? Math.round(totalRevenue / totalDeals) : 0
  const activeAgents = agents.filter((a) => a.revenue > 0).length
  const annualTarget = 500_000 // TODO: sum of all agents' annual goals
  const teamPct = annualTarget ? Math.min(Math.round((totalRevenue / annualTarget) * 100), 999) : 0

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-5">
      {/* Main leaderboard */}
      <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              🏆 {t('revenueLeaderboard')}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9A9080]">
              {t('basedOnLoggedRevenue', { year })}
            </p>
          </div>
          <select
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            disabled={isPending}
            className="rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-1.5 text-xs text-[#F5F0E8] outline-none disabled:opacity-50"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9A9080]/60">
            {t('noRevenueLogged')}
          </p>
        ) : (
          <div className="space-y-0">
            {agents.map((agent, idx) => {
              const initials = agent.full_name
                ? agent.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                : '??'
              const barWidth = top?.revenue ? (agent.revenue / top.revenue) * 100 : 0
              const barColor =
                idx === 0 ? '#C9A84C' : idx === 1 ? '#9A9090' : idx === 2 ? '#C97A3A' : 'rgba(201,168,76,0.4)'

              return (
                <div
                  key={agent.id}
                  className="border-b border-white/6 py-4 last:border-0"
                >
                  <div className="mb-2 flex items-center gap-3">
                    {/* Rank */}
                    <span
                      className="w-6 text-center text-lg font-bold"
                      style={{ color: RANK_COLORS[idx] ?? '#9A9080' }}
                    >
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.full_name || ''}
                        className="h-8 w-8 rounded-full border border-[#C9A84C]/30 object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${RANK_COLORS[idx] ?? '#333'}, ${RANK_COLORS[idx] ?? '#333'}88)`,
                          color: idx < 3 ? '#000' : '#F5F0E8',
                        }}
                      >
                        {initials}
                      </div>
                    )}
                    {/* Name */}
                    <span className="flex-1 text-sm font-semibold text-[#F5F0E8]">
                      {agent.full_name || t('agent')}
                    </span>
                    {/* Revenue */}
                    <div className="text-right">
                      <p
                        className="text-base font-bold"
                        style={{ color: idx === 0 ? '#C9A84C' : '#F5F0E8' }}
                      >
                        {agent.revenue > 0 ? fmt(agent.revenue) : '—'}
                      </p>
                      <p className="text-[10px] text-[#9A9080]">
                        {t('deals', { count: agent.closings })}
                      </p>
                    </div>
                  </div>
                  {/* Bar */}
                  {agent.revenue > 0 && (
                    <div className="ml-9 h-1.5 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barWidth}%`, background: barColor }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Top performer */}
        <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#131313] p-4 text-center">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
            🥇 {t('topPerformer')}
          </p>
          <div className="mb-1 text-3xl">🏆</div>
          <p className="text-sm font-bold text-[#F5F0E8]">
            {top?.full_name ?? '—'}
          </p>
          <p className="mt-1 text-lg font-bold text-[#C9A84C]">
            {top ? fmt(top.revenue) : '€0'}
          </p>
          <p className="text-[10px] text-[#9A9080]">
            {t('dealsCountYear', { count: top?.closings ?? 0, year })}
          </p>
        </div>

        {/* Team revenue */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
            📊 {t('teamRevenue')}
          </p>
          {[
            { label: t('totalRevenue'), value: fmt(totalRevenue), color: '#C9A84C' },
            { label: t('totalDeals'), value: `${totalDeals}`, color: '#2ECC9A' },
            { label: t('avgDeal'), value: fmt(avgDeal), color: '#F5F0E8' },
            { label: t('activeAgents'), value: `${activeAgents} / ${agents.length}`, color: '#F5F0E8' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5">
              <span className="text-[11px] text-[#9A9080]">{row.label}</span>
              <span className="text-[11px] font-bold" style={{ color: row.color }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Year goal */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
            🎯 {t('yearGoalProgress')}
          </p>
          <div className="mb-2 flex justify-between text-[11px]">
            <span className="text-[#9A9080]">{t('current')}</span>
            <span className="font-bold text-[#C9A84C]">{fmt(totalRevenue)}</span>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(teamPct, 100)}%`,
                background:
                  teamPct >= 100
                    ? '#2ECC9A'
                    : teamPct >= 60
                      ? '#C9A84C'
                      : '#E05555',
              }}
            />
          </div>
          <p
            className="text-2xl font-bold"
            style={{
              color:
                teamPct >= 100 ? '#2ECC9A' : teamPct >= 60 ? '#C9A84C' : '#E05555',
            }}
          >
            {teamPct}%
          </p>
          <p className="text-[10px] text-[#9A9080]">{t('ofAnnualTargetReached')}</p>
        </div>
      </div>
    </div>
  )
}
