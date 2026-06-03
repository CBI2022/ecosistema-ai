import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ROADMAPS } from '@/features/roadmaps/data/roadmaps'
import { RoadmapDetail } from '@/features/roadmaps/components/RoadmapsView'

// Página PÚBLICA: cualquiera con el enlace puede verla, sin necesidad de
// estar registrado ni iniciar sesión. Vive fuera del grupo (main), así que
// no pasa por el layout autenticado.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const rm = ROADMAPS.find((r) => r.id === id)
  if (!rm) return { title: 'RoadMap — CBI' }
  return {
    title: `${rm.phase}: ${rm.title} — RoadMap CBI`,
    description: rm.summary,
    openGraph: {
      title: `${rm.phase}: ${rm.title} — CBI`,
      description: rm.summary,
    },
  }
}

export default async function PublicRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const rm = ROADMAPS.find((r) => r.id === id)
  if (!rm) notFound()

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Barra superior con marca */}
      <header className="sticky top-0 z-30 border-b border-[#C9A84C]/12 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">CBI</span>
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-[#7A7263] sm:inline">RoadMap</span>
          </div>
          <span className="rounded-full border border-[#C9A84C]/20 px-2.5 py-1 text-[10px] font-medium text-[#9A9080]">
            Enlace compartido
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
        <RoadmapDetail rm={rm} />
      </main>

      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-[11px] text-[#5A5345]">Costa Blanca Investments · Plan de acción interno</p>
      </footer>
    </div>
  )
}
