import { UpdatePasswordForm } from '@/features/auth/components'

export default function UpdatePasswordPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          Elige una contraseña segura para tu cuenta
        </p>
      </div>

      <UpdatePasswordForm />
    </>
  )
}
