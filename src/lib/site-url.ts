// URL canónica del SaaS en producción.
// IMPORTANTE: Marco quiere que TODOS los links que envía el sistema (emails,
// notifs push, redirect_to del auth de Supabase) apunten siempre al dominio
// personalizado, NUNCA al dominio *.vercel.app.

const CANONICAL_URL = 'https://app.costablancainvestments.com'

/**
 * Devuelve la URL base que debe usarse en TODA comunicación al usuario.
 * - En producción → SIEMPRE el dominio personalizado (CANONICAL_URL).
 * - En desarrollo local → http://localhost:3000 si NEXT_PUBLIC_SITE_URL apunta a localhost.
 *
 * NUNCA devolver una URL de vercel.app aunque NEXT_PUBLIC_SITE_URL la tenga
 * (puede estar mal configurada en Vercel).
 */
export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl?.startsWith('http://localhost')) return envUrl
  // Cualquier otra cosa (incluido si apunta a vercel.app) → forzar canonical
  return CANONICAL_URL
}
