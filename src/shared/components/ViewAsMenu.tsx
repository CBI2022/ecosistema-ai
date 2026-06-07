'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setViewAs } from '@/actions/view-as'

const ROLES = ['admin', 'agent', 'secretary', 'photographer', 'dc'] as const
type ViewRole = (typeof ROLES)[number]

const HOME: Record<ViewRole, string> = {
  admin: '/properties',
  agent: '/properties',
  secretary: '/inbox',
  photographer: '/photographer',
  dc: '/dc',
}

// Desplegable minimalista en el top bar (solo admin). Permite previsualizar la
// app con la vista de otro rol. No cambia permisos ni datos.
export function ViewAsMenu({ current }: { current: ViewRole }) {
  const t = useTranslations('viewAs')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const previewing = current !== 'admin'

  function pick(role: ViewRole) {
    setOpen(false)
    if (role === current) return
    startTransition(async () => {
      await setViewAs(role === 'admin' ? null : role)
      router.push(HOME[role])
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          previewing
            ? 'border-[#C9A84C]/50 bg-[#C9A84C]/10 text-[#E8C96A]'
            : 'border-white/10 bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]'
        }`}
        aria-label={t('label')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="hidden sm:inline">{t(current)}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[190px] overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] p-1.5 shadow-2xl">
          <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A7263]">{t('label')}</p>
          {ROLES.map((role) => {
            const active = role === current
            return (
              <button
                key={role}
                onClick={() => pick(role)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                  active ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'text-[#D0C8B8] hover:bg-white/5'
                }`}
              >
                {t(role)}
                {active && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
