'use client'

import { useState, useTransition } from 'react'
import { connectPlatform, disconnectPlatform } from '@/actions/social'
import type { SocialAccount, SocialPlatform } from '@/types/database'

interface Props {
  accounts: SocialAccount[]
}

const PLATFORMS: Array<{
  id: SocialPlatform
  label: string
  emoji: string
  color: string
  help: string
  docs: string
}> = [
  {
    id: 'instagram',
    label: 'Instagram Business',
    emoji: '📷',
    color: '#E1306C',
    help: 'Necesita una cuenta Business conectada a una página de Facebook. Conecta vía Meta Graph API (long-lived token).',
    docs: 'https://developers.facebook.com/docs/instagram-api',
  },
  {
    id: 'youtube',
    label: 'YouTube Channel',
    emoji: '▶️',
    color: '#FF0000',
    help: 'Canal de YouTube conectado vía YouTube Data API v3 (OAuth). Ideal para Shorts automáticos.',
    docs: 'https://developers.google.com/youtube/v3',
  },
  {
    id: 'tiktok',
    label: 'TikTok Account',
    emoji: '🎵',
    color: '#69C9D0',
    help: 'Necesita aprobación de app en TikTok Developers para usar la Content Posting API.',
    docs: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
]

export function ConnectionsTab({ accounts: initialAccounts }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [adding, setAdding] = useState<SocialPlatform | null>(null)
  const [, startTransition] = useTransition()

  const byPlatform = new Map(accounts.map((a) => [a.platform, a]))

  async function handleConnect(formData: FormData) {
    const res = await connectPlatform(formData)
    if (res?.success) {
      const platform = formData.get('platform') as SocialPlatform
      const handle = formData.get('handle') as string
      setAccounts((prev) => {
        const filtered = prev.filter((a) => a.platform !== platform)
        return [
          ...filtered,
          {
            id: `temp-${platform}`,
            platform,
            account_handle: handle,
            account_id_external: null,
            is_active: true,
            connected_by: null,
            token_expires_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      })
      setAdding(null)
    }
  }

  function handleDisconnect(platform: SocialPlatform) {
    if (!window.confirm(`¿Desconectar ${platform}?`)) return
    setAccounts((prev) => prev.filter((a) => a.platform !== platform))
    startTransition(async () => { await disconnectPlatform(platform) })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
        <p className="text-sm font-bold text-[#F5F0E8]">🔌 Conexiones a redes sociales</p>
        <p className="mt-1 text-xs text-[#9A9080]">
          Cuando conectes cada plataforma con sus credenciales reales (OAuth), las publicaciones se enviarán directamente desde aquí. Por ahora, conectar una cuenta marca la plataforma como disponible para programar posts (el envío real queda pendiente hasta la integración de API).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const account = byPlatform.get(p.id)
          const connected = !!account?.is_active

          return (
            <div
              key={p.id}
              className="rounded-2xl border bg-[#131313] p-5"
              style={{ borderColor: connected ? p.color + '40' : 'rgba(255,255,255,0.08)', borderTopWidth: connected ? 2 : 1, borderTopColor: connected ? p.color : undefined }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#F5F0E8]">{p.label}</p>
                  <p className={`text-xs ${connected ? 'text-[#2ECC9A]' : 'text-[#9A9080]'}`}>
                    {connected ? `✓ Conectada: @${account?.account_handle}` : 'Sin conectar'}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-[#9A9080]">{p.help}</p>
              <a
                href={p.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[10px] text-[#C9A84C] hover:underline"
              >
                📖 Documentación
              </a>

              <div className="mt-4 flex gap-2">
                {!connected ? (
                  <button
                    onClick={() => setAdding(p.id)}
                    className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white transition"
                    style={{ background: p.color }}
                  >
                    Conectar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setAdding(p.id)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDisconnect(p.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
                    >
                      Desconectar
                    </button>
                  </>
                )}
              </div>

              {adding === p.id && (
                <form
                  action={handleConnect}
                  className="mt-4 space-y-2 border-t border-white/8 pt-4"
                >
                  <input type="hidden" name="platform" value={p.id} />
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1">Handle (@usuario)</label>
                    <input
                      name="handle"
                      defaultValue={account?.account_handle || ''}
                      required
                      placeholder="cbi_official"
                      className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1">ID externo (opcional)</label>
                    <input
                      name="external_id"
                      defaultValue={account?.account_id_external || ''}
                      placeholder="ID de cuenta/canal"
                      className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white"
                      style={{ background: p.color }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdding(null)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>

      {/* Webhooks info */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          🔔 Webhooks activos
        </p>
        <div className="space-y-2 text-xs text-[#9A9080]">
          <p>
            <strong className="text-[#F5F0E8]">YouTube:</strong>{' '}
            <code className="rounded bg-[#1C1C1C] px-1.5 py-0.5 text-[11px] text-[#C9A84C]">POST /api/webhooks/youtube</code>
            {' '} — recibe notificaciones de nuevos vídeos vía PubSubHubbub
          </p>
          <p>
            <strong className="text-[#F5F0E8]">Opus Clip:</strong>{' '}
            <code className="rounded bg-[#1C1C1C] px-1.5 py-0.5 text-[11px] text-[#C9A84C]">POST /api/webhooks/opus-clip</code>
            {' '} — recibe clips generados automáticamente
          </p>
        </div>
      </div>
    </div>
  )
}
