import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function CheckEmailPage() {
  const t = await getTranslations('auth')
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10">
        <svg
          className="h-7 w-7 text-[#C9A84C]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-bold text-[#F5F0E8]">
        {t('confirmEmailTitle')}
      </h1>
      <p className="text-sm text-[#F5F0E8]/50">
        {t('confirmEmailDesc')}
      </p>

      <div className="mt-8 border-t border-white/8 pt-6">
        <Link
          href="/login"
          className="text-sm text-[#C9A84C]/70 transition hover:text-[#C9A84C]"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  )
}
