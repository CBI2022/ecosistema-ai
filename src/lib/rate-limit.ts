// Rate limiter en memoria — suficiente para el volumen actual.
// Para escalar a múltiples instancias de Vercel, migrar a Upstash Redis.

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, retryAfter: 0 }
}

// GC simple: limpia buckets expirados cada minuto
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, b] of buckets.entries()) {
      if (now > b.resetAt) buckets.delete(key)
    }
  }, 60_000).unref?.()
}

// Helper para webhooks: limita por IP + ruta
export function webhookRateLimit(request: Request, routeName: string) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return rateLimit({ key: `${routeName}:${ip}`, limit: 30, windowMs: 60_000 })
}
