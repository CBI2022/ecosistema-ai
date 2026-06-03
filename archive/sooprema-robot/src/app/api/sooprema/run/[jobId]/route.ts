import { NextRequest, NextResponse } from 'next/server'
import { processSoopremaJob } from '@/actions/sooprema'
import { SOOPREMA_AUTOMATION_ENABLED, SOOPREMA_DISABLED_MESSAGE } from '@/lib/sooprema/kill-switch'

// Endpoint interno que ejecuta un job de Sooprema. Lo llama
// `properties.ts` después de crear el job, sin esperar respuesta.
//
// Auth: header `x-sooprema-token` con valor de SOOPREMA_INTERNAL_TOKEN.
// Si la env var no está configurada, requerimos al menos coincidencia con el
// SUPABASE_SERVICE_ROLE_KEY (también es secreto y solo el server lo tiene).

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const provided = req.headers.get('x-sooprema-token') || ''
  const expected =
    process.env.SOOPREMA_INTERNAL_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  if (!expected) return false
  return provided === expected
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  // ⛔ KILL-SWITCH: aunque alguien llame al endpoint directamente, no corre nada.
  if (!SOOPREMA_AUTOMATION_ENABLED) {
    return NextResponse.json({ error: SOOPREMA_DISABLED_MESSAGE }, { status: 410 })
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { jobId } = await ctx.params
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  }

  try {
    const result = await processSoopremaJob(jobId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
