'use client'

import { useState, useTransition, useEffect } from 'react'
import { toggleChecklistItem, resetWeeklyPlan } from '@/actions/checklist'
import type { ChecklistItem } from '@/types/database'

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
}

const DAY_SHORT: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

function getTodayKey(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()] || 'monday'
}

function getDayScore(items: ChecklistItem[]): number {
  if (!items.length) return 0
  return Math.round((items.filter((i) => i.is_done).length / items.length) * 100)
}

interface DailyPlanProps {
  items: ChecklistItem[]
  weekStart: string
}

export function DailyPlan({ items: initialItems, weekStart }: DailyPlanProps) {
  const todayKey = getTodayKey()
  const activeDefault = DAYS.includes(todayKey) ? todayKey : 'monday'
  const [activeDay, setActiveDay] = useState(activeDefault)
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()
  const [showPerfect, setShowPerfect] = useState(false)

  const dayItems = items.filter((i) => i.day_of_week === activeDay)
  const mustDo = dayItems.filter((i) => i.category === 'must_do')
  const complete = dayItems.filter((i) => i.category === 'complete')
  const score = getDayScore(dayItems)

  // Solo mostrar celebración 1 vez por (día_calendario + día_semana)
  useEffect(() => {
    if (score !== 100 || dayItems.length === 0) return
    if (typeof window === 'undefined') return
    const today = new Date().toISOString().split('T')[0]
    const key = `perfect_${today}_${activeDay}`
    if (localStorage.getItem(key)) return // ya se mostró
    localStorage.setItem(key, '1')
    setShowPerfect(true)
  }, [score, activeDay, dayItems.length])

  function toggle(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const newDone = !item.is_done
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_done: newDone } : i))
    )
    startTransition(async () => { await toggleChecklistItem(itemId, newDone) })
  }

  function handleReset() {
    const ok = window.confirm(
      '¿Resetear toda la semana? Todas las tareas marcadas se desmarcarán. Esta acción no se puede deshacer.'
    )
    if (!ok) return
    setItems((prev) => prev.map((i) => ({ ...i, is_done: false, completed: 0 })))
    // Limpiar flags de "perfect day" mostrados esta semana
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('perfect_'))
        .forEach((k) => localStorage.removeItem(k))
    }
    startTransition(async () => { await resetWeeklyPlan(weekStart) })
  }

  const weekScore = Math.round(
    (items.filter((i) => i.is_done).length / (items.length || 1)) * 100
  )

  const scoreColor =
    score >= 100
      ? 'text-[#2ECC9A]'
      : score >= 80
        ? 'text-[#C9A84C]'
        : score >= 50
          ? 'text-[#F5F0E8]'
          : 'text-[#E05555]'

  const scoreLabel =
    score === 100
      ? '🏆 Perfect Day!'
      : score >= 80
        ? '🔥 Almost there!'
        : score >= 50
          ? '💪 Keep going!'
          : '⚡ Start ticking!'

  return (
    <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📋 Daily Action Plan
          </p>
          <p className="mt-0.5 text-[11px] text-[#9A9080]">
            Week of{' '}
            {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#C9A84C]/15 px-3 py-1 text-xs font-bold text-[#C9A84C]">
            {weekScore}% week
          </span>
          <button
            onClick={handleReset}
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] text-[#9A9080] transition hover:border-[#E05555]/30 hover:text-[#E05555]"
          >
            Reset Week
          </button>
        </div>
      </div>

      {/* Day progress bars */}
      <div className="mb-5 flex gap-1.5">
        {DAYS.map((day) => {
          const dayItemsForBar = items.filter((i) => i.day_of_week === day)
          const pct = getDayScore(dayItemsForBar)
          const isToday = day === todayKey
          const barColor =
            pct >= 80 ? '#2ECC9A' : pct >= 50 ? '#C9A84C' : '#E05555'
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className="group relative flex flex-1 flex-col items-center gap-1"
            >
              {/* Dot indicator para "hoy" - reemplaza el borde azul */}
              {isToday && (
                <span className="absolute -top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#C9A84C] shadow-[0_0_6px_rgba(201,168,76,0.8)]" />
              )}
              <div
                className="flex w-full items-end justify-center overflow-hidden rounded-t-md transition-all"
                style={{
                  height: 40,
                  background: isToday ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(pct, 4)}%`,
                    background: barColor,
                    opacity: 0.7,
                    transition: 'height 0.3s',
                  }}
                />
              </div>
              <span className={`text-[9px] font-bold transition ${isToday ? 'text-[#C9A84C]' : activeDay === day ? 'text-[#F5F0E8]' : 'text-[#9A9080]'}`}>
                {DAY_SHORT[day]}{isToday ? ' · Hoy' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* Day tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto">
        {DAYS.map((day) => {
          const pct = getDayScore(items.filter((i) => i.day_of_week === day))
          const isToday = day === todayKey
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-all ${
                activeDay === day
                  ? 'bg-[#C9A84C] text-black'
                  : 'border border-white/10 bg-white/4 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              {DAY_LABELS[day]}
              {isToday && <span className="text-[10px]">👈</span>}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  activeDay === day ? 'bg-black/20 text-black' : 'bg-white/10 text-[#9A9080]'
                }`}
              >
                {pct}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Score banner */}
      <div className="mb-5 rounded-xl border border-white/8 bg-[#1C1C1C] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
          <span className="text-sm text-[#9A9080]">{scoreLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              background: score >= 100 ? '#2ECC9A' : score >= 80 ? '#C9A84C' : score >= 50 ? '#C9A84C' : '#E05555',
            }}
          />
        </div>
      </div>

      {/* Tasks */}
      <TaskSection
        title="⚡ Must Do — 80% of Your Results"
        titleColor="#C9A84C"
        items={mustDo}
        onToggle={toggle}
      />
      <div className="my-3" />
      <TaskSection
        title="✅ Complete the Day"
        titleColor="#2ECC9A"
        items={complete}
        onToggle={toggle}
      />

      {/* Perfect Day overlay */}
      {showPerfect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-[#C9A84C]/30 bg-[#131313] p-8 text-center shadow-2xl">
            <div className="mb-4 text-6xl">🏆</div>
            <h2 className="mb-2 text-2xl font-bold text-[#C9A84C]">PERFECT DAY!</h2>
            <p className="mb-6 text-sm text-[#9A9080]">
              You crushed every single task today. That&apos;s what separates top agents.
            </p>
            <button
              onClick={() => setShowPerfect(false)}
              className="rounded-xl bg-[#C9A84C] px-8 py-3 font-bold text-black transition hover:bg-[#E8C96A]"
            >
              Let&apos;s Go! →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskSection({
  title,
  titleColor,
  items,
  onToggle,
}: {
  title: string
  titleColor: string
  items: ChecklistItem[]
  onToggle: (id: string) => void
}) {
  const done = items.filter((i) => i.is_done).length
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: titleColor }}>
          {title}
        </p>
        <span className="text-[10px] font-bold" style={{ color: titleColor }}>
          {done}/{items.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-all ${
              item.is_done
                ? 'border-[#2ECC9A]/25 bg-[#2ECC9A]/8'
                : `border-[${titleColor}]/20 bg-[${titleColor}]/5 hover:bg-[${titleColor}]/8`
            }`}
            style={
              !item.is_done
                ? { borderColor: `${titleColor}33`, backgroundColor: `${titleColor}0D` }
                : {}
            }
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                item.is_done ? 'border-[#2ECC9A] bg-[#2ECC9A]' : ''
              }`}
              style={!item.is_done ? { borderColor: titleColor + '99' } : {}}
            >
              {item.is_done && <span className="text-[10px] font-black text-black">✓</span>}
            </div>
            <span className={`flex-1 text-[13px] font-semibold transition-all ${item.is_done ? 'text-[#9A9080] line-through' : 'text-[#F5F0E8]'}`}>
              {item.label}
            </span>
            <span className={`text-[10px] font-bold ${item.is_done ? 'text-[#2ECC9A]' : ''}`} style={!item.is_done ? { color: titleColor } : {}}>
              {item.is_done ? 'DONE' : 'TODO'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
