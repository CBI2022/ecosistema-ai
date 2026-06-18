'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveUser, rejectUser } from '@/actions/auth'

interface PendingUser {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
}

interface PendingApprovalsProps {
  pendingUsers: PendingUser[]
}

const ROLE_COLORS: Record<string, string> = {
  agent: '#C9A84C',
  secretary: '#8B7CF6',
  photographer: '#06B6D4',
  admin: '#2ECC9A',
}

export function PendingApprovals({ pendingUsers: initial }: PendingApprovalsProps) {
  const router = useRouter()
  const [pendingUsers, setPendingUsers] = useState(initial)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleApprove(user: PendingUser) {
    setError(null)
    setOkMessage(null)
    setProcessingId(user.id)
    startTransition(async () => {
      const res = await approveUser(user.id)
      setProcessingId(null)
      // Solo quitamos al usuario de la lista si el servidor confirmó el éxito.
      if (res?.error) {
        setError(`No se pudo dar acceso a ${user.full_name || user.email}: ${res.error}`)
        return
      }
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id))
      setOkMessage(`✅ ${user.full_name || user.email} ya tiene acceso.`)
      router.refresh()
    })
  }

  function handleReject(user: PendingUser) {
    setError(null)
    setOkMessage(null)
    setProcessingId(user.id)
    startTransition(async () => {
      const res = await rejectUser(user.id, rejectReason || undefined)
      setProcessingId(null)
      if (res?.error) {
        setError(`No se pudo rechazar a ${user.full_name || user.email}: ${res.error}`)
        return
      }
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id))
      setRejectingId(null)
      setRejectReason('')
      setOkMessage(`${user.full_name || user.email} fue rechazado.`)
      router.refresh()
    })
  }

  if (pendingUsers.length === 0 && !okMessage) return null

  return (
    <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#131313] p-5" style={{ borderTop: '2px solid #C9A84C' }}>
      <div className="mb-4 flex items-center gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          👥 Solicitudes de acceso
        </p>
        {pendingUsers.length > 0 && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            {pendingUsers.length}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {okMessage && (
        <div className="mb-3 rounded-xl border border-[#2ECC9A]/30 bg-[#2ECC9A]/10 px-4 py-3 text-sm text-[#2ECC9A]">
          {okMessage}
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <p className="text-sm text-[#9A9080]">No hay solicitudes pendientes.</p>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-white/8 bg-[#1C1C1C] p-4"
              style={{ borderLeft: '3px solid #C9A84C' }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/15 text-sm font-bold text-[#C9A84C]">
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#F5F0E8]">{u.full_name || 'Sin nombre'}</p>
                      <p className="truncate text-xs text-[#9A9080]">{u.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: `${ROLE_COLORS[u.role] || '#9A9080'}20`, color: ROLE_COLORS[u.role] || '#9A9080' }}
                    >
                      {u.role}
                    </span>
                    <span className="text-[11px] text-[#9A9080]">
                      {new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    onClick={() => handleApprove(u)}
                    disabled={isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-[#2ECC9A]/15 px-3 text-sm font-bold text-[#2ECC9A] transition active:scale-95 hover:bg-[#2ECC9A]/25 disabled:opacity-50 sm:h-auto sm:flex-none sm:rounded-lg sm:py-1.5 sm:text-xs"
                  >
                    {processingId === u.id ? 'Dando acceso…' : '✓ Dar acceso'}
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === u.id ? null : u.id)}
                    disabled={isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-red-500/10 px-3 text-sm font-bold text-red-400 transition active:scale-95 hover:bg-red-500/20 disabled:opacity-50 sm:h-auto sm:flex-none sm:rounded-lg sm:py-1.5 sm:text-xs"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>

              {rejectingId === u.id && (
                <div className="mt-4 border-t border-white/8 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9A9080]">Motivo del rechazo (opcional)</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-3 text-sm text-[#F5F0E8] outline-none focus:border-red-500/40 placeholder-[#9A9080] sm:py-2"
                      placeholder="p. ej. No pertenece al equipo CBI"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(u)}
                        disabled={isPending}
                        className="h-11 flex-1 rounded-xl bg-red-500 px-4 text-sm font-bold text-white transition active:scale-95 hover:bg-red-600 disabled:opacity-50 sm:h-auto sm:flex-none sm:rounded-lg sm:py-2 sm:text-xs"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="h-11 flex-1 rounded-xl border border-white/10 px-3 text-sm text-[#9A9080] active:scale-95 hover:text-[#F5F0E8] sm:h-auto sm:flex-none sm:rounded-lg sm:py-2 sm:text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
