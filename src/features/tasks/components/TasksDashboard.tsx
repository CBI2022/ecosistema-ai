'use client'

import { useState, useMemo, useTransition } from 'react'
import { createTask, updateTask, deleteTask, setTaskStatus, restoreTask, deleteTaskForever } from '@/actions/tasks'
import { TaskModal } from './TaskModal'
import { CalendarView } from './CalendarView'
import { TrashModal } from './TrashModal'
import type { ProjectTask, TaskStatus, TaskPriority } from '@/types/database'

interface Assignee {
  id: string
  full_name: string | null
  email: string
  role: string
  avatar_url?: string | null
}

type TaskWithAssignee = ProjectTask & { assignee: Assignee | null }

interface TasksDashboardProps {
  initialTasks: TaskWithAssignee[]
  trashedTasks: TaskWithAssignee[]
  currentUserId: string
  currentUserName: string
  isAdmin: boolean
  assignableUsers: Array<{ id: string; full_name: string | null; email: string; role: string }>
}

export const CATEGORIES = [
  { id: 'integrations', label: 'Integraciones', emoji: '🔌', color: '#8B5CF6' },
  { id: 'automation', label: 'Automatización', emoji: '🤖', color: '#06B6D4' },
  { id: 'photographer', label: 'Fotógrafo', emoji: '📸', color: '#EC4899' },
  { id: 'ux_improvements', label: 'UX / Mejoras', emoji: '🎨', color: '#F97316' },
  { id: 'infrastructure', label: 'Infraestructura', emoji: '🗄️', color: '#C9A84C' },
  { id: 'content', label: 'Contenido', emoji: '📋', color: '#2ECC9A' },
  { id: 'testing', label: 'Testing', emoji: '🧪', color: '#10B981' },
  { id: 'deployment', label: 'Deploy', emoji: '🚀', color: '#EF4444' },
  { id: 'legal', label: 'Legal / Ops', emoji: '📄', color: '#9CA3AF' },
  { id: 'external', label: 'Externo', emoji: '📦', color: '#6366F1' },
  { id: 'general', label: 'General', emoji: '📌', color: '#9A9080' },
]

// GTD: Next Action · Waiting · Some Day · Complete
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; emoji: string }> = {
  next_action: { label: 'Next Action', color: '#C9A84C', bg: 'bg-[#C9A84C]/10', emoji: '⚡' },
  waiting: { label: 'Waiting', color: '#8B5CF6', bg: 'bg-purple-500/10', emoji: '⏳' },
  someday: { label: 'Some Day', color: '#06B6D4', bg: 'bg-cyan-500/10', emoji: '💭' },
  complete: { label: 'Complete', color: '#2ECC9A', bg: 'bg-[#2ECC9A]/10', emoji: '✅' },
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; order: number }> = {
  urgent: { label: 'Urgente', color: '#EF4444', bg: 'bg-red-500/15', order: 0 },
  high: { label: 'Alta', color: '#F97316', bg: 'bg-orange-500/10', order: 1 },
  medium: { label: 'Media', color: '#06B6D4', bg: 'bg-cyan-500/10', order: 2 },
  low: { label: 'Baja', color: '#9CA3AF', bg: 'bg-white/5', order: 3 },
}

type ViewMode = 'kanban' | 'table' | 'calendar'
type ScopeFilter = 'mine' | 'all'
type SortBy = 'priority' | 'due_date' | 'created' | 'title' | 'status'

export function TasksDashboard({
  initialTasks,
  trashedTasks: initialTrash,
  currentUserId,
  isAdmin,
  assignableUsers,
}: TasksDashboardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [trashedTasks, setTrashedTasks] = useState(initialTrash)
  const [view, setView] = useState<ViewMode>('kanban')
  const [scope, setScope] = useState<ScopeFilter>('mine')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [search, setSearch] = useState('')
  const [modalTask, setModalTask] = useState<TaskWithAssignee | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const result = tasks.filter((t) => {
      if (scope === 'mine' && t.assigned_to !== currentUserId) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
      if (search && !`${t.title} ${t.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    // Sort
    const sorted = [...result]
    if (sortBy === 'priority') {
      sorted.sort((a, b) => PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order)
    } else if (sortBy === 'due_date') {
      sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    } else if (sortBy === 'created') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'status') {
      const order: TaskStatus[] = ['next_action', 'waiting', 'someday', 'complete']
      sorted.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
    }
    return sorted
  }, [tasks, scope, currentUserId, filterCategory, filterPriority, filterAssignee, search, sortBy])

  const stats = useMemo(() => ({
    total: filtered.length,
    next_action: filtered.filter((t) => t.status === 'next_action').length,
    waiting: filtered.filter((t) => t.status === 'waiting').length,
    someday: filtered.filter((t) => t.status === 'someday').length,
    complete: filtered.filter((t) => t.status === 'complete').length,
  }), [filtered])

  function updateLocalTask(id: string, patch: Partial<TaskWithAssignee>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function removeLocalTask(id: string) {
    const removed = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (removed) setTrashedTasks((prev) => [{ ...removed, deleted_at: new Date().toISOString() }, ...prev])
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    updateLocalTask(taskId, { status, completed_at: status === 'complete' ? new Date().toISOString() : null })
    startTransition(async () => { await setTaskStatus(taskId, status) })
  }

  async function handleSave(taskId: string | null, data: Partial<ProjectTask>) {
    if (taskId) {
      updateLocalTask(taskId, data as Partial<TaskWithAssignee>)
      const res = await updateTask(taskId, data as Parameters<typeof updateTask>[1])
      if (res?.error) return { error: res.error }
    } else {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)) })
      const res = await createTask(fd)
      if (res?.error) return { error: res.error }
      if (res?.success) window.location.reload()
    }
    setModalTask(null)
    setShowCreate(false)
    return {}
  }

  async function handleDelete(taskId: string) {
    if (!window.confirm('¿Enviar a la papelera? Podrás restaurarla desde la papelera.')) return
    removeLocalTask(taskId)
    setModalTask(null)
    startTransition(async () => { await deleteTask(taskId) })
  }

  async function handleRestore(taskId: string) {
    const restored = trashedTasks.find((t) => t.id === taskId)
    if (!restored) return
    setTrashedTasks((prev) => prev.filter((t) => t.id !== taskId))
    setTasks((prev) => [...prev, { ...restored, deleted_at: null }])
    startTransition(async () => { await restoreTask(taskId) })
  }

  async function handleDeleteForever(taskId: string) {
    if (!window.confirm('¿Eliminar DEFINITIVAMENTE? Esta acción no se puede deshacer.')) return
    setTrashedTasks((prev) => prev.filter((t) => t.id !== taskId))
    startTransition(async () => { await deleteTaskForever(taskId) })
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <div className="flex rounded-xl border border-white/8 bg-[#131313] p-1">
            <button
              onClick={() => setScope('mine')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${scope === 'mine' ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
            >
              👤 Mis tareas
            </button>
            <button
              onClick={() => setScope('all')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${scope === 'all' ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
            >
              👥 Todo el equipo
            </button>
          </div>
        ) : (
          <div className="text-xs text-[#9A9080]">
            Viendo <strong className="text-[#F5F0E8]">solo tus tareas</strong>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* View modes */}
          <div className="flex rounded-xl border border-white/8 bg-[#131313] p-1">
            {(['kanban', 'table', 'calendar'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${view === v ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
              >
                {v === 'kanban' ? '📊 Kanban' : v === 'table' ? '📋 Tabla' : '🗓️ Calendario'}
              </button>
            ))}
          </div>

          {/* Trash button (admin) */}
          {isAdmin && (
            <button
              onClick={() => setShowTrash(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
            >
              🗑 Papelera
              {trashedTasks.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {trashedTasks.length}
                </span>
              )}
            </button>
          )}

          {/* Crear nueva (admin) */}
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-[#C9A84C] px-5 py-2 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A]"
            >
              + Nueva tarea
            </button>
          )}
        </div>
      </div>

      {/* Stats — 5 columnas GTD */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: '#F5F0E8', emoji: '📋' },
          { label: 'Next Action', value: stats.next_action, color: STATUS_CONFIG.next_action.color, emoji: STATUS_CONFIG.next_action.emoji },
          { label: 'Waiting', value: stats.waiting, color: STATUS_CONFIG.waiting.color, emoji: STATUS_CONFIG.waiting.emoji },
          { label: 'Some Day', value: stats.someday, color: STATUS_CONFIG.someday.color, emoji: STATUS_CONFIG.someday.emoji },
          { label: 'Complete', value: stats.complete, color: STATUS_CONFIG.complete.color, emoji: STATUS_CONFIG.complete.emoji },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-[#131313] p-3" style={{ borderTop: `2px solid ${s.color}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{s.emoji} {s.label}</p>
            <p className="mt-1 font-['Maharlika',serif] text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-[#131313] p-3">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
        >
          <option value="all">Todas categorías</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
        >
          <option value="all">Cualquier prioridad</option>
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
          ))}
        </select>
        {isAdmin && scope === 'all' && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
          >
            <option value="all">Cualquier asignado</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email} ({u.role})
              </option>
            ))}
          </select>
        )}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-3 py-2 text-sm font-bold text-[#C9A84C] outline-none focus:border-[#C9A84C]/60"
          title="Ordenar"
        >
          <option value="priority">⬇ Prioridad</option>
          <option value="due_date">📅 Fecha límite</option>
          <option value="created">🕒 Más recientes</option>
          <option value="title">🔤 Título A→Z</option>
          <option value="status">📍 Estado</option>
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">🎉</div>
          <p className="text-sm font-semibold text-[#9A9080]">No hay tareas con estos filtros</p>
        </div>
      ) : view === 'kanban' ? (
        <KanbanView
          tasks={filtered}
          onTaskClick={setModalTask}
          onStatusChange={handleStatusChange}
          canMove={(t) => isAdmin || t.assigned_to === currentUserId}
        />
      ) : view === 'table' ? (
        <TableView
          tasks={filtered}
          onTaskClick={setModalTask}
          onStatusChange={handleStatusChange}
          canMove={(t) => isAdmin || t.assigned_to === currentUserId}
        />
      ) : (
        <CalendarView tasks={filtered} onTaskClick={setModalTask} />
      )}

      {/* Modals */}
      {(modalTask || showCreate) && (
        <TaskModal
          task={modalTask}
          isAdmin={isAdmin}
          assignableUsers={assignableUsers}
          currentUserId={currentUserId}
          onSave={handleSave}
          onDelete={isAdmin && modalTask ? () => handleDelete(modalTask.id) : undefined}
          onClose={() => { setModalTask(null); setShowCreate(false) }}
        />
      )}

      {showTrash && (
        <TrashModal
          tasks={trashedTasks}
          onClose={() => setShowTrash(false)}
          onRestore={handleRestore}
          onDeleteForever={handleDeleteForever}
        />
      )}
    </div>
  )
}

// ========== KANBAN (4 columnas GTD) ==========

function KanbanView({
  tasks,
  onTaskClick,
  onStatusChange,
  canMove,
}: {
  tasks: TaskWithAssignee[]
  onTaskClick: (t: TaskWithAssignee) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  canMove: (t: TaskWithAssignee) => boolean
}) {
  const columns: TaskStatus[] = ['next_action', 'waiting', 'someday', 'complete']

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('taskId', taskId)
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const task = tasks.find((t) => t.id === taskId)
    if (task && canMove(task) && task.status !== status) {
      onStatusChange(taskId, status)
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {columns.map((status) => {
        const cfg = STATUS_CONFIG[status]
        const colTasks = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
            className="rounded-2xl border border-white/8 bg-[#131313] p-3"
            style={{ borderTop: `2px solid ${cfg.color}` }}
          >
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: cfg.color }}>
                {cfg.emoji} {cfg.label}
              </p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#F5F0E8]">
                {colTasks.length}
              </span>
            </div>
            <div className="flex min-h-[200px] flex-col gap-2">
              {colTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  draggable={canMove(task)}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({
  task,
  draggable,
  onDragStart,
  onClick,
}: {
  task: TaskWithAssignee
  draggable: boolean
  onDragStart: (e: React.DragEvent) => void
  onClick: () => void
}) {
  const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[CATEGORIES.length - 1]
  const pri = PRIORITY_CONFIG[task.priority]
  const assignee = task.assignee

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border border-white/8 bg-[#1C1C1C] p-3 transition hover:border-[#C9A84C]/40 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: `${cat.color}20`, color: cat.color }}>
          {cat.emoji} {cat.label}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${pri.bg}`} style={{ color: pri.color }}>
          {pri.label}
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-semibold text-[#F5F0E8]">{task.title}</p>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-[#9A9080]">{task.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A84C]/20 text-[9px] font-bold text-[#C9A84C]">
              {(assignee.full_name || assignee.email).charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[100px] truncate text-[10px] text-[#9A9080]">
              {assignee.full_name || assignee.email.split('@')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[#9A9080]/50">Sin asignar</span>
        )}
        {task.due_date && (
          <span className="text-[10px] text-[#9A9080]">
            📅 {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ========== TABLE ==========

function TableView({
  tasks,
  onTaskClick,
  onStatusChange,
  canMove,
}: {
  tasks: TaskWithAssignee[]
  onTaskClick: (t: TaskWithAssignee) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  canMove: (t: TaskWithAssignee) => boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#131313]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/8 bg-[#1C1C1C]">
            <tr>
              {['Estado', 'Prio.', 'Cat.', 'Título', 'Asignado', 'Fecha', 'Acción'].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[CATEGORIES.length - 1]
              const pri = PRIORITY_CONFIG[task.priority]
              const st = STATUS_CONFIG[task.status]
              const assignee = task.assignee
              return (
                <tr key={task.id} className="border-b border-white/4 transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {canMove(task) ? (
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer rounded-md border border-white/10 bg-[#1C1C1C] px-2 py-1 text-[10px] font-bold outline-none focus:border-[#C9A84C]/60"
                        style={{ color: st.color }}
                      >
                        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ color: st.color }}>
                        {st.emoji} {st.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${pri.bg}`} style={{ color: pri.color }}>
                      {pri.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: `${cat.color}20`, color: cat.color }}>
                      {cat.emoji} {cat.label}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="truncate font-semibold text-[#F5F0E8]">{task.title}</p>
                    {task.description && <p className="truncate text-[11px] text-[#9A9080]">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C9A84C]/20 text-[10px] font-bold text-[#C9A84C]">
                          {(assignee.full_name || assignee.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-[#F5F0E8]">
                          {assignee.full_name || assignee.email.split('@')[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#9A9080]/50">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9A9080]">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
                    >
                      Abrir →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
