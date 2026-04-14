'use client'

import { useEffect, useState, useTransition } from 'react'
import { AGENT_WEEKS, DC_AGENT_TASKS, GOALS_90D, PHASE_COLORS, PHASE_LABELS, type GoalKey } from '../data/constants'
import { getAgentProfile, getAgentTrackerFor, getDcAgentTasks, toggleDcAgentTask } from '../actions'

interface AgentProfile {
  agent: { id: string; full_name: string | null; email: string; committed: boolean; current_week: number }
  progress: Record<string, boolean>
  checkins: { date: string; morning_answer: string | null; evening_done: boolean | null; evening_note: string | null }[]
}

export function AgentProfileView({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const [data, setData] = useState<AgentProfile | null>(null)
  const [tracker, setTracker] = useState<Record<GoalKey, number> | null>(null)
  const [dcTasks, setDcTasks] = useState<Record<string, boolean>>({})
  const [wi, setWi] = useState(0)
  const [, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      const [p, t, d] = await Promise.all([
        getAgentProfile(agentId),
        getAgentTrackerFor(agentId),
        getDcAgentTasks(agentId),
      ])
      setData(p as AgentProfile)
      setTracker(t as Record<GoalKey, number>)
      setDcTasks(d)
      setWi(p.agent.current_week ?? 0)
    })()
  }, [agentId])

  if (!data || !tracker) return <div className="text-sm text-[var(--text-muted)]">Loading…</div>

  const week = AGENT_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const dcList = DC_AGENT_TASKS[wi] ?? []

  const onToggle = (ti: number, val: boolean) => {
    const key = `${wi}-${ti}`
    setDcTasks(d => ({ ...d, [key]: val }))
    start(() => { void toggleDcAgentTask(agentId, wi, ti, val) })
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={onBack} className="self-start text-xs text-[var(--gold)]">← Back to team</button>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Agent</div>
        <h2 className="text-xl font-bold text-[var(--text)]">{data.agent.full_name ?? data.agent.email}</h2>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          {data.agent.committed ? `Committed · on Week ${AGENT_WEEKS[data.agent.current_week]?.week ?? 1}` : 'Not yet committed'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {(Object.keys(GOALS_90D) as GoalKey[]).map(k => (
          <div key={k} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <div className="text-xl font-bold text-[var(--gold)]">{tracker[k]}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{k}</div>
            <div className="text-[10px] text-[var(--text-faint)]">/ {GOALS_90D[k]}</div>
          </div>
        ))}
      </div>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {AGENT_WEEKS.map((w, i) => (
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
          <div className="text-sm font-semibold text-[var(--text)]">{week.action}</div>
          <div className="mt-1 text-xs" style={{ color: ac }}>{week.target}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Agent&apos;s tasks</div>
        <div className="flex flex-col gap-1">
          {week.tasks.map((task, ti) => {
            const isDone = !!data.progress[`${wi}-${ti}`]
            return (
              <div key={ti} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs">
                <span className={isDone ? 'text-emerald-400' : 'text-[var(--text-faint)]'}>{isDone ? '✓' : '○'}</span>
                <span className={isDone ? 'text-[var(--text-faint)] line-through' : 'text-[var(--text)]'}>{task}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Your DC tasks for this agent</div>
        <div className="flex flex-col gap-2">
          {dcList.map((task, ti) => {
            const isDone = !!dcTasks[`${wi}-${ti}`]
            return (
              <button
                key={ti}
                onClick={() => onToggle(ti, !isDone)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
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
        </div>
      </div>

      {data.checkins.length > 0 && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Last check-ins</div>
          <div className="flex flex-col gap-2">
            {data.checkins.slice(0, 10).map((c, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">{c.date}</span>
                  <span>{c.evening_done ? '✅' : c.evening_done === false ? '❌' : '—'}</span>
                </div>
                {c.morning_answer && <div className="text-[var(--text)]">☀️ {c.morning_answer}</div>}
                {c.evening_note && <div className="mt-1 text-[var(--text-muted)]">🌙 {c.evening_note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
