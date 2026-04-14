'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeInitialCredentials } from '@/actions/profile'

interface FirstLoginModalProps {
  currentEmail: string
}

export function FirstLoginModal({ currentEmail }: FirstLoginModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const password = String(formData.get('password') || '')
    const confirm = String(formData.get('password_confirm') || '')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    const result = await changeInitialCredentials(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#C9A84C]/30 bg-[#131313] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C]/15">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-[#F5F0E8]">Bienvenido a CBI</h2>
          <p className="mt-2 text-sm text-[#9A9080]">
            Por seguridad, cambia tu email y contraseña antes de continuar. Esta ventana no se puede cerrar.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              Email actual
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-[#9A9080] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              Nuevo email real *
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="tu.email@cbi.com"
              className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#9A9080] outline-none transition focus:border-[#C9A84C]/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              Nueva contraseña * (mín. 8 caracteres)
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              Confirmar contraseña *
            </label>
            <input
              name="password_confirm"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60"
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
            className="w-full rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
