'use client'

import { useTranslations } from 'next-intl'
import { CATEGORIES, PRIORITY_CONFIG } from './TasksDashboard'
import type { ProjectTask } from '@/types/database'

interface Assignee {
  id: string
  full_name: string | null
  email: string
  role: string
}
type TaskWithAssignee = ProjectTask & { assignee: Assignee | null }

interface TrashModalProps {
  tasks: TaskWithAssignee[]
  onClose: () => void
  onRestore: (taskId: string) => void
  onDeleteForever: (taskId: string) => void
}

export function TrashModal({ tasks, onClose, onRestore, onDeleteForever }: TrashModalProps) {
  const t = useTranslations('tasks')
  const tCommon = useTranslations('common')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#131313] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
          <div>
            <p className="text-base font-bold text-[#F5F0E8]">🗑 {t('trash')}</p>
            <p className="mt-0.5 text-[11px] text-[#9A9080]">
              {t('trashFooterNote')}
            </p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-[#9A9080] hover:text-[#F5F0E8]" aria-label={tCommon('close')}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-3 text-5xl opacity-20">🗑</div>
              <p className="text-sm font-semibold text-[#9A9080]">{t('trashEmpty')}</p>
              <p className="mt-1 text-xs text-[#9A9080]/60">{t('trashEmptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[CATEGORIES.length - 1]
                const pri = task.priority ? PRIORITY_CONFIG[task.priority] : null
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-white/6 bg-[#1C1C1C] p-3 opacity-80 transition hover:opacity-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                          style={{ background: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.emoji} {cat.label}
                        </span>
                        {pri && (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${pri.bg}`} style={{ color: pri.color }}>
                            {pri.label}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-[#F5F0E8] line-through opacity-70">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#9A9080]">
                        {t('deletedOn')}{' '}
                        {task.deleted_at &&
                          new Date(task.deleted_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => onRestore(task.id)}
                        className="rounded-lg bg-[#2ECC9A]/15 px-3 py-1.5 text-[11px] font-bold text-[#2ECC9A] transition hover:bg-[#2ECC9A]/25"
                      >
                        ↩ {t('restore')}
                      </button>
                      <button
                        onClick={() => onDeleteForever(task.id)}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:bg-red-500/20"
                      >
                        🗑 {t('forceDelete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/6 bg-[#0A0A0A]/50 px-6 py-3">
          <p className="text-[11px] text-[#9A9080]">
            {t('trashFooterNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
