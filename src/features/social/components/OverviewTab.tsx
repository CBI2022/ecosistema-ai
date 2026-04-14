'use client'

import { useState } from 'react'
import type { Clip, SocialAccount, PlatformMetrics, VideoSource, SocialPlatform } from '@/types/database'

interface Props {
  metrics: PlatformMetrics[]
  clips: Array<Clip & { video_sources?: { title: string | null; thumbnail_url: string | null } | null }>
  accounts: SocialAccount[]
  recentVideos: VideoSource[]
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  tiktok: '#69C9D0',
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

export function OverviewTab({ metrics, clips, accounts, recentVideos }: Props) {
  const [selected, setSelected] = useState<'all' | SocialPlatform>('all')

  const platforms: SocialPlatform[] = ['instagram', 'youtube', 'tiktok']

  // Últimos datos por plataforma
  const latestByPlatform = new Map<SocialPlatform, PlatformMetrics>()
  for (const m of metrics) {
    const existing = latestByPlatform.get(m.platform)
    if (!existing || m.snapshot_date > existing.snapshot_date) latestByPlatform.set(m.platform, m)
  }

  const aggregated = platforms.reduce(
    (acc, p) => {
      const m = latestByPlatform.get(p)
      if (!m) return acc
      acc.followers += m.followers
      acc.views += m.views
      acc.likes += m.likes
      acc.comments += m.comments
      acc.shares += m.shares
      return acc
    },
    { followers: 0, views: 0, likes: 0, comments: 0, shares: 0 }
  )

  const displayMetrics =
    selected === 'all'
      ? aggregated
      : latestByPlatform.get(selected) ?? { followers: 0, views: 0, likes: 0, comments: 0, shares: 0 }

  const stats = [
    { label: 'Seguidores', value: fmt(displayMetrics.followers), emoji: '👥', color: '#C9A84C' },
    { label: 'Views últimos 7d', value: fmt(displayMetrics.views), emoji: '👁', color: '#2ECC9A' },
    { label: 'Likes', value: fmt(displayMetrics.likes), emoji: '❤️', color: '#E1306C' },
    { label: 'Comentarios', value: fmt(displayMetrics.comments), emoji: '💬', color: '#8B5CF6' },
    { label: 'Compartidos', value: fmt(displayMetrics.shares), emoji: '🔁', color: '#06B6D4' },
  ]

  const topClips = clips.filter((c) => c.virality_score !== null).slice(0, 3)
  const connectedPlatforms = accounts.filter((a) => a.is_active).map((a) => a.platform)

  return (
    <div className="space-y-5">
      {/* Platform selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelected('all')}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${
            selected === 'all' ? 'bg-[#C9A84C] text-black' : 'border border-white/10 bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]'
          }`}
        >
          🌐 Todas
        </button>
        {platforms.map((p) => {
          const active = selected === p
          const connected = connectedPlatforms.includes(p)
          return (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                active ? 'text-black' : 'border border-white/10 bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
              style={{
                background: active ? PLATFORM_COLORS[p] : undefined,
              }}
            >
              {PLATFORM_LABELS[p]}
              {!connected && <span className="text-[9px] opacity-60">(no conectada)</span>}
            </button>
          )
        })}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/8 bg-[#131313] p-4"
            style={{ borderTop: `2px solid ${s.color}` }}
          >
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
              {s.emoji} {s.label}
            </p>
            <p className="font-['Maharlika',serif] text-3xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top clips */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            🔥 Top clips por viralidad
          </p>
          {topClips.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9A9080]/60">No hay clips disponibles</p>
          ) : (
            <div className="space-y-3">
              {topClips.map((clip, idx) => (
                <div key={clip.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-[#1C1C1C] p-3">
                  <span className="text-2xl font-bold" style={{ color: idx === 0 ? '#C9A84C' : idx === 1 ? '#9A9090' : '#C97A3A' }}>
                    {idx + 1}
                  </span>
                  {clip.thumbnail_url && (
                    <img src={clip.thumbnail_url} alt="" className="h-14 w-10 rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F5F0E8]">{clip.title || 'Clip'}</p>
                    <p className="text-[10px] text-[#9A9080]">
                      {clip.duration_seconds}s · Score {clip.virality_score?.toFixed(1)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      clip.status === 'available'
                        ? 'bg-[#2ECC9A]/15 text-[#2ECC9A]'
                        : clip.status === 'scheduled'
                          ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                          : 'bg-white/10 text-[#9A9080]'
                    }`}
                  >
                    {clip.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent videos */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📺 Vídeos fuente recientes
          </p>
          {recentVideos.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9A9080]/60">Sin vídeos todavía</p>
          ) : (
            <div className="space-y-3">
              {recentVideos.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-[#1C1C1C] p-3">
                  {v.thumbnail_url && (
                    <img src={v.thumbnail_url} alt="" className="h-14 w-24 rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F5F0E8]">{v.title || 'Sin título'}</p>
                    <p className="text-[10px] text-[#9A9080]">
                      {v.source} · {v.published_at ? new Date(v.published_at).toLocaleDateString('es-ES') : '—'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      v.opus_status === 'done'
                        ? 'bg-[#2ECC9A]/15 text-[#2ECC9A]'
                        : v.opus_status === 'processing'
                          ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                          : v.opus_status === 'error'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-white/10 text-[#9A9080]'
                    }`}
                  >
                    Opus: {v.opus_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
