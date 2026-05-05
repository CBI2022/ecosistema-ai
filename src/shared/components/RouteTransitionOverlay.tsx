'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Overlay central que aparece ÚNICAMENTE cuando la navegación tarda más de 250ms.
 * Si la transición es instantánea no se ve nada (no parpadea).
 *
 * Detecta clicks en <a> internos y cambios en query-string (ej: ?view=team del Dashboard).
 * Se oculta automáticamente cuando pathname o searchParams cambian (= página renderizada).
 */
export function RouteTransitionOverlay() {
  return (
    <Suspense fallback={null}>
      <Overlay />
    </Suspense>
  )
}

function Overlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cuando la URL cambia, ocultamos el overlay (la página ya está renderizada).
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [pathname, searchParams])

  // Interceptamos clicks en links internos (<a href="/...">) para arrancar el timer.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

      const target = e.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest('a') as HTMLAnchorElement | null
      if (!anchor || !anchor.href) return
      if (anchor.target === '_blank') return
      if (anchor.hasAttribute('download')) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const sameUrl =
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      if (sameUrl) return

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 250)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[180] flex items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#0A0A0A]/85 px-7 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-md [animation:cbi-overlay-in_0.18s_ease-out]">
        <div className="relative h-10 w-10">
          <span className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/15" />
          <span className="absolute inset-0 animate-[cbi-spin_0.9s_linear_infinite] rounded-full border-2 border-transparent border-t-[#C9A84C] border-r-[#C9A84C]" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">
          Cargando
        </span>
      </div>
      <style>{`
        @keyframes cbi-spin { to { transform: rotate(360deg); } }
        @keyframes cbi-overlay-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
