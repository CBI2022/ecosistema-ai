// Normalizadores para datos FUB. Toda escritura a tablas fub_* debe pasar por aquí.

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null
  const trimmed = email.trim().toLowerCase()
  return trimmed.length ? trimmed : null
}

/**
 * Canonicaliza el source string de FUB. Maneja casos comunes vistos en
 * el equipo CBI: "Idealista", "idealista.com", "IDEALISTA", "Idealista BE", etc.
 * Casos no cubiertos se devuelven tal cual en lowercase trimmed para que
 * la tabla fub_source_canonical pueda mapearlos a posteriori.
 */
export function canonicalSource(raw?: string | null): string | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (!s) return null

  // Reglas heurísticas (orden importa)
  if (s.includes('idealista')) return 'idealista'
  if (s.includes('immo') || s.includes('imoluc')) return 'imoluc'
  if (s.includes('rightmove')) return 'rightmove'
  if (s.includes('zoopla')) return 'zoopla'
  if (s.includes('facebook') || s.includes(' fb ') || s === 'fb') return 'facebook'
  if (s.includes('instagram') || s === 'ig') return 'instagram'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('youtube') || s === 'yt') return 'youtube'
  if (s.includes('google')) return 'google'
  if (s.includes('referral') || s.includes('referido')) return 'referral'
  if (s.includes('sphere') || s.includes('repeat')) return 'sphere'
  if (s.includes('walk') && s.includes('in')) return 'walk-in'
  if (s.includes('cbi') && (s.includes('web') || s.includes('site'))) return 'cbi-web'
  if (s.includes('zillow')) return 'zillow'

  return s
}

/**
 * Lee el primer email primario de una persona FUB, o el primero disponible.
 */
export function pickPrimaryEmail(
  emails?: Array<{ value: string; isPrimary?: boolean }>
): string | null {
  if (!emails || !emails.length) return null
  const primary = emails.find((e) => e.isPrimary)
  return normalizeEmail((primary || emails[0]).value)
}

export function pickPrimaryPhone(
  phones?: Array<{ value: string; isPrimary?: boolean }>
): string | null {
  if (!phones || !phones.length) return null
  const primary = phones.find((p) => p.isPrimary)
  return (primary || phones[0]).value?.trim() || null
}

/**
 * Convierte ISO 8601 FUB → timestamptz (string) o null.
 * FUB siempre devuelve UTC.
 */
export function toTimestamptz(iso?: string | null): string | null {
  if (!iso) return null
  const trimmed = iso.trim()
  if (!trimmed) return null
  // Validación liviana, sin throw
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * Convierte un precio FUB (number EUR/USD) a céntimos bigint.
 */
export function toCents(price?: number | string | null): number | null {
  if (price === null || price === undefined || price === '') return null
  const n = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(n)) return null
  return Math.round(n * 100)
}
