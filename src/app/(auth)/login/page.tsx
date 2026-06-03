import { Suspense } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '@/features/auth/components'

export default async function LoginPage() {
  const t = await getTranslations('auth')
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('welcome')}</h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          {t('loginSubtitle')}
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-[#F5F0E8]/40">
        {t('noAccount')}{' '}
        <Link
          href="/signup"
          className="font-medium text-[#C9A84C] transition hover:text-[#E8C96A]"
        >
          {t('requestAccess')}
        </Link>
      </p>
    </>
  )
}
