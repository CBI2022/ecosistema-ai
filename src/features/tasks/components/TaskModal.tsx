'use client'

import { useState } from 'react'
import { CATEGORIES, STATUS_CONFIG, PRIORITY_CONFIG } from './TasksDashboard'
import type { ProjectTask, TaskPriority, TaskStatus } from '@/types/database'

interface Assignee {
  id: string
  full_name: string | null
  email: string
  role: string
}
type TaskWithAssignee = ProjectTask & { assignee: Assignee | null }

interface TaskModalProps {
  task: TaskWithAssignee | null
  isAdmin: boolean
  assignableUsers: Array<{ id: string; full_name: string | null; email: string; role: string }>
  currentUserId: string
  onSave: (id: string | null, data: Partial<ProjectTask>) => Promise<{ error?: string }>
  onDelete?: () => void
  onClose: () => void
}

const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

export function TaskModal({
  task,
  isAdmin,
  assignableUsers,
  currentUserId,
  onSave,
  onDelete,
  onClose,
}: TaskModalProps) {
  const isNew = !task
  const isOwnTask = task?.assigned_to === currentUserId
  const canEditAll = isAdmin
  const canEditStatus = isAdmin || isOwnTask

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [category, setCategory] = useState(task?.category || 'general')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || '')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [notes, setNotes] = useState(task?.notes || '')
  const [docsUrl, setDocsUrl] = useState(task?.docs_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (canEditAll && !title.trim()) {
      setError('Título obligatorio')
      return
    }
    setSaving(true)
    const data: Partial<ProjectTask> = canEditAll
      ? {
          title,
          description: description || null,
          category,
          priority,
          status,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
          notes: notes || null,
          docs_url: docsUrl || null,
        }
      : { status, notes: notes || null }

    const res = await onSave(task?.id || null, data)
    setSaving(false)
    if (res?.error) setError(res.error)
  }

  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[CATEGORIES.length - 1]
  const pri = PRIORITY_CONFIG[priority]
  const st = STATUS_CONFIG[status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#C9A84C]/25 bg-[#131313] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isNew ? '➕' : '📋'}</span>
            <p className="text-base font-bold text-[#F5F0E8]">
              {isNew ? 'Nueva tarea' : 'Tarea'}
            </p>
            {!isNew && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: `${st.color}20`, color: st.color }}
              >
                {st.emoji} {st.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Title */}
          <div>
            <label className={labelClass}>Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditAll}
              className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              placeholder="Ej: Conectar Google Calendar"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEditAll}
              className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              placeholder="Qué hay que hacer, contexto..."
            />
          </div>

          {/* Meta row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!canEditAll}
                className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!canEditAll}
                className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              >
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={!canEditStatus}
                className={`${inputClass} ${!canEditStatus ? 'opacity-60' : ''}`}
              >
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + due date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Asignado a</label>
              {canEditAll ? (
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#9A9080]">
                  {task?.assignee?.full_name || task?.assignee?.email || '—'}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEditAll}
                className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              />
            </div>
          </div>

          {/* Docs URL */}
          <div>
            <label className={labelClass}>Docs URL (opcional)</label>
            <input
              type="url"
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              disabled={!canEditAll}
              className={`${inputClass} ${!canEditAll ? 'opacity-60' : ''}`}
              placeholder="https://..."
            />
          </div>

          {/* Notes - accesible para asignado y admin */}
          <div>
            <label className={labelClass}>Notas de progreso</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Avances, bloqueos, siguientes pasos..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Permissions note for non-admin */}
          {!isAdmin && (
            <p className="rounded-lg bg-[#C9A84C]/5 px-3 py-2 text-[11px] text-[#9A9080]">
              ℹ️ Solo puedes modificar el <strong>estado</strong> y las <strong>notas</strong> de esta tarea. Los admins gestionan el resto.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/8 px-5 py-4">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
            >
              🗑 Eliminar
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-[#C9A84C] px-5 py-2 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
