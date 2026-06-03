import { getTranslations } from 'next-intl/server'
import { UpdatePasswordForm } from '@/features/auth/components'

export default async function UpdatePasswordPage() {
  const t = await getTranslations('auth')
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('newPasswordTitle')}</h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          {t('newPasswordSubtitle')}
        </p>
      </div>

      <UpdatePasswordForm />
    </>
  )
}
