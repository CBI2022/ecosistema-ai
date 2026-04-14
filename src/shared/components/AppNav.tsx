'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/types/database'

interface NavTab {
  href: string
  label: string
  roles?: UserRole[]
}

const AGENT_TABS: NavTab[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/kpi', label: 'KPI' },
  { href: '/properties', label: 'Properties' },
  { href: '/valuation', label: 'Valuation' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/invoice', label: 'Invoice' },
  { href: '/training', label: 'Training' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/tasks', label: 'Tasks' },
]

const ADMIN_EXTRA: NavTab[] = [
  { href: '/admin', label: 'Team', roles: ['admin', 'secretary'] },
  { href: '/social', label: 'Social', roles: ['admin'] },
]

const SECRETARY_TABS: NavTab[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Team' },
  { href: '/kpi', label: 'KPI' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/training', label: 'Training' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/tasks', label: 'Tasks' },
]

const PHOTOGRAPHER_TABS: NavTab[] = [
  { href: '/photographer', label: 'My Shoots' },
  { href: '/photographer/upload', label: 'Upload Photos' },
  { href: '/tasks', label: 'Tasks' },
]

interface AppNavProps {
  role: UserRole
  notifCount?: number
}

export function AppNav({ role, notifCount = 0 }: AppNavProps) {
  const pathname = usePathname()

  const tabs =
    role === 'photographer'
      ? PHOTOGRAPHER_TABS
      : role === 'admin'
        ? [...AGENT_TABS, ...ADMIN_EXTRA]
        : role === 'secretary'
          ? SECRETARY_TABS
          : AGENT_TABS

  return (
    <nav className="sticky top-[57px] z-40 flex justify-center gap-0.5 overflow-x-auto border-b border-[#C9A84C]/12 bg-[#0A0A0A]/98 px-6 py-2 backdrop-blur-xl">
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative whitespace-nowrap rounded-md px-4 py-2 text-[11px] font-medium transition-all ${
              isActive
                ? 'bg-[#C9A84C] font-bold tracking-[0.06em] text-black shadow-[0_2px_14px_rgba(201,168,76,0.35)]'
                : 'text-[#9A9080] hover:bg-[#C9A84C]/8 hover:text-[#F5F0E8]'
            }`}
          >
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
  )
}
