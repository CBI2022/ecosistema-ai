'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setViewAs } from '@/actions/view-as'

// Roles que el admin puede previsualizar + 'admin' (= su propia vista).
const ROLES = ['admin', 'agent', 'secretary', 'photographer', 'dc'] as const
type ViewRole = (typeof ROLES)[number]

const HOME: Record<ViewRole, string> = {
  admin: '/properties',
  agent: '/properties',
  secretary: '/inbox',
  photographer: '/photographer',
  dc: '/settings',
}

export function ViewAsBar({ current }: { current: ViewRole }) {
  const t = useTranslations('viewAs')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function pick(role: ViewRole) {
    if (role === current) return
    startTransition(async () => {
      await setViewAs(role === 'admin' ? null : role)
      router.push(HOME[role])
      router.refresh()
    })
  }

  const previewing = current !== 'admin'

  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-6 ${
        previewing
          ? 'border-[#C9A84C]/30 bg-[#C9A84C]/[0.07]'
          : 'border-white/[0.06] bg-[#0C0B0A]'
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A9080]">
        {t('label')}
      </span>

      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((role) => {
          const active = role === current
          return (
            <button
              key={role}
              onClick={() => pick(role)}
              disabled={isPending}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition disabled:opacity-50 ${
                active
                  ? 'bg-[#C9A84C] text-black'
                  : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              {t(role)}
            </button>
          )
        })}
      </div>

      {previewing && (
        <button
          onClick={() => pick('admin')}
          disabled={isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#C9A84C]/40 px-3 py-1 text-[12px] font-semibold text-[#E8C96A] transition hover:bg-[#C9A84C]/10 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t('backToAdmin')}
        </button>
      )}
    </div>
  )
}
