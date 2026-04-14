'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserGoalsLite {
  calls_per_day?: number | null
  followups_per_day?: number | null
  appointments_per_week?: number | null
}

interface TodaysChecklistProps {
  goals?: UserGoalsLite | null
}

function buildTasks(goals?: UserGoalsLite | null) {
  const calls = goals?.calls_per_day ?? 20
  const followups = goals?.followups_per_day ?? 15
  const dailyAppts = Math.max(1, Math.ceil((goals?.appointments_per_week ?? 5) / 5))

  return [
    { id: 'powerstart', emoji: '⚡', label: 'Power Hour — empieza antes de las 9AM' },
    { id: 'calls', emoji: '📞', label: `${calls} llamadas de prospección` },
    { id: 'followup', emoji: '🔄', label: `${followups} follow-ups` },
    { id: 'leads', emoji: '⚡', label: 'Responde nuevos leads en menos de 5 min' },
    { id: 'prosplist', emoji: '🏠', label: 'Prospecta 1 captación nueva' },
    { id: 'appt', emoji: '📅', label: `Agenda ${dailyAppts} cita${dailyAppts > 1 ? 's' : ''} hoy` },
    { id: 'pipeline', emoji: '💾', label: 'Actualiza tu pipeline' },
    { id: 'prep', emoji: '🗒️', label: `Prepara la lista de llamadas de mañana (${calls} nombres)` },
  ]
}

function getTodayKey() {
  return `checklist_${new Date().toISOString().split('T')[0]}`
}

export function TodaysChecklist({ goals }: TodaysChecklistProps = {}) {
  const TASKS = buildTasks(goals)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const key = getTodayKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setChecked(new Set(JSON.parse(saved)))
      } catch {}
    }
  }, [])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem(getTodayKey(), JSON.stringify([...next]))
      return next
    })
  }

  const done = checked.size
  const total = TASKS.length

  return (
    <div
      className="mb-5 rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5"
      style={{ borderTop: '1px solid #C9A84C' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            ✅ Today&apos;s Checklist
          </p>
          <span className="rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] font-bold text-black">
            {done}/{total}
          </span>
        </div>
        <Link
          href="/kpi"
          className="text-[11px] font-semibold text-[#9A9080] transition hover:text-[#C9A84C]"
        >
          Full Plan →
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        {TASKS.map((task) => {
          const isDone = checked.has(task.id)
          return (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-all ${
                isDone
                  ? 'border-[#2ECC9A]/25 bg-[#2ECC9A]/8'
                  : 'border-[#C9A84C]/20 bg-[#C9A84C]/5 hover:bg-[#C9A84C]/8'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isDone
                    ? 'border-[#2ECC9A] bg-[#2ECC9A]'
                    : 'border-[#C9A84C]/60'
                }`}
              >
                {isDone && (
                  <span className="text-[10px] font-black text-black">✓</span>
                )}
              </div>

              <span className="text-base">{task.emoji}</span>

              <span
                className={`flex-1 text-[13px] font-semibold transition-all ${
                  isDone ? 'text-[#9A9080] line-through' : 'text-[#F5F0E8]'
                }`}
              >
                {task.label}
              </span>

              <span
                className={`text-[10px] font-bold ${isDone ? 'text-[#2ECC9A]' : 'text-[#C9A84C]'}`}
              >
                {isDone ? 'DONE' : 'TODO'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
