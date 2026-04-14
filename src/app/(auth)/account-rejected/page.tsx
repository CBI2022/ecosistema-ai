import Link from 'next/link'

export default function AccountRejectedPage() {
  return (
    <div className="py-4 text-center">
      {/* Icono */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
        <svg
          className="h-7 w-7 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-bold text-[#F5F0E8]">
        Solicitud rechazada
      </h1>
      <p className="text-sm text-[#F5F0E8]/50">
        Tu solicitud de acceso no fue aprobada. Contacta con la administración
        de CBI si crees que es un error.
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
