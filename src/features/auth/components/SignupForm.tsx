'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { signup } from '@/actions/auth'
import { LoadingOverlay } from './LoadingOverlay'
import type { UserRole } from '@/types/database'

export function SignupForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'agent', label: t('roleAgent') },
    { value: 'secretary', label: t('roleSecretary') },
    { value: 'photographer', label: t('rolePhotographer') },
  ]

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
    <>
      {loading && <LoadingOverlay title={t('requestingAccess')} subtitle={t('signupPendingReview')} />}
      <div className="space-y-5">
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            {t('fullName')}
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
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/20 outline-none transition focus:border-[#C9A84C]/60"
            placeholder={t('passwordMin6')}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="role"
            className="block text-xs font-medium uppercase tracking-widest text-[#F5F0E8]/50"
          >
            {t('role')}
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              {t('sending')}
            </>
          ) : (
            t('requestAccess')
          )}
        </button>

        <p className="text-center text-xs text-[#F5F0E8]/30">
          {t('signupPendingReview')}
        </p>
      </form>
    </div>
    </>
  )
}
