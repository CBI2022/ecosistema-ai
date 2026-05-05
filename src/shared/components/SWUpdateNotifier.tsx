'use client'

import { useEffect, useState } from 'react'

// Escucha mensajes del service worker y muestra toast si hay version nueva disponible.
// Al aceptar, recarga la pagina para coger la build nueva.
export function SWUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let updateInterval: ReturnType<typeof setInterval> | null = null

    // Auto-registrar SW si no lo esta + forzar update inmediato
    navigator.serviceWorker.getRegistration('/sw.js').then(async (existing) => {
      const reg = existing ?? (await navigator.serviceWorker.register('/sw.js'))

      if (reg.waiting) setUpdateAvailable(true)

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })

      // Forzar verificación inmediata al cargar la página (en lugar de esperar 24h del browser)
      reg.update().catch(() => {})

      // Re-verificar cada 60s mientras la pestaña esté abierta
      updateInterval = setInterval(() => {
        reg.update().catch(() => {})
      }, 60_000)

      // Re-verificar cuando la app vuelve del background (importante para PWAs en iOS)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {})
      })
    })

    // Escuchar mensaje del SW cuando se activa version nueva
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') setUpdateAvailable(true)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      if (updateInterval) clearInterval(updateInterval)
    }
  }, [])

  if (!updateAvailable) return null

  function applyUpdate() {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      setTimeout(() => window.location.reload(), 100)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sw-update-title"
      className="fixed inset-0 z-[300] flex items-center justify-center px-5 py-8"
    >
      {/* Backdrop oscuro con blur */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setUpdateAvailable(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-md [animation:cbi-update-fade_0.2s_ease-out]"
      />

      {/* Modal central */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#C9A84C]/35 bg-[#0F0F0F] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(201,168,76,0.15)] [animation:cbi-update-pop_0.28s_cubic-bezier(0.22,0.61,0.36,1)]">
        {/* Banda dorada superior */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

        <div className="px-6 pb-6 pt-7 text-center">
          {/* Icono con anillo */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A84C]/12 ring-2 ring-[#C9A84C]/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
            Nueva versión
          </p>
          <h2
            id="sw-update-title"
            className="mt-2 text-xl font-bold leading-snug text-[#F5F0E8]"
          >
            Hay una actualización disponible
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#9A9080]">
            Se han subido cambios nuevos al SaaS. Pulsa Actualizar para verlos al instante.
          </p>

          <button
            type="button"
            onClick={applyUpdate}
            className="mt-6 w-full rounded-2xl bg-[#C9A84C] px-5 py-4 text-sm font-bold uppercase tracking-[0.08em] text-black transition active:scale-[0.98] hover:bg-[#E8C96A]"
          >
            Actualizar ahora
          </button>
          <button
            type="button"
            onClick={() => setUpdateAvailable(false)}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-medium text-[#9A9080] transition hover:text-[#F5F0E8]"
          >
            Más tarde
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cbi-update-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cbi-update-pop {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
