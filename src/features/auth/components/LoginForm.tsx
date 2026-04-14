'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/actions/auth'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Si no hay error, el server action hace redirect → mantenemos loading true hasta que llegue la nueva página
  }

  return (
    <>
      {/* Overlay de carga a pantalla completa cuando está procesando */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            {/* Spinner dorado animado */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#C9A84C]/15" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#C9A84C] border-r-[#C9A84C]" />
              <div
                className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-[#E8C96A]"
                style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}
              />
            </div>

            {/* Logo CBI pulsante */}
            <img
              src="/logo-cbi.png"
              alt="CBI"
              className="h-8 w-auto animate-pulse opacity-70"
            />

            <div className="text-center">
              <p className="font-['Maharlika',serif] text-lg text-[#F5F0E8]">
                Accediendo...
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#9A9080]">
                Verificando credenciales
              </p>
            </div>

            {/* Puntos animados */}
            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60 focus:bg-white/8 disabled:opacity-50"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#C9A84C]/70 transition hover:text-[#C9A84C]"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60 focus:bg-white/8 disabled:opacity-50"
              placeholder="••••••••"
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
                Entrando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </div>
    </>
  )
}
