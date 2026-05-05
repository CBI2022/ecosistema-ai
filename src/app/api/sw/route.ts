import { NextResponse } from 'next/server'

// IMPORTANTE: este endpoint sirve el Service Worker de la app.
// No se sirve desde /public/sw.js porque Vercel CDN cachea esos assets
// agresivamente y no invalida en deploys → la PWA se quedaba con SWs viejos
// y nunca aparecía el banner "Nueva versión disponible".
//
// Ahora /sw.js se rewrite-ea a esta ruta (ver next.config.ts) y se sirve
// con la SW_VERSION inyectada dinámicamente desde VERCEL_GIT_COMMIT_SHA,
// que cambia con cada commit → el browser siempre detecta SW nuevo y dispara
// el flujo de update.

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SW_TEMPLATE = `// CBI Service Worker — push notifications + update strategy
const SW_VERSION = '__SW_VERSION__'
const CACHE_NAME = 'cbi-' + SW_VERSION

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((n) => n.startsWith('cbi-') && n !== CACHE_NAME)
        .map((n) => caches.delete(n))
    )
    await self.clients.claim()
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientList) {
      client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION })
    }
  })())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (err) {
    data = { title: 'CBI', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'CBI'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'cbi-notification',
    data: { url: data.url || '/dashboard' },
    vibrate: [200, 100, 200, 100, 200],
    silent: false,
    renotify: true,
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
`

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  const version = sha ? sha.slice(0, 12) : `local-${Date.now()}`
  const body = SW_TEMPLATE.replace('__SW_VERSION__', version)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Service-Worker-Allowed': '/',
    },
  })
}
