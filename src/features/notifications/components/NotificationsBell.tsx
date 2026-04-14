'use client'

import { useState, useEffect, useRef } from 'react'
import { getNotificationsData } from '@/actions/notifications'
import { NotificationsPanel } from './NotificationsPanel'

interface NotificationsBellProps {
  initialCount: number
}

export function NotificationsBell({ initialCount }: NotificationsBellProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [data, setData] = useState<{
    notifications: Parameters<typeof NotificationsPanel>[0]['notifications']
    pendingUsers: Parameters<typeof NotificationsPanel>[0]['pendingUsers']
    isAdmin: boolean
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function refresh() {
    setLoading(true)
    const res = await getNotificationsData()
    setData(res)
    const unread = res.notifications.filter((n) => !n.is_read).length + res.pendingUsers.length
    setCount(unread)
    setLoading(false)
  }

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) await refresh() // siempre re-fetch al abrir
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggle}
        title="Notificaciones"
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#131313] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h3 className="text-sm font-bold text-[#F5F0E8]">Notificaciones</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[#9A9080] hover:text-[#F5F0E8]"
            >
              ✕
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {loading && (
              <div className="py-10 text-center text-xs text-[#9A9080]">Cargando...</div>
            )}
            {!loading && data && (
              <NotificationsPanel
                pendingUsers={data.pendingUsers}
                notifications={data.notifications}
                compact
                onChange={refresh}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
