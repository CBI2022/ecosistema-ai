'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { deleteProperty } from '@/actions/properties'
import type { Property } from '@/types/database'

type TFn = ReturnType<typeof useTranslations>

interface AgentInfo {
  full_name: string | null
  email: string
}

interface PropertyListProps {
  properties: Property[]
  agentsMap?: Record<string, AgentInfo> | null
  listTitle?: string
}

// Estado que ve el AGENTE, según el flujo real (review_status):
//  submitted = enviada a la oficina  ·  published = ya subida a Sooprema
//  sin enviar todavía = borrador
function StatusBadge({ p, t }: { p: Property; t: TFn }) {
  let label = t('list.statusDraft')
  let cls = 'bg-white/10 text-[#9A9080]'
  if (p.review_status === 'submitted') {
    label = t('list.statusSubmitted')
    cls = 'bg-[#C9A84C]/20 text-[#C9A84C]'
  } else if (p.review_status === 'published') {
    label = t('list.statusPublished')
    cls = 'bg-[#2ECC9A]/15 text-[#2ECC9A]'
  }
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>
}

function fmtShort(d: string | null): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

export function PropertyList({ properties, agentsMap = null, listTitle }: PropertyListProps) {
  const t = useTranslations('properties')
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleEdit(id: string) {
    router.push(`/properties?edit=${id}`)
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const res = await deleteProperty(id)
      if (res?.error) {
        setError(res.error)
      } else {
        setConfirmId(null)
        router.refresh()
      }
    })
  }

  if (properties.length === 0) return null

  const confirmProp = properties.find((p) => p.id === confirmId)

  return (
    <div>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">{listTitle ?? t('list.myProperties')}</h2>

      <div className="space-y-2.5">
        {properties.map((p) => {
          const agent = agentsMap?.[p.agent_id]
          return (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-xl border border-white/8 bg-[#131313] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#F5F0E8]">
                {p.reference} — {p.title || p.location || t('list.unnamed')}
              </p>
              <p className="mt-0.5 text-xs text-[#9A9080]">
                {p.zone} · €{p.price?.toLocaleString() ?? '—'} · {p.property_type}
                {agent && (
                  <span className="ml-1.5 text-[#8B7CF6]">· {agent.full_name || agent.email}</span>
                )}
              </p>
              {p.review_status === 'submitted' && p.submitted_at && (
                <p className="mt-1 text-[11px] text-[#7A7263]">{t('list.submittedOn', { date: fmtShort(p.submitted_at) })}</p>
              )}
              {p.review_status === 'published' && p.published_to_suprema_at && (
                <p className="mt-1 text-[11px] text-[#2ECC9A]/80">{t('list.publishedOn', { date: fmtShort(p.published_to_suprema_at) })}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge p={p} t={t} />

              <button
                type="button"
                onClick={() => handleEdit(p.id)}
                disabled={isPending}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#F5F0E8] disabled:opacity-50"
                aria-label={t('list.editAria', { ref: p.reference ?? '' })}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="hidden sm:inline">{t('list.edit')}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmId(p.id)}
                disabled={isPending}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                aria-label={t('list.deleteAria', { ref: p.reference ?? '' })}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                <span className="hidden sm:inline">{t('list.delete')}</span>
              </button>
            </div>
          </div>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Bottom sheet de confirmación — mobile first */}
      {confirmProp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => !isPending && setConfirmId(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#131313] px-6 pb-sheet pt-6 shadow-2xl sm:rounded-2xl sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#F5F0E8]">{t('list.deleteConfirmTitle')}</h3>
              <p className="mt-1 text-sm text-[#9A9080]">
                <strong className="text-[#F5F0E8]">{confirmProp.reference}</strong> — {confirmProp.title || confirmProp.location}
              </p>
              <p className="mt-3 text-xs text-[#9A9080]">
                {t('list.deleteConfirmHint')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-[#F5F0E8] hover:bg-white/10 disabled:opacity-50"
              >
                {t('list.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmProp.id)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? t('list.deleting') : t('list.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
