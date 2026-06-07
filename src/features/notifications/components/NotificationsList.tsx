'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { markNotificationRead, markAllRead, type NotificationRow } from '@/actions/notifications'

function fmt(d: string, locale: string): string {
  try {
    const date = new Date(d)
    const bcp = locale === 'es' ? 'es-ES' : locale === 'nl' ? 'nl-NL' : 'en-GB'
    return date.toLocaleDateString(bcp, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function NotificationsList({
  notifications: initial,
  onClose,
  onChange,
}: {
  notifications: NotificationRow[]
  onClose?: () => void
  onChange?: () => void
}) {
  const t = useTranslations('notifications')
  const locale = useLocale()
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>(initial)
  const [filter, setFilter] = useState<'unread' | 'all'>('unread')
  const [, startTransition] = useTransition()

  const unreadCount = items.filter((n) => !n.is_read).length
  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.is_read) : items),
    [items, filter],
  )

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    startTransition(async () => {
      await markNotificationRead(id)
      onChange?.()
    })
  }

  function allRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllRead()
      onChange?.()
    })
  }

  function openContext(n: NotificationRow) {
    if (n.url) {
      router.push(n.url)
      onClose?.()
    }
  }

  return (
    <div>
      {/* Filtro + marcar todas */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(['unread', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                filter === f ? 'bg-[#C9A84C] text-black' : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              {f === 'unread' ? t('filterUnread') : t('filterAll')}
              {f === 'unread' && unreadCount > 0 && <span className="ml-1 opacity-70">{unreadCount}</span>}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={allRead} className="text-[11px] font-semibold text-[#C9A84C] hover:underline">
            {t('markAllRead')}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#7A7263]">{t('empty')}</div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                n.is_read ? 'border-white/[0.05] bg-transparent' : 'border-[#C9A84C]/20 bg-[#C9A84C]/[0.05]'
              }`}
            >
              <button
                onClick={() => openContext(n)}
                className={`min-w-0 flex-1 text-left ${n.url ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#C9A84C]" />}
                  <p className="truncate text-[13px] font-semibold text-[#F5F0E8]">{n.title}</p>
                </div>
                {n.message && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#9A9080]">{n.message}</p>}
                <p className="mt-1 text-[10px] text-[#6E665A]">{fmt(n.created_at, locale)}</p>
              </button>

              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  title={t('markReadAria')}
                  aria-label={t('markReadAria')}
                  className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[#2ECC9A]/30 text-[#2ECC9A] transition hover:bg-[#2ECC9A]/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
