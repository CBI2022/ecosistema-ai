'use client'

import { useEffect, useState, useTransition } from 'react'
import { DC_WEEKS, PHASE_COLORS, PHASE_LABELS } from '../data/constants'
import {
  getAgentOverview,
  getDcProgress,
  saveDcPrompt,
  toggleDcTask,
} from '../actions'
import { AgentProfileView } from './AgentProfileView'
import { VideoManager } from './VideoManager'

interface AgentOverview {
  id: string
  name: string
  email: string
  committed: boolean
  current_week: number
  completed_tasks: number
  total_checkins: number
  completed_checkins: number
  last_checkin: { date: string; evening_done: boolean | null; morning_answer: string | null } | null
  week_progress: Record<number, { done: number; total: number }>
}

export function DCDashboard() {
  const [tab, setTab] = useState<'team' | 'plan' | 'videos' | 'prompt'>('team')
  const [agents, setAgents] = useState<AgentOverview[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [dcProgress, setDcProgress] = useState<Record<string, boolean>>({})
  const [wi, setWi] = useState(0)
  const [, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      const [overview, progress] = await Promise.all([getAgentOverview(), getDcProgress()])
      setAgents(overview as AgentOverview[])
      setDcProgress(progress)
    })()
  }, [])

  if (selected) return <AgentProfileView agentId={selected} onBack={() => setSelected(null)} />

  const week = DC_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const wkDone = week.tasks.filter((_, ti) => dcProgress[`${wi}-${ti}`]).length

  const onToggleDc = (ti: number, val: boolean) => {
    const key = `${wi}-${ti}`
    setDcProgress(p => ({ ...p, [key]: val }))
    start(() => { void toggleDcTask(wi, ti, val) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 border-b border-[var(--border)]">
        {(['team', 'plan', 'videos', 'prompt'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-2 py-2 text-sm capitalize transition ${
              tab === t ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            {t === 'team' ? 'Team' : t === 'plan' ? 'My Plan' : t === 'videos' ? 'Videos' : 'Morning Prompt'}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div className="flex flex-col gap-2">
          {!agents && <div className="text-sm text-[var(--text-muted)]">Loading…</div>}
          {agents?.length === 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--text-muted)]">No agents yet.</div>}
          {agents?.map(a => {
            const wkCurrent = a.week_progress[a.current_week]
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--border-gold)]"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text)]">{a.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {a.committed ? `Wk ${a.current_week + 1}` : 'Not committed'} · {a.completed_tasks} tasks · {a.completed_checkins}/{a.total_checkins} check-ins
                  </div>
                  {wkCurrent && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/40">
                        <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${(wkCurrent.done / Math.max(wkCurrent.total, 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{wkCurrent.done}/{wkCurrent.total}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-[var(--gold)]">View →</div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'plan' && (
        <>
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
            {DC_WEEKS.map((w, i) => (
              <button
                key={i}
                onClick={() => setWi(i)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs ${
                  i === wi ? 'border-[var(--gold)] text-[var(--gold)] font-bold' : 'border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                Wk {w.week}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: ac }}>
              {PHASE_LABELS[week.phase]} · {week.days}
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: `${ac}40`, backgroundColor: `${ac}10` }}>
              <div className="text-base font-semibold text-[var(--text)]">{week.action}</div>
              <div className="mt-1 text-xs" style={{ color: ac }}>{week.target}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {week.tasks.map((task, ti) => {
              const isDone = !!dcProgress[`${wi}-${ti}`]
              return (
                <button
                  key={ti}
                  onClick={() => onToggleDc(ti, !isDone)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--card)]'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${isDone ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)]'}`}>
                    {isDone && <span className="text-[10px] font-bold text-black">✓</span>}
                  </div>
                  <span className={isDone ? 'text-[var(--text-faint)] line-through' : 'text-[var(--text)]'}>{task}</span>
                </button>
              )
            })}
            <div className="mt-2 text-xs text-[var(--text-muted)]">{wkDone}/{week.tasks.length}</div>
          </div>
        </>
      )}

      {tab === 'videos' && <VideoManager />}

      {tab === 'prompt' && <MorningPrompt />}
    </div>
  )
}

function MorningPrompt() {
  const [focus, setFocus] = useState('')
  const [win, setWin] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  const save = () => {
    if (pending) return
    start(async () => {
      await saveDcPrompt({ focusAnswer: focus.trim() || undefined, winAnswer: win.trim() || undefined })
      setSaved(true)
      setFocus(''); setWin('')
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">☀️ Morning prompt</div>
      <label className="mb-2 block text-xs text-[var(--text-muted)]">What is your team&apos;s #1 focus today?</label>
      <textarea
        value={focus}
        onChange={e => setFocus(e.target.value)}
        rows={2}
        className="mb-4 w-full resize-none rounded-lg border border-[var(--border)] bg-black/40 p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--gold)]"
      />
      <label className="mb-2 block text-xs text-[var(--text-muted)]">What would make today a win?</label>
      <textarea
        value={win}
        onChange={e => setWin(e.target.value)}
        rows={2}
        className="mb-4 w-full resize-none rounded-lg border border-[var(--border)] bg-black/40 p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--gold)]"
      />
      <button onClick={save} disabled={pending || (!focus && !win)} className="w-full rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
        {pending ? '…' : saved ? '✓ Saved' : 'Save'}
      </button>
    </div>
  )
}
