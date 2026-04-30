'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import type { UserRole } from '@/types/database'

type IconName =
  | 'home'
  | 'chart'
  | 'building'
  | 'check'
  | 'file'
  | 'signature'
  | 'receipt'
  | 'book'
  | 'target'
  | 'upload'
  | 'users'
  | 'share'
  | 'camera'
  | 'cameraPlus'
  | 'more'

interface NavTab {
  href: string
  label: string
  icon: IconName
}

interface AppNavProps {
  role: UserRole
  notifCount?: number
}

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 4 4 5-5" />
        </svg>
      )
    case 'building':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'file':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" x2="16" y1="13" y2="13" />
          <line x1="8" x2="16" y1="17" y2="17" />
        </svg>
      )
    case 'signature':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M20 19.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5S17.7 18 18.5 18s1.5.7 1.5 1.5z" />
          <path d="M3 17c3 0 5-2 5-5V5a2 2 0 1 1 4 0v7c0 3 2 5 5 5" />
          <path d="M3 21h18" />
        </svg>
      )
    case 'receipt':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M8 7h8M8 12h8M8 17h5" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      )
    case 'target':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'share':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
      )
    case 'camera':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    case 'cameraPlus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M14.5 4h-5L7 7H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1" />
          <path d="M19 5v4M17 7h4" />
          <circle cx="12" cy="14" r="3" />
        </svg>
      )
    case 'more':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      )
  }
}

export function AppNav({ role }: AppNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clickedHref, setClickedHref] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const AGENT_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/valuation', label: t('valuation'), icon: 'file' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
    { href: '/invoice', label: t('invoice'), icon: 'receipt' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
    { href: '/suprema', label: 'Sooprema', icon: 'upload' },
  ]

  const ADMIN_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/valuation', label: t('valuation'), icon: 'file' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
    { href: '/invoice', label: t('invoice'), icon: 'receipt' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
    { href: '/suprema', label: 'Sooprema', icon: 'upload' },
    { href: '/social', label: t('social'), icon: 'share' },
  ]

  const SECRETARY_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/suprema', label: 'Sooprema', icon: 'upload' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
  ]

  const PHOTOGRAPHER_TABS: NavTab[] = [
    { href: '/photographer', label: t('myShoots'), icon: 'camera' },
    { href: '/photographer/upload', label: t('uploadPhotos'), icon: 'cameraPlus' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
  ]

  const DC_TABS: NavTab[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/training', label: t('training'), icon: 'book' },
  ]

  const tabs =
    role === 'photographer'
      ? PHOTOGRAPHER_TABS
      : role === 'admin'
        ? ADMIN_TABS
        : role === 'secretary'
          ? SECRETARY_TABS
          : role === 'dc'
            ? DC_TABS
            : AGENT_TABS

  // Bottom nav mobile: 4 primeras + "Más" si hay más de 4
  const primaryTabs = tabs.slice(0, 4)
  const overflowTabs = tabs.slice(4)
  const hasOverflow = overflowTabs.length > 0

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/photographer') return pathname === '/photographer'
    return pathname.startsWith(href)
  }

  const isOverflowActive = overflowTabs.some((t) => isActive(t.href))

  function handleNavClick(e: React.MouseEvent, href: string) {
    if (pathname === href) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    setClickedHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Lock scroll when sheet open
  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [moreOpen])

  return (
    <>
      {/* Top progress bar */}
      {isPending && (
        <div className="fixed left-0 top-0 z-[200] h-0.5 w-full overflow-hidden bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
            style={{ animation: 'cbi-progress-bar 1.2s ease-in-out infinite' }}
          />
        </div>
      )}

      {/* ───────── DESKTOP: top tab bar ───────── */}
      <nav className="sticky top-[73px] z-40 hidden items-center justify-center gap-0.5 border-b border-[#C9A84C]/12 bg-[#0A0A0A]/98 px-6 py-2 backdrop-blur-xl md:flex">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          const loading = isPending && clickedHref === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              onClick={(e) => handleNavClick(e, tab.href)}
              className={`relative whitespace-nowrap rounded-md px-4 py-2 text-[11px] font-medium transition-all ${
                active
                  ? 'bg-[#C9A84C] font-bold tracking-[0.06em] text-black shadow-[0_2px_14px_rgba(201,168,76,0.35)]'
                  : loading
                    ? 'bg-[#C9A84C]/30 text-[#F5F0E8]'
                    : 'text-[#9A9080] hover:bg-[#C9A84C]/8 hover:text-[#F5F0E8]'
              }`}
            >
              {loading && (
                <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
              )}
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {/* ───────── MOBILE: bottom tab bar ───────── */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#C9A84C]/15 bg-[#0A0A0A]/96 backdrop-blur-xl md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.href)
            const loading = isPending && clickedHref === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                onClick={(e) => handleNavClick(e, tab.href)}
                className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition active:scale-95"
              >
                <div
                  className={`flex h-7 items-center justify-center transition ${
                    active
                      ? 'text-[#C9A84C]'
                      : loading
                        ? 'text-[#F5F0E8]'
                        : 'text-[#9A9080] group-active:text-[#F5F0E8]'
                  }`}
                >
                  {loading ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
                  ) : (
                    <Icon name={tab.icon} className="h-6 w-6" />
                  )}
                </div>
                <span
                  className={`max-w-full truncate text-[10px] leading-none transition ${
                    active
                      ? 'font-semibold text-[#C9A84C]'
                      : 'font-medium text-[#9A9080]'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {hasOverflow && (
            <button
              onClick={() => setMoreOpen(true)}
              className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition active:scale-95"
              aria-label="Más opciones"
            >
              <div
                className={`flex h-7 items-center justify-center transition ${
                  isOverflowActive
                    ? 'text-[#C9A84C]'
                    : 'text-[#9A9080] group-active:text-[#F5F0E8]'
                }`}
              >
                <Icon name="more" className="h-6 w-6" />
              </div>
              <span
                className={`text-[10px] leading-none transition ${
                  isOverflowActive
                    ? 'font-semibold text-[#C9A84C]'
                    : 'font-medium text-[#9A9080]'
                }`}
              >
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* ───────── MOBILE: overflow sheet — portal al body para escapar
           del containing block del bottom-nav (backdrop-filter) ───────── */}
      {moreOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="pb-safe absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl border-t border-[#C9A84C]/20 bg-[#0F0F0F] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold text-[#F5F0E8]">Más opciones</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#9A9080] transition active:scale-95"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 pt-2">
              {overflowTabs.map((tab) => {
                const active = isActive(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    prefetch
                    onClick={() => {
                      setMoreOpen(false)
                    }}
                    className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition active:scale-95 ${
                      active
                        ? 'border-[#C9A84C]/60 bg-[#C9A84C]/10 text-[#C9A84C]'
                        : 'border-white/8 bg-white/4 text-[#F5F0E8]'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        active ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-white/6 text-[#F5F0E8]'
                      }`}
                    >
                      <Icon name={tab.icon} className="h-5 w-5" />
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight">
                      {tab.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
          <style>{`
            @keyframes cbi-slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: cbi-slide-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
            }
          `}</style>
        </div>,
        document.body,
      )}

      <style>{`
        @keyframes cbi-progress-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
