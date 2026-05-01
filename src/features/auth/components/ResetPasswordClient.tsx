'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Página de reset que NO depende de la URL Configuration de Supabase.
// Recibe ?token_hash=<hashed_token> que generamos vía admin.generateLink y
// llama directamente verifyOtp para establecer sesión, luego cambia password.

export function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token')

  const [phase, setPhase] = useState<'verifying' | 'ready' | 'saving' | 'error'>('verifying')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!tokenHash) {
      setPhase('error')
      setError('Enlace inválido. Solicita un nuevo email de reset.')
      return
    }

    const supabase = createClient()
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
      if (error) {
        setPhase('error')
        setError(`El enlace ha caducado o ya se usó. Pide uno nuevo desde "He olvidado mi contraseña". (${error.message})`)
        return
      }
      setPhase('ready')
    })
  }, [tokenHash])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setPhase('saving')
    setError(null)

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message)
      setPhase('ready')
      return
    }

    // Cerrar sesión de recovery y mandar a login con flag de éxito
    await supabase.auth.signOut()
    router.replace('/login?password_changed=1')
  }

  if (phase === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
        <p className="text-sm text-[#9A9080]">Verificando enlace…</p>
      </div>
    )
  }

  if (phase === 'error' && !password) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
        >
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          autoFocus
          disabled={phase === 'saving'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60 disabled:opacity-50"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={phase === 'saving'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
      >
        {phase === 'saving' ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Guardando…
          </>
        ) : (
          'Guardar contraseña'
        )}
      </button>
    </form>
  )
}
