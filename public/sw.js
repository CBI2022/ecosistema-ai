// CBI Service Worker — push notifications + estrategia de update
// Versión incluida en cache name para forzar update al cambiar de build
const SW_VERSION = 'v2'
const CACHE_NAME = `cbi-${SW_VERSION}`

self.addEventListener('install', (event) => {
  // Nueva versión instalada → activa inmediatamente, sin esperar
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpiar caches viejos de versiones anteriores
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => n.startsWith('cbi-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
      // Toma control de todas las pestañas abiertas
      await self.clients.claim()
      // Avisa a las pestañas que hay update
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION })
      }
    })()
  )
})

// Mensaje desde la app para forzar update manual
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Push notifications
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
    vibrate: [80, 40, 80],
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
