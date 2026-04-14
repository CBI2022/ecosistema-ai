'use client'

import { useState, useTransition } from 'react'
import { CATEGORIES, PRIORITY_CONFIG } from './TasksDashboard'
import { setTaskStatus } from '@/actions/tasks'
import type { ProjectTask } from '@/types/database'

interface Assignee {
  id: string
  full_name: string | null
  email: string
  role: string
}
type TaskWithAssignee = ProjectTask & { assignee: Assignee | null }

interface CompletedModalProps {
  tasks: TaskWithAssignee[]
  canEdit: (task: TaskWithAssignee) => boolean
  onClose: () => void
  onReopen: (taskId: string) => void
  onOpenTask: (task: TaskWithAssignee) => void
}

export function CompletedModal({ tasks, canEdit, onClose, onReopen, onOpenTask }: CompletedModalProps) {
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  const filtered = search
    ? tasks.filter((t) => `${t.title} ${t.description || ''}`.toLowerCase().includes(search.toLowerCase()))
    : tasks

  function handleReopen(e: React.MouseEvent, taskId: string) {
    e.stopPropagation()
    if (!window.confirm('¿Reabrir esta tarea? Volverá a Next Action.')) return
    onReopen(taskId)
    startTransition(async () => { await setTaskStatus(taskId, 'next_action') })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#2ECC9A]/25 bg-[#131313] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
          <div>
            <p className="text-base font-bold text-[#F5F0E8]">✅ Tareas completadas</p>
            <p className="mt-0.5 text-[11px] text-[#9A9080]">
              {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} completada{tasks.length !== 1 ? 's' : ''} — puedes reabrirlas si fue un error
            </p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-[#9A9080] hover:text-[#F5F0E8]" aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Search */}
        {tasks.length > 0 && (
          <div className="border-b border-white/6 px-5 py-3">
            <input
              type="text"
              placeholder="🔍 Buscar en completadas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#2ECC9A]/40 placeholder-[#9A9080]"
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-3 text-5xl opacity-20">✅</div>
              <p className="text-sm font-semibold text-[#9A9080]">Aún no has completado ninguna tarea</p>
              <p className="mt-1 text-xs text-[#9A9080]/60">Las tareas marcadas como "Complete" aparecerán aquí</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#9A9080]">Ninguna coincide con "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => {
                const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[CATEGORIES.length - 1]
                const pri = PRIORITY_CONFIG[task.priority]
                const assignee = task.assignee
                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/6 bg-[#1C1C1C] p-3 transition hover:border-[#2ECC9A]/40"
                  >
                    {/* Check decorativo */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2ECC9A]/15">
                      <span className="text-sm text-[#2ECC9A]">✓</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                          style={{ background: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.emoji} {cat.label}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${pri.bg}`} style={{ color: pri.color }}>
                          {pri.label}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-[#F5F0E8]">
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#9A9080]">
                        {task.completed_at && (
                          <span>
                            Completada el {new Date(task.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {assignee && (
                          <>
                            <span>·</span>
                            <span>{assignee.full_name || assignee.email.split('@')[0]}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {canEdit(task) && (
                      <button
                        onClick={(e) => handleReopen(e, task.id)}
                        className="shrink-0 rounded-lg bg-[#C9A84C]/15 px-3 py-1.5 text-[11px] font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/25"
                      >
                        ↩ Reabrir
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/6 bg-[#0A0A0A]/50 px-6 py-3">
          <p className="text-[11px] text-[#9A9080]">
            💡 Click en una tarea para abrir sus detalles. "Reabrir" la devuelve al flujo activo como Next Action.
          </p>
        </div>
      </div>
    </div>
  )
}
