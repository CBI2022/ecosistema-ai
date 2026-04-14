'use client'

import { useEffect, useState } from 'react'
import { saveSubscription, unsubscribe, sendTestPush } from '@/actions/push'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function PushSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (!ok) return
    setPermission(Notification.permission)

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  async function handleEnable() {
    if (!supported) return
    setLoading(true)
    setToast(null)
    try {
      // Registrar SW si no está
      let reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Pedir permiso
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setToast('Permiso denegado. Revisa la configuración del navegador.')
        setLoading(false)
        return
      }

      // Suscribirse
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setToast('Error: VAPID key no configurada')
        setLoading(false)
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const subObj = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      if (!subObj.endpoint || !subObj.keys?.p256dh || !subObj.keys?.auth) {
        setToast('Error: suscripción inválida')
        setLoading(false)
        return
      }

      const res = await saveSubscription({
        endpoint: subObj.endpoint,
        keys: { p256dh: subObj.keys.p256dh, auth: subObj.keys.auth },
        userAgent: navigator.userAgent,
      })
      if (res?.error) {
        setToast('Error: ' + res.error)
      } else {
        setSubscribed(true)
        setToast('✓ Notificaciones activadas')
      }
    } catch (err) {
      setToast('Error activando notificaciones')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await unsubscribe(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
      setToast('Notificaciones desactivadas')
    } catch {
      setToast('Error desactivando')
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setLoading(true)
    const res = await sendTestPush()
    setLoading(false)
    if (res && 'error' in res && res.error) setToast('Error: ' + res.error)
    else if (res && 'skipped' in res) setToast('No hay suscripciones activas')
    else setToast('✓ Test enviado — revisa tu dispositivo')
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131313] p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-[#C9A84C]">
        📱 Notificaciones push
      </h2>

      {!supported ? (
        <div className="rounded-lg border border-white/10 bg-[#1C1C1C] p-4 text-sm text-[#9A9080]">
          Este navegador no soporta notificaciones push.<br/>
          <span className="text-xs text-[#9A9080]/60">Para iOS: instala la app desde Safari → Compartir → Añadir a pantalla de inicio.</span>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#F5F0E8]">
                Estado: {subscribed ? <span className="text-[#2ECC9A]">Activas</span> : <span className="text-[#9A9080]">Inactivas</span>}
              </p>
              <p className="text-[10px] text-[#9A9080]">
                Recibirás alertas de aprobaciones, publicaciones en Suprema, shoots, etc.
              </p>
            </div>
            {!subscribed ? (
              <button
                onClick={handleEnable}
                disabled={loading}
                className="rounded-xl bg-[#C9A84C] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
              >
                {loading ? 'Activando...' : 'Activar'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleTest}
                  disabled={loading}
                  className="rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2.5 text-xs font-bold text-[#C9A84C] transition hover:bg-[#C9A84C]/20 disabled:opacity-50"
                >
                  🔔 Probar
                </button>
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8] disabled:opacity-50"
                >
                  Desactivar
                </button>
              </div>
            )}
          </div>
          {toast && (
            <p className={`text-xs ${toast.startsWith('✓') ? 'text-[#2ECC9A]' : toast.startsWith('Error') ? 'text-red-400' : 'text-[#9A9080]'}`}>
              {toast}
            </p>
          )}
          {permission === 'denied' && (
            <p className="mt-2 text-[11px] text-red-400">
              El navegador tiene los permisos bloqueados. Actívalos desde la configuración del sitio.
            </p>
          )}
        </>
      )}
    </div>
  )
}
