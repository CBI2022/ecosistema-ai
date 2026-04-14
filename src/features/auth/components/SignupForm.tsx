'use client'

import { useState } from 'react'
import { signup } from '@/actions/auth'
import type { UserRole } from '@/types/database'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'agent', label: 'Agente Inmobiliario' },
  { value: 'secretary', label: 'Secretaria' },
  { value: 'photographer', label: 'Fotógrafo' },
]

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60"
            placeholder="Bruno Felipe"
          />
        </div>

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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60"
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="role"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            Tu rol en CBI
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="agent"
            className="w-full rounded-lg border border-white/10 bg-[#131313] px-4 py-3 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
        >
          {loading ? 'Enviando solicitud...' : 'Solicitar acceso'}
        </button>

        <p className="text-center text-xs text-[#F5F0E8]/30">
          Tu solicitud será revisada por un administrador de CBI
        </p>
      </form>
    </div>
  )
}
