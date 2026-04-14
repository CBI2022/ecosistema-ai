'use client'

import { useState, useMemo } from 'react'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './TasksDashboard'
import type { ProjectTask } from '@/types/database'

interface Assignee {
  id: string
  full_name: string | null
  email: string
  role: string
}
type TaskWithAssignee = ProjectTask & { assignee: Assignee | null }

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Lunes = 0
  const days: Array<{ date: Date; iso: string; inMonth: boolean }> = []
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, iso: toISODate(d), inMonth: false })
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d)
    days.push({ date: dt, iso: toISODate(dt), inMonth: true })
  }
  while (days.length < 42) {
    const lastDay = days[days.length - 1].date
    const next = new Date(lastDay)
    next.setDate(lastDay.getDate() + 1)
    days.push({ date: next, iso: toISODate(next), inMonth: false })
  }
  return days
}

export function CalendarView({
  tasks,
  onTaskClick,
}: {
  tasks: TaskWithAssignee[]
  onTaskClick: (t: TaskWithAssignee) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  // Map de fecha → tareas
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithAssignee[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      if (!map.has(t.due_date)) map.set(t.due_date, [])
      map.get(t.due_date)!.push(t)
    }
    return map
  }, [tasks])

  const unscheduled = tasks.filter((t) => !t.due_date)
  const todayIso = toISODate(today)

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) } else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) } else setMonth(month + 1)
  }

  const daySelected = selectedDay ? tasksByDate.get(selectedDay) || [] : []

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Calendar */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
          >
            ‹
          </button>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#F5F0E8]">
            {MONTHS_ES[month]} {year}
          </p>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
          >
            ›
          </button>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#9A9080]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) => {
            const dayTasks = tasksByDate.get(cell.iso) || []
            const isSelected = selectedDay === cell.iso
            const isToday = cell.iso === todayIso

            return (
              <button
                key={i}
                onClick={() => cell.inMonth && setSelectedDay(cell.iso === selectedDay ? null : cell.iso)}
                disabled={!cell.inMonth}
                className={`relative flex min-h-[80px] flex-col rounded-lg border p-1.5 text-left transition ${
                  !cell.inMonth
                    ? 'border-transparent text-[#9A9080]/20'
                    : isSelected
                      ? 'border-[#C9A84C] bg-[#C9A84C]/15'
                      : isToday
                        ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5 text-[#F5F0E8] hover:border-[#C9A84C]/60'
                        : 'border-white/8 bg-[#1C1C1C] text-[#F5F0E8] hover:border-[#C9A84C]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? 'text-[#C9A84C]' : ''}`}>
                    {cell.date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="rounded-full bg-[#C9A84C]/20 px-1.5 text-[9px] font-bold text-[#C9A84C]">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                {/* Hasta 2 tasks visibles */}
                <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => {
                    const pri = PRIORITY_CONFIG[t.priority]
                    return (
                      <div
                        key={t.id}
                        className="truncate rounded px-1 py-0.5 text-[9px] font-semibold"
                        style={{ background: `${pri.color}20`, color: pri.color }}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    )
                  })}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-[#9A9080]">+{dayTasks.length - 2}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-[10px] text-[#9A9080]">
          💡 Haz click en un día para ver todas sus tareas a la derecha.
        </p>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        {selectedDay && (
          <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#131313] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-xs text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
            </div>
            {daySelected.length === 0 ? (
              <p className="text-xs text-[#9A9080]/60">Sin tareas programadas</p>
            ) : (
              <div className="space-y-2">
                {daySelected.map((t) => (
                  <TaskMiniCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tareas sin fecha */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
            📌 Sin fecha asignada ({unscheduled.length})
          </p>
          {unscheduled.length === 0 ? (
            <p className="text-xs text-[#9A9080]/60">Todas tienen fecha 🎉</p>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {unscheduled.slice(0, 20).map((t) => (
                <TaskMiniCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
              ))}
              {unscheduled.length > 20 && (
                <p className="text-center text-[10px] text-[#9A9080]/60">... y {unscheduled.length - 20} más</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskMiniCard({ task, onClick }: { task: TaskWithAssignee; onClick: () => void }) {
  const st = STATUS_CONFIG[task.status]
  const pri = PRIORITY_CONFIG[task.priority]
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-white/8 bg-[#1C1C1C] p-2.5 text-left transition hover:border-[#C9A84C]/40"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: `${st.color}20`, color: st.color }}>
          {st.emoji}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${pri.bg}`} style={{ color: pri.color }}>
          {pri.label}
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-semibold text-[#F5F0E8]">{task.title}</p>
    </button>
  )
}
