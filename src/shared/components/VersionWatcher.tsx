'use client'

import { useEffect, useState } from 'react'

// SHA del commit actual, inyectado por Vercel en build time.
// Si NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA está presente, lo usamos.
// Sino, usamos un fallback "local" que siempre será distinto al del server.
const BUILD_SHA = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || 'local-build'

/**
 * Detecta deploys nuevos en tiempo real comparando el SHA del build cargado
 * en el cliente contra el que sirve el endpoint /api/version.
 *
 * No depende del Service Worker → funciona aunque el SW esté cacheado,
 * aunque el CDN tenga el sw.js viejo, aunque la PWA esté en standalone.
 *
 * Cuando detecta una versión nueva, dispara el modal de actualización
 * (mismo componente que usa SWUpdateNotifier — se renderiza el modal central
 * con botón "Actualizar ahora").
 */
export function VersionWatcher() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let stopped = false

    async function check() {
      if (stopped) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { sha?: string }
        if (!data.sha) return
        // BUILD_SHA es 'local-build' si no hubo build de Vercel → ignorar comparación
        if (BUILD_SHA === 'local-build') return
        if (data.sha !== BUILD_SHA) {
          setHasUpdate(true)
        }
      } catch {
        // ignorar errores de red transitorios
      }
    }

    // Check inmediato al cargar
    void check()

    // Re-check cada 30s
    const interval = setInterval(check, 30_000)

    // Re-check cuando la app vuelve del background (PWA en iOS)
    const onVisibility = () => {
      if (!document.hidden) void check()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopped = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!hasUpdate) return null

  function applyUpdate() {
    // Limpia caches del browser y SW antes de recargar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.update().catch(() => {}))
      })
    }
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)))
    }
    setTimeout(() => window.location.reload(), 80)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-update-title"
      className="fixed inset-0 z-[300] flex items-center justify-center px-5 py-8"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setHasUpdate(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-md [animation:cbi-update-fade_0.2s_ease-out]"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#C9A84C]/35 bg-[#0F0F0F] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(201,168,76,0.15)] [animation:cbi-update-pop_0.28s_cubic-bezier(0.22,0.61,0.36,1)]">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        <div className="px-6 pb-6 pt-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A84C]/12 ring-2 ring-[#C9A84C]/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
            Nueva versión
          </p>
          <h2 id="version-update-title" className="mt-2 text-xl font-bold leading-snug text-[#F5F0E8]">
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
            onClick={() => setHasUpdate(false)}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-medium text-[#9A9080] transition hover:text-[#F5F0E8]"
          >
            Más tarde
          </button>
        </div>
      </div>
      <style>{`
        @keyframes cbi-update-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cbi-update-pop {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
