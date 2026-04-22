'use client'

import { useEffect, useState } from 'react'

// Escucha mensajes del service worker y muestra toast si hay version nueva disponible.
// Al aceptar, recarga la pagina para coger la build nueva.
export function SWUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Auto-registrar SW si no lo esta
    navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
      if (!reg) navigator.serviceWorker.register('/sw.js')
    })

    // Escuchar mensaje del SW cuando se activa version nueva
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') setUpdateAvailable(true)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // Detectar nueva version esperando (waiting worker)
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return
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
    })

    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
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
      className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#C9A84C]/40 bg-[#131313] px-4 py-3 shadow-2xl backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm text-[#F5F0E8]">Nueva versión disponible</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="rounded-lg bg-[#C9A84C] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#E8C96A]"
      >
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => setUpdateAvailable(false)}
        className="text-xs text-[#9A9080] hover:text-[#F5F0E8]"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
