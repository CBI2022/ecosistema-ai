'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { UserRole } from '@/types/database'

interface NavTab {
  href: string
  label: string
  roles?: UserRole[]
}

interface AppNavProps {
  role: UserRole
  notifCount?: number
}

export function AppNav({ role, notifCount = 0 }: AppNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clickedHref, setClickedHref] = useState<string | null>(null)

  const AGENT_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/kpi', label: t('kpi') },
    { href: '/properties', label: t('properties') },
    { href: '/valuation', label: t('valuation') },
    { href: '/contracts', label: t('contracts') },
    { href: '/invoice', label: t('invoice') },
    { href: '/training', label: t('training') },
    { href: '/competitors', label: t('competitors') },
    { href: '/tasks', label: t('tasks') },
  ]

  const ADMIN_EXTRA: NavTab[] = [
    { href: '/admin', label: t('team'), roles: ['admin', 'secretary'] },
    { href: '/social', label: t('social'), roles: ['admin'] },
  ]

  const SECRETARY_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/admin', label: t('team') },
    { href: '/kpi', label: t('kpi') },
    { href: '/competitors', label: t('competitors') },
    { href: '/training', label: t('training') },
    { href: '/contracts', label: t('contracts') },
    { href: '/tasks', label: t('tasks') },
  ]

  const PHOTOGRAPHER_TABS: NavTab[] = [
    { href: '/photographer', label: t('myShoots') },
    { href: '/photographer/upload', label: t('uploadPhotos') },
    { href: '/tasks', label: t('tasks') },
  ]

  const tabs =
    role === 'photographer'
      ? PHOTOGRAPHER_TABS
      : role === 'admin'
        ? [...AGENT_TABS, ...ADMIN_EXTRA]
        : role === 'secretary'
          ? SECRETARY_TABS
          : AGENT_TABS

  function handleNavClick(e: React.MouseEvent, href: string) {
    if (pathname === href) { e.preventDefault(); return }
    // Llama a startTransition para que React sepa que hay navegación en curso
    // y que muestre loading.tsx inmediatamente
    e.preventDefault()
    setClickedHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      {/* Top progress bar global - visible durante navegación */}
      {isPending && (
        <div className="fixed left-0 top-0 z-[200] h-0.5 w-full overflow-hidden bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
            style={{ animation: 'cbi-progress-bar 1.2s ease-in-out infinite' }}
          />
        </div>
      )}

      <nav className="sticky top-[57px] z-40 flex justify-center gap-0.5 overflow-x-auto border-b border-[#C9A84C]/12 bg-[#0A0A0A]/98 px-6 py-2 backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href)

          // Estado "clicked" inmediato para feedback visual
          const isLoading = isPending && clickedHref === tab.href

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              onClick={(e) => handleNavClick(e, tab.href)}
              className={`relative whitespace-nowrap rounded-md px-4 py-2 text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-[#C9A84C] font-bold tracking-[0.06em] text-black shadow-[0_2px_14px_rgba(201,168,76,0.35)]'
                  : isLoading
                    ? 'bg-[#C9A84C]/30 text-[#F5F0E8]'
                    : 'text-[#9A9080] hover:bg-[#C9A84C]/8 hover:text-[#F5F0E8]'
              }`}
            >
              {isLoading && (
                <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
              )}
              {tab.label}
              {tab.href === '/notifications' && notifCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <style>{`
        @keyframes cbi-progress-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
