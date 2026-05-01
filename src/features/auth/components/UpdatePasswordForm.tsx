'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoadingOverlay } from './LoadingOverlay'

export function UpdatePasswordForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  // Al montar la página leemos el fragment del URL (#access_token=...&refresh_token=...)
  // o el code de query (?code=...) que Supabase pone tras el flujo de recovery, y
  // establecemos manualmente la sesión. Sin esto da 'Auth session missing!'.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = createClient()

    async function bootstrap() {
      try {
        // Caso 1: ya hay sesión activa (login normal o recovery ya intercambiado)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
          return
        }

        // Caso 2: tokens vienen en el fragment (#access_token=...&refresh_token=...)
        const hash = window.location.hash.substring(1)
        if (hash) {
          const params = new URLSearchParams(hash)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) {
              setBootError('El enlace ha caducado o es inválido. Pide otro reset desde "He olvidado mi contraseña".')
              return
            }
            // Limpiar el hash de la URL (ya no lo necesitamos y por seguridad)
            window.history.replaceState(null, '', window.location.pathname)
            setSessionReady(true)
            return
          }
        }

        // Caso 3: code en query (?code=...) — flujo PKCE
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setBootError('El enlace ha caducado o es inválido. Pide otro reset.')
            return
          }
          window.history.replaceState(null, '', url.pathname)
          setSessionReady(true)
          return
        }

        // Caso 4: nada que procesar — usuario llegó manualmente sin link
        setBootError('Acceso inválido. Solicita un nuevo enlace desde "He olvidado mi contraseña".')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        setBootError(msg)
      }
    }

    bootstrap()
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const password = formData.get('password') as string
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Éxito: limpiamos sesión de recovery y redirigimos a login para que
    // el usuario entre con la nueva password.
    await supabase.auth.signOut()
    router.replace('/login?password_changed=1')
  }

  if (bootError) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-400">
        {bootError}
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
      </div>
    )
  }

  return (
    <>
      {loading && <LoadingOverlay title={t('updatingPassword')} subtitle={t('savingSecureChanges')} />}
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            {t('newPassword')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={loading}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60 disabled:opacity-50"
            placeholder={t('passwordMin6')}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              {t('updatingPassword')}
            </>
          ) : (
            t('updatePassword')
          )}
        </button>
      </form>
    </>
  )
}
