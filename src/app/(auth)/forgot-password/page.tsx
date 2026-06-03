import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm } from '@/features/auth/components'

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth')
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          {t('resetPassword')}
        </h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          {t('resetPasswordSubtitle')}
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-[#F5F0E8]/40">
        <Link
          href="/login"
          className="font-medium text-[#C9A84C] transition hover:text-[#E8C96A]"
        >
          {t('backToLogin')}
        </Link>
      </p>
    </>
  )
}
