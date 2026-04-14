/**
 * Overlay de carga reutilizable.
 * Pantalla completa con spinner dorado animado + logo CBI pulsante.
 * Usar cuando el usuario inicia una acción que tarda (login, signup, etc.).
 */
interface LoadingOverlayProps {
  title?: string
  subtitle?: string
}

export function LoadingOverlay({
  title = 'Cargando...',
  subtitle = 'Un momento por favor',
}: LoadingOverlayProps = {}) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner dorado doble anillo */}
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-[#C9A84C]/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#C9A84C] border-r-[#C9A84C]" />
          <div
            className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-[#E8C96A]"
            style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}
          />
        </div>

        {/* Logo CBI pulsante */}
        <img src="/logo-cbi.png" alt="CBI" className="h-8 w-auto animate-pulse opacity-70" />

        <div className="text-center">
          <p className="font-['Maharlika',serif] text-lg text-[#F5F0E8]">{title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#9A9080]">{subtitle}</p>
        </div>

        {/* Puntos bounce */}
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
