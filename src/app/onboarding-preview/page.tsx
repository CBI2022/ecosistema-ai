import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

// Preview pública del onboarding actual — Marco/Darcy/Bruno pueden navegar
// libremente entre los 3 pasos sin loguearse y sin rellenar datos.
// El wizard recibe previewMode=true → no guarda nada, no exige validación.

export default function OnboardingPreviewPage() {
  const t = useTranslations('shell.onboardingPreview')
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[#C9A84C]/20 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-[#C9A84C]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">
              {t('badge')}
            </span>
            <span className="hidden truncate text-xs text-[#9A9080] sm:inline">
              {t('topbarNote')}
            </span>
          </div>
          <Link
            href="/login"
            className="shrink-0 text-xs text-[#9A9080] underline-offset-4 hover:text-[#F5F0E8] hover:underline"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </header>

      {/* Info para Marco / Darcy / Bruno */}
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            {t('forTeam')}
          </p>
          <h1 className="mt-2 text-lg font-bold text-[#F5F0E8] sm:text-xl">
            {t('heading')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#9A9080]">
            {t.rich('intro', {
              strong: (chunks) => <strong className="text-[#F5F0E8]">{chunks}</strong>,
            })}
          </p>
          <div className="mt-4 grid gap-2 text-xs text-[#9A9080] sm:grid-cols-3">
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">{t('step1')}</p>
              <p className="mt-1 text-[#F5F0E8]">{t('step1Title')}</p>
              <p className="mt-1">{t('step1Desc')}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">{t('step2')}</p>
              <p className="mt-1 text-[#F5F0E8]">{t('step2Title')}</p>
              <p className="mt-1">{t('step2Desc')}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">{t('step3')}</p>
              <p className="mt-1 text-[#F5F0E8]">{t('step3Title')}</p>
              <p className="mt-1">{t('step3Desc')}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#9A9080]">
            {t.rich('prodStatus', {
              strong: (chunks) => <strong className="text-[#F5F0E8]">{chunks}</strong>,
            })}
          </p>
        </div>
      </div>

      {/* Wizard centrado */}
      <main className="flex justify-center px-4 py-10 sm:px-6">
        <OnboardingWizard previewMode />
      </main>
    </div>
  )
}
