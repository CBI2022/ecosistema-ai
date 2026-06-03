import { useTranslations } from 'next-intl'

export default function ContractsPage() {
  const t = useTranslations('shell.contracts')
  return (
    <div className="h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[#9A9080]">{t('subtitle')}</p>
      </div>
      <iframe
        src="https://cbidocs.com"
        className="h-full w-full rounded-2xl border border-white/8 bg-[#131313]"
        allow="fullscreen"
        title="CBIDocs Contracts"
      />
    </div>
  )
}
