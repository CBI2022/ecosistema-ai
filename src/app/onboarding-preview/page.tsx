import Link from 'next/link'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

// Preview pública del onboarding actual — para que Marco/Darcy/Bruno vean
// el flujo sin tener que loguearse con un usuario nuevo cada vez.
// El wizard es idéntico al de /onboarding, pero al guardar fallará silencio
// porque no hay user autenticado (es solo para revisar UX).

export default function OnboardingPreviewPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      <div className="sticky top-0 z-50 border-b border-[#C9A84C]/20 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#C9A84C]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">
              Preview onboarding
            </span>
            <span className="hidden text-xs text-[#9A9080] sm:inline">
              Vista previa del flujo de alta · No persiste datos
            </span>
          </div>
          <Link
            href="/login"
            className="text-xs text-[#9A9080] underline-offset-4 hover:text-[#F5F0E8] hover:underline"
          >
            Volver a login
          </Link>
        </div>
      </div>

      <OnboardingWizard />

      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <div className="rounded-xl border border-white/8 bg-[#131313] p-4 text-xs text-[#9A9080]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">
            Información para Marco / Darcy / Bruno
          </p>
          <p className="mb-1">
            <strong className="text-[#F5F0E8]">¿Qué es esto?</strong> El onboarding actual del SaaS, tal y como lo verían Bruno, Darcy y los agentes la primera vez que entran. 3 pasos:
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Información personal (foto, nombre, teléfono)</li>
            <li>Objetivos anuales (ingresos, closings, citas, llamadas, follow-ups)</li>
            <li>Motivación (privado — solo lo ve el agente)</li>
          </ol>
          <p className="mt-3">
            <strong className="text-[#F5F0E8]">Estado:</strong> desactivado en producción (no se muestra a nuevos usuarios) hasta que Marco + Darcy decidan la versión definitiva.
          </p>
        </div>
      </div>
    </div>
  )
}
