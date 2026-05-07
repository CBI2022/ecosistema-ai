'use client'

import { useTransition } from 'react'
import { disconnectMyGoogleCalendar } from '@/actions/google-calendar'

interface Props {
  configured: boolean
  connected: boolean
  email: string | null
  connectedAt: string | null
  initialFlash?: 'connected' | 'error' | null
  errorReason?: string | null
}

export function GoogleCalendarCard({
  configured,
  connected,
  email,
  connectedAt,
  initialFlash,
  errorReason,
}: Props) {
  const [pending, startTransition] = useTransition()

  function handleDisconnect() {
    if (!confirm('¿Seguro que quieres desconectar tu Google Calendar? Los shoots ya creados no se borrarán.')) return
    startTransition(async () => {
      await disconnectMyGoogleCalendar()
    })
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-base">⚙️</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-200">Google Calendar — pendiente de configurar</p>
            <p className="mt-1 text-xs text-amber-200/80">
              El admin todavía no ha conectado las credenciales del proyecto en Google Cloud.
              En cuanto estén, este recuadro pasará a ser un botón para conectar tu calendario.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="rounded-2xl border border-[#2ECC9A]/25 bg-[#2ECC9A]/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2ECC9A]/20 text-base">✅</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#2ECC9A]">Google Calendar conectado</p>
              {email && (
                <p className="mt-0.5 text-xs text-[#9A9080]">
                  Cuenta: <strong className="text-[#F5F0E8]">{email}</strong>
                </p>
              )}
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#9A9080]">
                Cada shoot que confirmes se crea automáticamente en tu Google Calendar. Cualquier evento
                personal que metas en tu Calendar bloquea ese horario para que los agentes no te reserven ahí.
              </p>
              {initialFlash === 'connected' && (
                <p className="mt-2 inline-block rounded-full bg-[#2ECC9A]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2ECC9A]">
                  ¡Conectado correctamente!
                </p>
              )}
            </div>
          </div>
          <button
            disabled={pending}
            onClick={handleDisconnect}
            className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400 transition active:scale-95 hover:bg-red-500/10 disabled:opacity-50"
          >
            {pending ? 'Desconectando...' : 'Desconectar'}
          </button>
        </div>
      </div>
    )
  }

  // Configurado pero no conectado todavía
  return (
    <div
      className="rounded-2xl border border-[#C9A84C]/30 bg-gradient-to-br from-[#1A1408] to-[#131313] p-4 sm:p-5"
      style={{ borderTop: '2px solid #C9A84C' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A84C]/15 text-lg">📅</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#F5F0E8]">Conecta tu Google Calendar</p>
            <p className="mt-1 text-xs text-[#9A9080]">
              Cada shoot que confirmes aparecerá en tu Calendar (móvil incluido). Tus eventos personales
              bloquearán automáticamente esos huecos para los agentes.
            </p>
          </div>
        </div>
        <a
          href="/api/google/connect"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition active:scale-95 hover:bg-[#E8C96A]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Conectar
        </a>
      </div>

      {initialFlash === 'error' && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {errorReason === 'no_refresh_token'
            ? 'Google no devolvió el permiso permanente. Desconecta esta app en tu cuenta Google y vuelve a intentarlo.'
            : `No se pudo conectar (${errorReason ?? 'error desconocido'}). Inténtalo de nuevo.`}
        </div>
      )}
    </div>
  )
}
