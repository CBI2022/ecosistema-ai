'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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

export function TaskModal({
  task,
  isAdmin,
  assignableUsers,
  currentUserId,
  onSave,
  onDelete,
  onClose,
}: TaskModalProps) {
  const t = useTranslations('tasks')
  const tCommon = useTranslations('common')
  const isNew = !task
  const isOwnTask = task?.assigned_to === currentUserId
  const canEditAll = isAdmin
  const canEditStatus = isAdmin || isOwnTask

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [category, setCategory] = useState(task?.category || 'general')
  const [priority, setPriority] = useState<TaskPriority | ''>(task?.priority ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'next_action')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || '')
  // datetime-local expects "YYYY-MM-DDTHH:MM" — trim any zone/seconds
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 16) : '')
  const [isSaasCore, setIsSaasCore] = useState<boolean>(task?.is_saas_core ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (canEditAll && !title.trim()) {
      setError(t('titleRequired'))
      return
    }
    setSaving(true)
    const data: Partial<ProjectTask> = canEditAll
      ? {
          title,
          description: description || null,
          category,
          priority: priority || null,
          status,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
          is_saas_core: isSaasCore,
        }
      : { status, description: description || null }

    const res = await onSave(task?.id || null, data)
    setSaving(false)
    if (res?.error) setError(res.error)
  }

  const st = STATUS_CONFIG[status]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="pb-safe flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/8 bg-[#131313] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con status pill + close */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: `${st.color}20`, color: st.color }}
            >
              {st.emoji} {st.label}
            </span>
            {isNew && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9A9080]">
                {tCommon('new')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none text-[#9A9080] transition hover:text-[#F5F0E8]"
            aria-label={tCommon('close')}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Título — grande tipo Notion */}
          <div className="px-6 pt-5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditAll}
              placeholder="Título de la tarea..."
              className="w-full border-0 bg-transparent font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8] placeholder-[#9A9080]/40 outline-none disabled:text-[#F5F0E8] disabled:opacity-100"
            />
          </div>

          {/* Propiedades — grid compacto tipo Notion */}
          <div className="mx-6 mt-4 mb-4 rounded-xl border border-white/6 bg-[#0A0A0A]/50 p-4">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[120px_1fr]">
              {/* Categoría */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                <span>🏷️</span> {t('category')}
              </div>
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!canEditAll}
                  className="w-full rounded-md border border-white/10 bg-[#1C1C1C] px-2.5 py-1.5 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 disabled:opacity-60"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Prioridad */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                <span>🚩</span> {t('priority')}
              </div>
              <div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
                  disabled={!canEditAll}
                  className="w-full rounded-md border border-white/10 bg-[#1C1C1C] px-2.5 py-1.5 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 disabled:opacity-60"
                >
                  <option value="">— Sin prioridad —</option>
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                <span>📍</span> {t('status')}
              </div>
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={!canEditStatus}
                  className="w-full rounded-md border border-white/10 bg-[#1C1C1C] px-2.5 py-1.5 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 disabled:opacity-60"
                >
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Asignado */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                <span>👤</span> {t('assignee')}
              </div>
              <div>
                {canEditAll ? (
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#1C1C1C] px-2.5 py-1.5 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                  >
                    <option value="">{t('unassigned')}</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-md border border-white/6 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-[#F5F0E8]">
                    {task?.assignee?.full_name || task?.assignee?.email || '—'}
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                <span>📅</span> {t('dueDate')}
              </div>
              <div>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEditAll}
                  className="w-full rounded-md border border-white/10 bg-[#1C1C1C] px-2.5 py-1.5 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 disabled:opacity-60 [color-scheme:dark]"
                />
              </div>

              {/* Core SaaS — solo admin lo ve y puede cambiarlo. Decide si la
                  tarea cuenta para la barra de progreso del SaaS en /tasks. */}
              {canEditAll && (
                <>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
                    <span>🏗️</span> Core SaaS
                  </div>
                  <div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isSaasCore}
                      onClick={() => setIsSaasCore((v) => !v)}
                      className={`group inline-flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-xs transition ${
                        isSaasCore
                          ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-white/10 bg-[#1C1C1C] text-[#9A9080] hover:text-[#F5F0E8]'
                      }`}
                    >
                      <span className="font-semibold">
                        {isSaasCore ? 'Cuenta para la barra de progreso' : 'No cuenta para la barra de progreso'}
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                          isSaasCore ? 'bg-[#C9A84C]' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                            isSaasCore ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Descripción — el bloque grande */}
          <div className="px-6 pb-6">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9080]">
              <span>📝</span> {t('description')}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={14}
              className="w-full resize-y rounded-xl border border-white/10 bg-[#0A0A0A]/50 px-4 py-3 text-sm leading-relaxed text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]/60"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
            />
            {!isAdmin && (
              <p className="mt-2 text-[11px] text-[#9A9080]">
                {t('restrictedEdit')}
              </p>
            )}
          </div>

          {error && (
            <div className="mx-6 mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/6 bg-[#0A0A0A]/50 px-6 py-3">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
            >
              🗑 {tCommon('delete')}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-[#C9A84C] px-5 py-2 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
            >
              {saving ? tCommon('saving') : (isNew ? tCommon('create') : tCommon('save'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
