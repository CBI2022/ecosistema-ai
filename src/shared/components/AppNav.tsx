'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
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
  | 'shield'
  | 'brain'

interface NavTab {
  href: string
  label: string
  icon: IconName
}

interface NavGroup {
  type: 'group'
  key: string
  label: string
  icon: IconName
  items: NavTab[]
}

type NavEntry = NavTab | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).type === 'group'
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
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'brain':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
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
  const [adminOpen, setAdminOpen] = useState(false)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const adminRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cerrar dropdown Admin al hacer click fuera (desktop). Sin esto, sin hover
  // el dropdown se quedaría abierto si el usuario decide no seleccionar nada.
  useEffect(() => {
    if (!adminOpen) return
    function onPointerDown(e: PointerEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAdminOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [adminOpen])

  // Subsecciones DENTRO del dropdown Admin▾ (solo admin las ve)
  const ADMIN_SUBITEMS: NavTab[] = [
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/admin/sooprema', label: 'Sooprema', icon: 'upload' },
    { href: '/social', label: t('social'), icon: 'share' },
    { href: '/admin/knowledge', label: t('knowledge'), icon: 'brain' },
  ]

  const AGENT_TABS: NavEntry[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/valuation', label: t('valuation'), icon: 'file' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
    { href: '/invoice', label: t('invoice'), icon: 'receipt' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
  ]

  const ADMIN_TABS: NavEntry[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/valuation', label: t('valuation'), icon: 'file' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
    { href: '/invoice', label: t('invoice'), icon: 'receipt' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
    { type: 'group', key: 'admin-group', label: t('admin'), icon: 'shield', items: ADMIN_SUBITEMS },
  ]

  const SECRETARY_TABS: NavEntry[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/properties', label: t('properties'), icon: 'building' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/competitors', label: t('competitors'), icon: 'target' },
    { href: '/training', label: t('training'), icon: 'book' },
    { href: '/contracts', label: t('contracts'), icon: 'signature' },
  ]

  const PHOTOGRAPHER_TABS: NavEntry[] = [
    { href: '/photographer', label: t('myShoots'), icon: 'camera' },
    { href: '/photographer/upload', label: t('uploadPhotos'), icon: 'cameraPlus' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
  ]

  const DC_TABS: NavEntry[] = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home' },
    { href: '/admin', label: t('team'), icon: 'users' },
    { href: '/kpi', label: t('kpi'), icon: 'chart' },
    { href: '/tasks', label: t('tasks'), icon: 'check' },
    { href: '/training', label: t('training'), icon: 'book' },
  ]

  const tabs: NavEntry[] =
    role === 'photographer'
      ? PHOTOGRAPHER_TABS
      : role === 'admin'
        ? ADMIN_TABS
        : role === 'secretary'
          ? SECRETARY_TABS
          : role === 'dc'
            ? DC_TABS
            : AGENT_TABS

  // ─── Lógica del BOTTOM NAV MÓVIL ───
  // Separamos el grupo (Admin) de los tabs sueltos. El grupo, si existe,
  // ocupa siempre uno de los 4 slots fijos del bottom nav (slot 4) — no se
  // mete dentro del "Más" porque queremos que el admin vea Admin a un toque.
  const mobileGroup = tabs.find(isGroup) as NavGroup | undefined
  const mobileFlatTabs = tabs.filter((e): e is NavTab => !isGroup(e))

  // Si hay grupo: 3 primaryTabs + grupo + resto en overflow
  // Si no hay grupo: 4 primaryTabs + resto en overflow
  const primaryTabs = mobileGroup ? mobileFlatTabs.slice(0, 3) : mobileFlatTabs.slice(0, 4)
  const overflowTabs = mobileGroup ? mobileFlatTabs.slice(3) : mobileFlatTabs.slice(4)
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
    if (!moreOpen && !groupSheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [moreOpen, groupSheetOpen])

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
        {tabs.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry.items.some((it) => isActive(it.href))
            return (
              <div key={entry.key} ref={adminRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAdminOpen((v) => !v)}
                  className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-[11px] font-medium transition-all ${
                    groupActive || adminOpen
                      ? 'bg-[#C9A84C] font-bold tracking-[0.06em] text-black shadow-[0_2px_14px_rgba(201,168,76,0.35)]'
                      : 'text-[#9A9080] hover:bg-[#C9A84C]/8 hover:text-[#F5F0E8]'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={adminOpen}
                >
                  <Icon name={entry.icon} className="h-3.5 w-3.5" />
                  {entry.label}
                  <svg
                    className={`h-3 w-3 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {adminOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-[#C9A84C]/30 bg-[#0A0A0A] p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.85)] ring-1 ring-black/40"
                  >
                    {entry.items.map((sub) => {
                      const subActive = isActive(sub.href)
                      const loading = isPending && clickedHref === sub.href
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          prefetch
                          onClick={(e) => {
                            handleNavClick(e, sub.href)
                            setAdminOpen(false)
                          }}
                          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                            subActive
                              ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                              : loading
                                ? 'bg-[#C9A84C]/10 text-[#F5F0E8]'
                                : 'text-[#D0C8B8] hover:bg-white/5 hover:text-[#F5F0E8]'
                          }`}
                          role="menuitem"
                        >
                          {loading ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
                          ) : (
                            <Icon name={sub.icon} className="h-4 w-4" />
                          )}
                          <span className="flex-1">{sub.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const tab = entry
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

          {mobileGroup && (() => {
            const groupActive = mobileGroup.items.some((it) => isActive(it.href))
            return (
              <button
                onClick={() => setGroupSheetOpen(true)}
                className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition active:scale-95"
                aria-label={mobileGroup.label}
              >
                <div
                  className={`flex h-7 items-center justify-center transition ${
                    groupActive ? 'text-[#C9A84C]' : 'text-[#9A9080] group-active:text-[#F5F0E8]'
                  }`}
                >
                  <Icon name={mobileGroup.icon} className="h-6 w-6" />
                </div>
                <span
                  className={`text-[10px] leading-none transition ${
                    groupActive ? 'font-semibold text-[#C9A84C]' : 'font-medium text-[#9A9080]'
                  }`}
                >
                  {mobileGroup.label}
                </span>
              </button>
            )
          })()}

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

      {/* ───────── MOBILE: sheet del grupo (Admin) ───────── */}
      {groupSheetOpen && mobileGroup && mounted && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar"
            onClick={() => setGroupSheetOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="pb-safe absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl border-t border-[#C9A84C]/30 bg-[#0A0A0A] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-[#F5F0E8]">
                <Icon name={mobileGroup.icon} className="h-5 w-5 text-[#C9A84C]" />
                {mobileGroup.label}
              </h3>
              <button
                onClick={() => setGroupSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#9A9080] transition active:scale-95"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 pt-2">
              {mobileGroup.items.map((sub) => {
                const subActive = isActive(sub.href)
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    prefetch
                    onClick={() => setGroupSheetOpen(false)}
                    className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition active:scale-95 ${
                      subActive
                        ? 'border-[#C9A84C]/60 bg-[#C9A84C]/10 text-[#C9A84C]'
                        : 'border-white/8 bg-white/4 text-[#F5F0E8]'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        subActive ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-white/6 text-[#F5F0E8]'
                      }`}
                    >
                      <Icon name={sub.icon} className="h-5 w-5" />
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight">
                      {sub.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
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
