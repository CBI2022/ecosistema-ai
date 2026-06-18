import { redirect } from 'next/navigation'

// ⏸️ Panel de rendimiento APARCADO.
// El foco actual de la app es publicar propiedades, así que /dashboard ya no
// se muestra. NO está borrado: la implementación completa (Revenue Chart,
// checklist, photo shoots, exclusive homes, FUB, etc.) vive en el historial de
// git — último estado en el commit 3148d89. Para reconstruirlo, recupéralo de
// ahí y quita este redirect.
export default async function DashboardPage() {
  redirect('/properties')
}
