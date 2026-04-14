import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          Restablecer contraseña
        </h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          Te enviamos un enlace a tu email
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-[#F5F0E8]/40">
        <Link
          href="/login"
          className="font-medium text-[#C9A84C] transition hover:text-[#E8C96A]"
        >
          ← Volver al login
        </Link>
      </p>
    </>
  )
}
