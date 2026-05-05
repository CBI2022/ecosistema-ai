import { NextResponse } from 'next/server'

// Endpoint dinámico para que el cliente detecte deploys nuevos en tiempo real.
// El cliente cargado en el browser tiene su propio SHA inyectado en build time
// (NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA). Si el cliente poll-ea aquí y obtiene un
// SHA distinto → hay deploy nuevo → mostrar modal de actualizar.
//
// Independiente del Service Worker → funciona aunque la PWA tenga el SW cacheado,
// aunque el CDN cachee /sw.js, aunque el browser no chequee actualizaciones.

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || `local-${Date.now()}`
  return NextResponse.json(
    { sha, ts: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  )
}
