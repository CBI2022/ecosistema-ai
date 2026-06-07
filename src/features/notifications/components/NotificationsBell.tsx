'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import { getNotificationsData, type NotificationRow } from '@/actions/notifications'
import { NotificationsList } from './NotificationsList'

interface NotificationsBellProps {
  initialCount: number
  initialNotifications?: NotificationRow[]
}

export function NotificationsBell({ initialCount, initialNotifications = [] }: NotificationsBellProps) {
  const t = useTranslations('notifications')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const count = notifications.length > 0 ? notifications.filter((n) => !n.is_read).length : initialCount

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current?.contains(target)) return
      const el = target as HTMLElement | null
      if (el && typeof el.closest === 'function' && el.closest('[role="dialog"]')) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Refresca en segundo plano (la lista ya se ve al instante con las iniciales).
  async function refresh() {
    const res = await getNotificationsData()
    setNotifications(res.notifications)
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) refresh()
  }

  const badge = count > 0 && (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggle}
        title={t('title')}
        aria-label={t('title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#9A9080] transition active:scale-95 hover:border-[#C9A84C]/40 hover:text-[#F5F0E8] md:h-8 md:w-8"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {badge}
      </button>

      {/* DESKTOP DROPDOWN */}
      {open && (
        <div className="absolute right-0 top-10 z-50 hidden w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#131313] shadow-2xl md:block">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h3 className="text-sm font-bold text-[#F5F0E8]">{t('title')}</h3>
            <button onClick={() => setOpen(false)} className="text-xs text-[#9A9080] hover:text-[#F5F0E8]" aria-label={t('close')}>✕</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <NotificationsList notifications={notifications} onClose={() => setOpen(false)} onChange={refresh} />
          </div>
        </div>
      )}

      {/* MOBILE SHEET */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button aria-label={t('close')} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 top-[8%] flex animate-slide-up flex-col overflow-hidden rounded-t-3xl border-t border-[#C9A84C]/20 bg-[#0F0F0F] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
            <div className="flex shrink-0 justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold text-[#F5F0E8]">🔔 {t('title')}</h3>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#9A9080] transition active:scale-95" aria-label={t('close')}>✕</button>
            </div>
            <div className="pb-safe flex-1 overflow-y-auto px-4 pb-4">
              <NotificationsList notifications={notifications} onClose={() => setOpen(false)} onChange={refresh} />
            </div>
          </div>
          <style>{`
            @keyframes cbi-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-slide-up { animation: cbi-slide-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1); }
          `}</style>
        </div>,
        document.body,
      )}
    </div>
  )
}
