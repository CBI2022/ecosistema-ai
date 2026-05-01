import Link from 'next/link'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

// Preview pública del onboarding actual — Marco/Darcy/Bruno pueden navegar
// libremente entre los 3 pasos sin loguearse y sin rellenar datos.
// El wizard recibe previewMode=true → no guarda nada, no exige validación.

export default function OnboardingPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[#C9A84C]/20 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-[#C9A84C]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">
              Preview
            </span>
            <span className="hidden truncate text-xs text-[#9A9080] sm:inline">
              Onboarding actual · No guarda datos · Botones desactivados
            </span>
          </div>
          <Link
            href="/login"
            className="shrink-0 text-xs text-[#9A9080] underline-offset-4 hover:text-[#F5F0E8] hover:underline"
          >
            Volver a login →
          </Link>
        </div>
      </header>

      {/* Info para Marco / Darcy / Bruno */}
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            Para Marco / Darcy / Bruno
          </p>
          <h1 className="mt-2 text-lg font-bold text-[#F5F0E8] sm:text-xl">
            Vista previa del onboarding actual
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#9A9080]">
            Esto es lo que verían los <strong className="text-[#F5F0E8]">agentes</strong> la primera vez que entran al SaaS (no admin/secretary/photographer). Puedes hacer click en <strong className="text-[#F5F0E8]">"Siguiente"</strong> y <strong className="text-[#F5F0E8]">"Atrás"</strong> sin rellenar nada — los botones están desactivados, no se guarda ningún dato.
          </p>
          <div className="mt-4 grid gap-2 text-xs text-[#9A9080] sm:grid-cols-3">
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">Paso 1</p>
              <p className="mt-1 text-[#F5F0E8]">Información personal</p>
              <p className="mt-1">Foto + Nombre + Apellido + Tel</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">Paso 2</p>
              <p className="mt-1 text-[#F5F0E8]">Objetivos anuales</p>
              <p className="mt-1">Ingresos, closings, citas, llamadas</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#131313] p-3">
              <p className="text-[#C9A84C]">Paso 3</p>
              <p className="mt-1 text-[#F5F0E8]">Motivación (privado)</p>
              <p className="mt-1">Por qué, vida ideal, frase</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#9A9080]">
            <strong className="text-[#F5F0E8]">Estado en producción:</strong> desactivado.
            No se muestra a nuevos usuarios hasta que decidáis la versión final.
          </p>
        </div>
      </div>

      {/* Wizard centrado */}
      <main className="flex justify-center px-4 py-10 sm:px-6">
        <OnboardingWizard previewMode />
      </main>
    </div>
  )
}
