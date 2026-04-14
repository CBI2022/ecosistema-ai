import Link from 'next/link'
import { PendingApprovalListener } from '@/features/auth/components/PendingApprovalListener'

export default function PendingApprovalPage() {
  return (
    <div className="py-4 text-center">
      <PendingApprovalListener />
      {/* Icono */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10">
        <svg
          className="h-7 w-7 text-[#C9A84C]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-bold text-[#F5F0E8]">
        Solicitud enviada
      </h1>
      <p className="mb-1 text-sm text-[#F5F0E8]/50">
        Tu solicitud está pendiente de aprobación.
      </p>
      <p className="text-sm text-[#F5F0E8]/50">
        Bruno o Darcy revisarán tu cuenta y recibirás acceso en breve.
      </p>

      <div className="mt-8 border-t border-white/8 pt-6">
        <Link
          href="/login"
          className="text-sm text-[#C9A84C]/70 transition hover:text-[#C9A84C]"
        >
          ← Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
