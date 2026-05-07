import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar'

// GET /api/google/connect → redirige a Google con state=user.id
// Solo accesible para usuarios autenticados.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth no configurado en este entorno' },
      { status: 503 },
    )
  }

  const authUrl = buildAuthUrl(user.id)
  if (!authUrl) {
    return NextResponse.json({ error: 'No se pudo construir la URL OAuth' }, { status: 500 })
  }

  return NextResponse.redirect(authUrl)
}
