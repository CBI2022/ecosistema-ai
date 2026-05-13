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
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Health</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {health?.counts &&
            Object.entries(health.counts).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-neutral-100 bg-neutral-50/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 truncate">{k.replace(/_/g, ' ')}</div>
                <div className="mt-1 text-xl font-bold text-neutral-900">{v.toLocaleString()}</div>
              </div>
            ))}
        </div>
        {health?.last_webhook && (
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-xs text-neutral-700">
            <span className="font-medium">Último webhook:</span> {health.last_webhook.event_type}{' '}
            <span className="text-neutral-500">
              · {health.last_webhook.received_at ? new Date(health.last_webhook.received_at).toLocaleString('es-ES') : '—'}
            </span>{' '}
            ·{' '}
            <span
              className={`font-medium ${
                health.last_webhook.status === 'processed' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {health.last_webhook.status}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Acciones</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('Resync 90d', () => syncFubFromZero({ sinceDays: 90 }))}
            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            ⚡ Resync forzado (90d)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('Resync 365d', () => syncFubFromZero({ sinceDays: 365 }))}
            className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Resync 12 meses
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('Subscribe webhooks', () => subscribeFubWebhooks())}
            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            ✅ Subscribe webhooks
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('Unsubscribe webhooks', () => unsubscribeFubWebhooks())}
            className="rounded-md bg-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 disabled:opacity-50"
          >
            Unsubscribe webhooks
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run('Link profiles', () => linkProfilesToFub())}
            className="rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            🔗 Link profiles ↔ FUB
          </button>
        </div>
        {message && (
          <div className="mt-3 rounded-md bg-neutral-100 p-2 text-[11px] font-mono text-neutral-700 break-all">
            {message}
          </div>
        )}
      </div>

      {/* User mapping editor */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">User Mapping</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-neutral-100">
              <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500">
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
                  <tr key={m.fub_user_id} className="border-b border-neutral-50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-neutral-500">{m.fub_user_id}</td>
                    <td className="py-2 pr-3 truncate">{m.fub_email}</td>
                    <td className="py-2 pr-3">
                      {profile ? (
                        <span className="text-emerald-700">{profile.full_name || profile.email}</span>
                      ) : (
                        <span className="text-amber-600">— sin link</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-neutral-700">{m.fub_role}</td>
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
      </div>

      {/* Webhook log */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">
          Webhook Log <span className="text-[10px] text-neutral-500">últimos {webhookLog.length}</span>
        </h3>
        {webhookLog.length === 0 ? (
          <div className="py-4 text-center text-xs text-neutral-500">Sin webhooks aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-neutral-100">
                <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500">
                  <th className="pb-2 pr-3 font-medium">Evento</th>
                  <th className="pb-2 pr-3 font-medium">IDs</th>
                  <th className="pb-2 pr-3 font-medium">Recibido</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {webhookLog.map((w) => (
                  <tr key={w.id} className="border-b border-neutral-50 last:border-0">
                    <td className="py-1.5 pr-3 font-mono">{w.event_type}</td>
                    <td className="py-1.5 pr-3 font-mono text-neutral-500">
                      {(w.resource_ids || []).slice(0, 3).join(',')}
                      {(w.resource_ids || []).length > 3 ? '…' : ''}
                    </td>
                    <td className="py-1.5 pr-3 text-neutral-500">
                      {w.received_at ? new Date(w.received_at).toLocaleString('es-ES') : '—'}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={
                          w.status === 'processed'
                            ? 'rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700'
                            : w.status === 'error'
                            ? 'rounded bg-red-100 px-1.5 py-0.5 text-red-700'
                            : w.status === 'pending'
                            ? 'rounded bg-amber-100 px-1.5 py-0.5 text-amber-700'
                            : 'rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600'
                        }
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 truncate text-red-600 max-w-xs">{w.error_message || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
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
          if ('error' in r) setV(value) // revert
        })
      }
      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
        v ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-500'
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
      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
        v ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
      }`}
    >
      {v ? 'on' : 'off'}
    </button>
  )
}
