'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { changeInitialCredentials } from '@/actions/profile'
import { LoadingOverlay } from './LoadingOverlay'

interface FirstLoginModalProps {
  currentEmail: string
}

export function FirstLoginModal({ currentEmail }: FirstLoginModalProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const password = String(formData.get('password') || '')
    const confirm = String(formData.get('password_confirm') || '')

    if (password !== confirm) {
      setError(t('passwordsDontMatch'))
      setLoading(false)
      return
    }

    const result = await changeInitialCredentials(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Tras cambiar credenciales, el action hace signOut y hay que redirigir a /login
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {loading && <LoadingOverlay title={t('savingCredentials')} subtitle={t('updatingEmailPwd')} />}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#C9A84C]/30 bg-[#131313] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C]/15">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-[#F5F0E8]">{t('firstLoginTitle')}</h2>
          <p className="mt-2 text-sm text-[#9A9080]">
            {t('firstLoginSubtitle')}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              {t('currentEmail')}
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
              {t('newEmailRequired')}
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder={t('newRealEmailPlaceholder')}
              className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#9A9080] outline-none transition focus:border-[#C9A84C]/60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
              {t('newPasswordMin8')}
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
              {t('confirmPasswordRequired')}
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                {t('saving')}
              </>
            ) : (
              t('saveAndContinue')
            )}
          </button>
        </form>
      </div>
    </div>
    </>
  )
}
