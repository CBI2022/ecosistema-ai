'use client'

import { useState, useTransition } from 'react'
import { approveUser, rejectUser } from '@/actions/auth'
import { markNotificationRead, markAllRead } from '@/actions/notifications'

interface PendingUser {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string | null
  target_user_id: string | null
  is_read: boolean
  created_at: string
}

interface NotificationsPanelProps {
  pendingUsers: PendingUser[]
  notifications: NotificationItem[]
  compact?: boolean
  onChange?: () => void
}

const ROLE_COLORS: Record<string, string> = {
  agent: '#C9A84C',
  secretary: '#8B7CF6',
  photographer: '#06B6D4',
  admin: '#2ECC9A',
}

export function NotificationsPanel({ pendingUsers: initialPending, notifications: initialNotifs, compact = false, onChange }: NotificationsPanelProps) {
  const [pendingUsers, setPendingUsers] = useState(initialPending)
  const [notifications, setNotifications] = useState(initialNotifs)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'registrations' | 'activity'>('registrations')

  const unreadCount = notifications.filter((n) => !n.is_read).length

  function handleApprove(userId: string) {
    startTransition(async () => {
      await approveUser(userId)
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
      onChange?.()
    })
  }

  function handleReject(userId: string) {
    if (!rejectReason.trim()) return
    startTransition(async () => {
      await rejectUser(userId, rejectReason)
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
      setRejectingId(null)
      setRejectReason('')
      onChange?.()
    })
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const res = await markNotificationRead(id)
      if (!res?.error) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
        onChange?.()
      }
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const res = await markAllRead()
      if (!res?.error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        onChange?.()
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${activeTab === 'registrations' ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
        >
          👥 New Registrations
          {pendingUsers.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === 'registrations' ? 'bg-black/20' : 'bg-red-500/20 text-red-400'}`}>
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${activeTab === 'activity' ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
        >
          🔔 Activity
          {unreadCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === 'activity' ? 'bg-black/20' : 'bg-red-500/20 text-red-400'}`}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Registrations tab */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
              <div className="mb-3 text-4xl opacity-30">✅</div>
              <p className="text-sm font-semibold text-[#9A9080]">No pending registrations</p>
              <p className="mt-1 text-xs text-[#9A9080]/60">All accounts are reviewed</p>
            </div>
          ) : (
            pendingUsers.map((u) => (
              <div key={u.id} className="rounded-2xl border border-[#C9A84C]/15 bg-[#131313] p-5" style={{ borderLeft: '3px solid #C9A84C' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C]/15 text-xs font-bold text-[#C9A84C]">
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#F5F0E8]">{u.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-[#9A9080]">{u.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: `${ROLE_COLORS[u.role] || '#9A9080'}20`, color: ROLE_COLORS[u.role] || '#9A9080' }}
                      >
                        {u.role}
                      </span>
                      <span className="text-[10px] text-[#9A9080]">
                        Registered {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleApprove(u.id)}
                      disabled={isPending}
                      className="rounded-lg bg-[#2ECC9A]/15 px-3 py-1.5 text-xs font-bold text-[#2ECC9A] transition hover:bg-[#2ECC9A]/25 disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === u.id ? null : u.id)}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>

                {rejectingId === u.id && (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9A9080]">Rejection reason (optional)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-red-500/40 placeholder-[#9A9080]"
                        placeholder="e.g. Not a CBI team member"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <button
                        onClick={() => handleReject(u.id)}
                        disabled={isPending}
                        className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="ml-auto block rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
            >
              Mark all as read
            </button>
          )}
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
              <div className="mb-3 text-4xl opacity-30">🔔</div>
              <p className="text-sm font-semibold text-[#9A9080]">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-2xl border p-4 transition ${notif.is_read ? 'border-white/8 bg-[#131313]' : 'border-[#C9A84C]/20 bg-[#C9A84C]/5'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className={`font-semibold ${notif.is_read ? 'text-[#9A9080]' : 'text-[#F5F0E8]'}`}>{notif.title}</p>
                    {notif.message && (
                      <p className="mt-1 text-sm text-[#9A9080]">{notif.message}</p>
                    )}
                    <p className="mt-2 text-[10px] text-[#9A9080]/60">
                      {new Date(notif.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-[#9A9080] hover:text-[#F5F0E8]"
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
