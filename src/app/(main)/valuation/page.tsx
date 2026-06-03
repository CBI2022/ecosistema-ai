import { useTranslations } from 'next-intl'
import { ValuationForm } from '@/features/tools/components/ValuationForm'

export default function ValuationPage() {
  const t = useTranslations('shell.valuation')
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[#9A9080]">{t('subtitle')}</p>
      </div>
      <ValuationForm />
    </div>
  )
}
