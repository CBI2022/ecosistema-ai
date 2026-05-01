import { Resend } from 'resend'

let _client: Resend | null = null

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_client) _client = new Resend(key)
  return _client
}

export const FROM = (() => {
  const name = process.env.RESEND_FROM_NAME ?? 'CBI Performance Dashboard'
  const email = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  return `${name} <${email}>`
})()

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

// Envía un email transaccional. Nunca lanza excepción — devuelve { ok: false } si falla
// o si Resend no está configurado, para que el código que lo llama no se rompa.
export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const c = client()
  if (!c) {
    console.warn('[resend] RESEND_API_KEY no configurada — email no enviado:', args.subject)
    return { ok: false, error: 'RESEND_API_KEY missing' }
  }

  try {
    const { data, error } = await c.emails.send({
      from: FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text ?? args.html.replace(/<[^>]+>/g, ''),
      replyTo: args.replyTo,
    })
    if (error) {
      console.error('[resend] error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[resend] exception:', msg)
    return { ok: false, error: msg }
  }
}
