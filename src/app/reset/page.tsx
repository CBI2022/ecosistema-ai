import { ResetPasswordClient } from '@/features/auth/components/ResetPasswordClient'

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-12">
      <div className="mb-8 text-center">
        <img src="/logo-cbi.png" alt="Costa Blanca Investments" className="mx-auto h-12 w-auto" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#131313] p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-[#F5F0E8]">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-[#F5F0E8]/40">
            Elige una contraseña segura para tu cuenta
          </p>
        </div>
        <ResetPasswordClient />
      </div>
      <p className="mt-8 text-[11px] text-[#F5F0E8]/20">
        Plataforma interna exclusiva — acceso restringido
      </p>
    </div>
  )
}
