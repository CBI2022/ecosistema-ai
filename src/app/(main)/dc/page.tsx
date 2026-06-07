import { getTranslations } from 'next-intl/server'

// Pantalla del Director Comercial. Rol aún sin definir: solo un aviso.
export default async function DCPage() {
  const t = await getTranslations('dc')
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#161412] to-[#0B0A09] p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-2xl">
          🚧
        </div>
        <h1 className="text-2xl font-bold text-[#F5F0E8]">{t('title')}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9A9080]">{t('description')}</p>
      </div>
    </div>
  )
}
