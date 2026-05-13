'use client'

import { useState, useTransition } from 'react'
import {
  syncFubFromZero,
  subscribeFubWebhooks,
  unsubscribeFubWebhooks,
  linkProfilesToFub,
  updateFubUserMapping,
} from '@/actions/fub'

interface Props {
  health: {
    counts?: Record<string, number>
    last_webhook?: {
      event_type: string | null
      received_at: string | null
      processed_at: string | null
      status: string | null
    } | null
  } | null
  webhookLog: Array<{
    id: string
    event_id: string | null
    event_type: string
    resource_ids: number[] | null
    received_at: string | null
    processed_at: string | null
    status: string
    error_message: string | null
  }>
  mappings: Array<{
    fub_user_id: number
    cbi_user_id: string | null
    fub_email: string
    fub_role: string
    is_admin: boolean
    active: boolean
  }>
  profiles: Array<{
    id: string
    email: string | null
    full_name: string | null
  }>
}

export function FubAdminPanel({ health, webhookLog, mappings, profiles }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const run = (label: string, fn: () => Promise<unknown>) => {
    startTransition(async () => {
      setMessage(`${label}…`)
      try {
        const result = await fn()
        setMessage(`✅ ${label} OK · ${JSON.stringify(result).slice(0, 200)}`)
      } catch (err) {
        setMessage(`❌ ${label} → ${(err as Error).message}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Health */}
      <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F0E8]">Health</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {health?.counts &&
            Object.entries(health.counts).map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-white/8 bg-white/4 p-3 transition hover:border-[#C9A84C]/30"
              >
                <div className="truncate text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="mt-1 text-xl font-bold text-[#F5F0E8]">{v.toLocaleString()}</div>
              </div>
            ))}
        </div>
        {health?.last_webhook && (
          <div className="mt-3 rounded-lg border border-[#7FB069]/20 bg-[#7FB069]/8 p-3 text-xs text-[#D0C8B8]">
            <span className="font-medium text-[#F5F0E8]">Último webhook:</span>{' '}
            {health.last_webhook.event_type}{' '}
            <span className="text-[#9A9080]">
              · {health.last_webhook.received_at ? new Date(health.last_webhook.received_at).toLocaleString('es-ES') : '—'}
            </span>{' '}
            ·{' '}
            <span
              className={`font-medium ${
                health.last_webhook.status === 'processed' ? 'text-[#7FB069]' : 'text-[#D4A056]'
              }`}
            >
              {health.last_webhook.status}
            </span>
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F0E8]">Acciones</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryAction onClick={() => run('Resync 90d', () => syncFubFromZero({ sinceDays: 90 }))} disabled={isPending}>
            ⚡ Resync forzado (90d)
          </PrimaryAction>
          <SecondaryAction onClick={() => run('Resync 365d', () => syncFubFromZero({ sinceDays: 365 }))} disabled={isPending}>
            Resync 12 meses
          </SecondaryAction>
          <SuccessAction onClick={() => run('Subscribe webhooks', () => subscribeFubWebhooks())} disabled={isPending}>
            ✅ Subscribe webhooks
          </SuccessAction>
          <SecondaryAction onClick={() => run('Unsubscribe webhooks', () => unsubscribeFubWebhooks())} disabled={isPending}>
            Unsubscribe webhooks
          </SecondaryAction>
          <GoldAction onClick={() => run('Link profiles', () => linkProfilesToFub())} disabled={isPending}>
            🔗 Link profiles ↔ FUB
          </GoldAction>
        </div>
        {message && (
          <div className="mt-3 rounded-md border border-white/8 bg-white/4 p-2 font-mono text-[11px] text-[#D0C8B8] break-all">
            {message}
          </div>
        )}
      </section>

      {/* User mapping */}
      <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F0E8]">User Mapping</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-white/8">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">
                <th className="pb-2 pr-3 font-medium">FUB ID</th>
                <th className="pb-2 pr-3 font-medium">Email FUB</th>
                <th className="pb-2 pr-3 font-medium">CBI Profile</th>
                <th className="pb-2 pr-3 font-medium">Rol FUB</th>
                <th className="pb-2 pr-3 font-medium">Admin?</th>
                <th className="pb-2 pr-3 font-medium">Activo</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => {
                const profile = profiles.find((p) => p.id === m.cbi_user_id)
                return (
                  <tr key={m.fub_user_id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[#9A9080]">{m.fub_user_id}</td>
                    <td className="truncate py-2 pr-3 text-[#D0C8B8]">{m.fub_email}</td>
                    <td className="py-2 pr-3">
                      {profile ? (
                        <span className="text-[#7FB069]">{profile.full_name || profile.email}</span>
                      ) : (
                        <span className="text-[#D4A056]">— sin link</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-[#D0C8B8]">{m.fub_role}</td>
                    <td className="py-2 pr-3">
                      <ToggleAdmin fubUserId={m.fub_user_id} value={m.is_admin} />
                    </td>
                    <td className="py-2 pr-3">
                      <ToggleActive fubUserId={m.fub_user_id} value={m.active} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Webhook log */}
      <section className="rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#F5F0E8]">
          Webhook Log <span className="text-[10px] font-normal text-[#9A9080]">últimos {webhookLog.length}</span>
        </h3>
        {webhookLog.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#9A9080]">Sin webhooks aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-white/8">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#9A9080]">
                  <th className="pb-2 pr-3 font-medium">Evento</th>
                  <th className="pb-2 pr-3 font-medium">IDs</th>
                  <th className="pb-2 pr-3 font-medium">Recibido</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {webhookLog.map((w) => (
                  <tr key={w.id} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-[#D0C8B8]">{w.event_type}</td>
                    <td className="py-1.5 pr-3 font-mono text-[#9A9080]">
                      {(w.resource_ids || []).slice(0, 3).join(',')}
                      {(w.resource_ids || []).length > 3 ? '…' : ''}
                    </td>
                    <td className="py-1.5 pr-3 text-[#9A9080]">
                      {w.received_at ? new Date(w.received_at).toLocaleString('es-ES') : '—'}
                    </td>
                    <td className="py-1.5 pr-3">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="max-w-xs truncate py-1.5 pr-3 text-[#E8907A]">
                      {w.error_message || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function PrimaryAction({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-[#C9A84C] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#E8C868] disabled:opacity-50 shadow-[0_2px_14px_rgba(201,168,76,0.35)]"
    >
      {children}
    </button>
  )
}
function SecondaryAction({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold text-[#D0C8B8] transition hover:border-[#C9A84C]/30 hover:bg-white/10 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
function SuccessAction({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-[#7FB069]/40 bg-[#7FB069]/15 px-3 py-2 text-xs font-semibold text-[#7FB069] transition hover:bg-[#7FB069]/25 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
function GoldAction({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/15 px-3 py-2 text-xs font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/25 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'processed'
      ? 'bg-[#7FB069]/20 text-[#7FB069]'
      : status === 'error'
        ? 'bg-[#C84B45]/20 text-[#E8907A]'
        : status === 'pending'
          ? 'bg-[#D4A056]/20 text-[#D4A056]'
          : 'bg-white/8 text-[#9A9080]'
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{status}</span>
}

function ToggleAdmin({ fubUserId, value }: { fubUserId: number; value: boolean }) {
  const [v, setV] = useState(value)
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !v
          setV(next)
          const r = await updateFubUserMapping({ fub_user_id: fubUserId, is_admin: next })
          if ('error' in r) setV(value)
        })
      }
      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
        v
          ? 'bg-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/30'
          : 'bg-white/6 text-[#9A9080] hover:bg-white/10'
      }`}
    >
      {v ? 'admin' : 'no'}
    </button>
  )
}

function ToggleActive({ fubUserId, value }: { fubUserId: number; value: boolean }) {
  const [v, setV] = useState(value)
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !v
          setV(next)
          const r = await updateFubUserMapping({ fub_user_id: fubUserId, active: next })
          if ('error' in r) setV(value)
        })
      }
      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
        v
          ? 'bg-[#7FB069]/20 text-[#7FB069] hover:bg-[#7FB069]/30'
          : 'bg-white/6 text-[#9A9080] hover:bg-white/10'
      }`}
    >
      {v ? 'on' : 'off'}
    </button>
  )
}
