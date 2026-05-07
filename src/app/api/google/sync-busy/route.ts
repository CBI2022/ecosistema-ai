import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncBusyTimes } from '@/lib/google-calendar'

// POST /api/google/sync-busy?from=YYYY-MM-DD&to=YYYY-MM-DD
// El agente puede llamar esta ruta para refrescar busy times del fotógrafo activo
// antes de mostrar el calendario de booking.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'Faltan parámetros from/to (YYYY-MM-DD)' }, { status: 400 })
  }

  // Localizar al fotógrafo activo
  const admin = createAdminClient()
  const { data: photographer } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'photographer')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!photographer) {
    return NextResponse.json({ error: 'Sin fotógrafo activo' }, { status: 404 })
  }

  const result = await syncBusyTimes(photographer.id, from, to)
  return NextResponse.json(result)
}
