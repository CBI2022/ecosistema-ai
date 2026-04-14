'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { resetPassword } from '@/actions/auth'
import { LoadingOverlay } from './LoadingOverlay'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-5 py-4 text-center">
        <p className="text-sm text-[#C9A84C]">
          {t('checkEmail')}
        </p>
      </div>
    )
  }

  return (
    <>
      {loading && <LoadingOverlay title={t('sending')} subtitle={t('generatingResetLink')} />}
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60 disabled:opacity-50"
            placeholder={t('emailPlaceholder')}
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
              {t('sending')}
            </>
          ) : (
            t('sendLink')
          )}
        </button>
      </form>
    </>
  )
}
