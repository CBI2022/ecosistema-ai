import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
  GOOGLE_CALENDAR_SCOPES,
  syncBusyTimes,
} from '@/lib/google-calendar'
import { getSiteUrl } from '@/lib/site-url'

// Callback que recibe el code de Google. Intercambia, guarda tokens y vuelve.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const siteUrl = getSiteUrl()

  if (errorParam) {
    return NextResponse.redirect(`${siteUrl}/photographer?google=error&reason=${encodeURIComponent(errorParam)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${siteUrl}/photographer?google=error&reason=missing_code`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`)
  }

  // Verificar que el state coincide con el user logueado (anti-CSRF mínimo)
  if (state && state !== user.id) {
    return NextResponse.redirect(`${siteUrl}/photographer?google=error&reason=state_mismatch`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      // Sin refresh_token no podemos mantener la conexión a largo plazo.
      // Esto pasa si el usuario ya autorizó antes y Google no lo reemite.
      // Forzar revocación previa o instruir a desconectar y reconectar.
      return NextResponse.redirect(
        `${siteUrl}/photographer?google=error&reason=no_refresh_token`,
      )
    }

    const email = await fetchGoogleEmail(tokens)
    const admin = createAdminClient()

    await admin.from('google_calendar_connections').upsert(
      {
        user_id: user.id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token ?? null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        calendar_id: 'primary',
        google_email: email,
        scopes: GOOGLE_CALENDAR_SCOPES.join(' '),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    // Primer sync: traer busy times de los próximos 90 días
    const today = new Date().toISOString().split('T')[0]
    const in90 = new Date()
    in90.setDate(in90.getDate() + 90)
    const future = in90.toISOString().split('T')[0]
    syncBusyTimes(user.id, today, future).catch(() => {})

    return NextResponse.redirect(`${siteUrl}/photographer?google=connected`)
  } catch (err) {
    console.error('[google/callback] error:', err)
    return NextResponse.redirect(`${siteUrl}/photographer?google=error&reason=exchange_failed`)
  }
}
