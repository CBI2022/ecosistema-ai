import { getTranslations } from 'next-intl/server'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('auth')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="/logo-cbi.png"
          alt="Costa Blanca Investments"
          className="mx-auto h-12 w-auto"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#131313] p-8 shadow-2xl">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-[11px] text-[#F5F0E8]/20">
        {t('platformNote')}
      </p>
    </div>
  )
}
