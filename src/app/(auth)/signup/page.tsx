import Link from 'next/link'
import { SignupForm } from '@/features/auth/components'

export default function SignupPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Solicitar acceso</h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          Tu solicitud será revisada por un Admin
        </p>
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-[#F5F0E8]/40">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-medium text-[#C9A84C] transition hover:text-[#E8C96A]"
        >
          Iniciar sesión
        </Link>
      </p>
    </>
  )
}
