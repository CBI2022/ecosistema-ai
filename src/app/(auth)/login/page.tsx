import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Bienvenido</h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          Accede a tu panel de CBI
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-[#F5F0E8]/40">
        ¿No tienes cuenta?{' '}
        <Link
          href="/signup"
          className="font-medium text-[#C9A84C] transition hover:text-[#E8C96A]"
        >
          Solicitar acceso
        </Link>
      </p>
    </>
  )
}
