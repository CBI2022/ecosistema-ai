'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  AGENT_WEEKS,
  GOALS_90D,
  PHASE_COLORS,
  PHASE_LABELS,
  TRAINING_VIDEOS,
  type GoalKey,
} from '../data/constants'
import {
  getAgentProgress,
  getTracker,
  getWeekVideos,
  saveAgentState,
  saveTracker,
  toggleAgentTask,
} from '../actions'
import { CommitmentScreen } from './CommitmentScreen'
import { DailyCheckIn } from './DailyCheckIn'

interface Props {
  userId: string
  userName: string
}

type TrackerNums = Record<GoalKey, number>
const ZERO: TrackerNums = { doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0, listings: 0 }

export function AgentDashboard({ userName }: Props) {
  const [loading, setLoading] = useState(true)
  const [committed, setCommitted] = useState(false)
  const [wi, setWi] = useState(0)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'tasks' | 'videos' | 'script'>('tasks')
  const [showCheckin, setShowCheckin] = useState(false)
  const [today, setToday] = useState<TrackerNums>(ZERO)
  const [totals, setTotals] = useState<TrackerNums>(ZERO)
  const [videos, setVideos] = useState<Record<string, string>>({})
  const [, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      const [p, t, v] = await Promise.all([getAgentProgress(), getTracker(), getWeekVideos()])
      setDone(p.progress)
      setCommitted(p.state.committed)
      setWi(p.state.current_week ?? 0)
      setToday(t.today as TrackerNums)
      setTotals(t.totals as TrackerNums)
      setVideos(v)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
  }

  if (!committed) {
    return <CommitmentScreen agentName={userName} onCommit={() => setCommitted(true)} />
  }

  const week = AGENT_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const totalTasks = AGENT_WEEKS.flatMap(w => w.tasks).length
  const doneCt = Object.values(done).filter(Boolean).length
  const pct = Math.round((doneCt / totalTasks) * 100)
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length
  const wkPct = Math.round((wkDone / week.tasks.length) * 100)
  const wkVideos = TRAINING_VIDEOS.filter(v => v.week === wi && videos[v.id])

  const onToggle = (ti: number, val: boolean) => {
    const key = `${wi}-${ti}`
    setDone(d => ({ ...d, [key]: val }))
    start(() => { void toggleAgentTask(wi, ti, val) })
  }

  const onChangeWeek = (n: number) => {
    setWi(n); setTab('tasks')
    start(() => { void saveAgentState(committed, n) })
  }

  const onUpdateGoal = (field: GoalKey, newTotal: number) => {
    const baseTotal = (totals[field] ?? 0) - (today[field] ?? 0)
    const newToday = Math.max(0, newTotal - baseTotal)
    const nextToday = { ...today, [field]: newToday }
    const nextTotals = { ...totals, [field]: baseTotal + newToday }
    setToday(nextToday); setTotals(nextTotals)
    start(() => { void saveTracker(nextToday) })
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-4">
      {showCheckin && <DailyCheckIn weekAction={week.action} onClose={() => setShowCheckin(false)} />}

      {/* Header — progress + checkin */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">90-Day Progress</div>
          <div className="text-2xl font-bold text-[var(--gold)]">{pct}%</div>
        </div>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          onClick={() => setShowCheckin(true)}
          className="rounded-lg bg-[var(--gold)] px-4 py-2 text-xs font-bold text-black"
        >
          ☀️ Check In
        </button>
      </div>

      {/* Week tabs */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {AGENT_WEEKS.map((w, i) => {
          const wd = w.tasks.filter((_, ti) => done[`${i}-${ti}`]).length
          const isCurrent = i === wi
          return (
            <button
              key={i}
              onClick={() => onChangeWeek(i)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition ${
                isCurrent
                  ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] font-bold'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-gold)]'
              }`}
            >
              Wk {w.week}{wd === w.tasks.length && <span className="ml-1 text-emerald-400">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Phase + action */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: ac }}>
          {PHASE_LABELS[week.phase]} · {week.days}
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: `${ac}40`, backgroundColor: `${ac}10` }}>
          <div className="mb-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: ac }}>Your priority this week</div>
          <div className="text-lg font-bold leading-snug text-[var(--text)]">{week.action}</div>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-4 border-b border-[var(--border)]">
        {(['tasks', ...(wkVideos.length ? (['videos'] as const) : []), ...(week.script ? (['script'] as const) : [])] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-2 py-2 text-xs capitalize transition ${
              tab === t ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="flex flex-col gap-2">
          {week.tasks.map((task, ti) => {
            const isDone = !!done[`${wi}-${ti}`]
            return (
              <button
                key={ti}
                onClick={() => onToggle(ti, !isDone)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-gold)]'
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                    isDone ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)]'
                  }`}
                >
                  {isDone && <span className="text-[10px] font-bold text-black">✓</span>}
                </div>
                <span className={`flex-1 text-sm ${isDone ? 'text-[var(--text-faint)] line-through' : 'text-[var(--text)]'}`}>
                  {task}
                </span>
              </button>
            )
          })}
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Week target</div>
            <div className="text-sm" style={{ color: ac }}>{week.target}</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full transition-all" style={{ width: `${wkPct}%`, backgroundColor: ac }} />
              </div>
              <span className="text-xs text-[var(--text-muted)]">{wkDone}/{week.tasks.length}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'videos' && (
        <div className="flex flex-col gap-3">
          {wkVideos.map(tv => {
            const loom = videos[tv.id]
            const m = loom.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
            const embed = m ? `https://www.loom.com/embed/${m[1]}` : null
            return (
              <div key={tv.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-1 text-sm font-semibold text-[var(--text)]">{tv.title}</div>
                <div className="mb-3 text-xs" style={{ color: ac }}>{tv.topic}</div>
                {embed ? (
                  <div className="relative h-0 overflow-hidden rounded-lg pb-[56.25%]">
                    <iframe src={embed} allowFullScreen className="absolute inset-0 h-full w-full" />
                  </div>
                ) : (
                  <a href={loom} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-[var(--gold)] px-4 py-2 text-xs font-bold text-black">▶ Watch</a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'script' && week.script && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: ac }}>
            {week.script.label}
          </div>
          <p className="text-sm italic leading-relaxed text-[var(--text-muted)]">{week.script.text}</p>
        </div>
      )}

      {/* Week nav */}
      <div className="flex gap-2">
        {wi > 0 && (
          <button onClick={() => onChangeWeek(wi - 1)} className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
            ← Wk {AGENT_WEEKS[wi - 1].week}
          </button>
        )}
        {wi < AGENT_WEEKS.length - 1 && (
          <button
            onClick={() => onChangeWeek(wi + 1)}
            className="flex-[2] rounded-xl px-4 py-3 text-sm font-bold text-black"
            style={{ backgroundColor: ac }}
          >
            Week {AGENT_WEEKS[wi + 1].week} →
          </button>
        )}
      </div>

      {/* 90-day goals */}
      <div className="border-t border-[var(--border)] pt-6">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">🎯 90-Day Goals</div>
        <div className="flex flex-col gap-3">
          {(
            [
              ['doors', 'Doors Knocked', '🚪'],
              ['contacts', 'New Contacts', '📇'],
              ['listings', 'New Listings', '🏡'],
              ['appointments', 'Appointments', '📅'],
              ['viewings', 'Viewings', '🏠'],
              ['offers', 'Offers', '📝'],
            ] as [GoalKey, string, string][]
          ).map(([key, label, icon]) => {
            const goal = GOALS_90D[key]
            const total = totals[key] ?? 0
            const gpct = Math.min((total / goal) * 100, 100)
            const goalDone = total >= goal
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 transition ${goalDone ? 'border-emerald-500/30' : 'border-[var(--border)]'} bg-[var(--card)]`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <div className="text-sm">
                    <span className={`text-lg font-bold ${goalDone ? 'text-emerald-400' : 'text-[var(--text)]'}`}>{total}</span>
                    <span className="ml-1 text-xs text-[var(--text-muted)]">/ {goal}</span>
                    {goalDone && <span className="ml-1">✅</span>}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={goal}
                  value={Math.min(total, goal)}
                  onChange={e => onUpdateGoal(key, parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--gold)]"
                  style={{
                    background: `linear-gradient(to right, ${goalDone ? '#10b981' : 'var(--gold)'} ${gpct}%, rgba(255,255,255,0.08) ${gpct}%)`,
                    borderRadius: 3,
                    height: 6,
                    appearance: 'none',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
