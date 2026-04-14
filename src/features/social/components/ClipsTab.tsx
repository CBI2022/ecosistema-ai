'use client'

import { useState, useTransition } from 'react'
import { schedulePost, archiveClip } from '@/actions/social'
import type { Clip, SocialAccount, SocialPlatform } from '@/types/database'

interface Props {
  clips: Array<Clip & { video_sources?: { title: string | null; thumbnail_url: string | null } | null }>
  accounts: SocialAccount[]
}

const PLATFORMS: Array<{ id: SocialPlatform; label: string; emoji: string; color: string }> = [
  { id: 'instagram', label: 'Instagram', emoji: '📷', color: '#E1306C' },
  { id: 'youtube', label: 'YouTube Shorts', emoji: '▶️', color: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', color: '#69C9D0' },
]

type FilterStatus = 'all' | 'available' | 'scheduled' | 'published'

export function ClipsTab({ clips: initialClips, accounts }: Props) {
  const [clips, setClips] = useState(initialClips)
  const [filter, setFilter] = useState<FilterStatus>('available')
  const [selected, setSelected] = useState<typeof initialClips[number] | null>(null)

  const connectedPlatforms = new Set(accounts.filter((a) => a.is_active).map((a) => a.platform))

  const filtered = filter === 'all' ? clips : clips.filter((c) => c.status === filter)

  function removeClip(id: string) {
    setClips((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['available', 'scheduled', 'published', 'all'] as FilterStatus[]).map((f) => {
          const count = f === 'all' ? clips.length : clips.filter((c) => c.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${
                filter === f ? 'bg-[#C9A84C] text-black' : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              {f === 'available' ? 'Disponibles' : f === 'scheduled' ? 'Programados' : f === 'published' ? 'Publicados' : 'Todos'}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === f ? 'bg-black/20' : 'bg-white/10'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">🎬</div>
          <p className="text-sm font-semibold text-[#9A9080]">No hay clips en esta categoría</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((clip) => (
            <div
              key={clip.id}
              className="group overflow-hidden rounded-2xl border border-white/8 bg-[#131313] transition hover:border-[#C9A84C]/40"
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-[#0A0A0A]">
                {clip.thumbnail_url ? (
                  <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl opacity-30">🎬</div>
                )}
                {clip.duration_seconds && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {clip.duration_seconds}s
                  </span>
                )}
                {clip.virality_score !== null && clip.virality_score !== undefined && (
                  <span className="absolute left-2 top-2 rounded bg-[#C9A84C] px-2 py-0.5 text-[10px] font-bold text-black">
                    🔥 {clip.virality_score.toFixed(1)}
                  </span>
                )}
                {clip.status !== 'available' && (
                  <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    clip.status === 'scheduled' ? 'bg-[#C9A84C]/90 text-black' :
                    clip.status === 'published' ? 'bg-[#2ECC9A]/90 text-black' : 'bg-white/20 text-white'
                  }`}>
                    {clip.status}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-semibold text-[#F5F0E8]">
                  {clip.title || 'Sin título'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setSelected(clip)}
                    disabled={clip.status === 'published'}
                    className="flex-1 rounded-lg bg-[#C9A84C] px-3 py-1.5 text-[10px] font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-40"
                  >
                    📅 Programar
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('¿Archivar este clip?')) return
                      removeClip(clip.id)
                      await archiveClip(clip.id)
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-[#9A9080] transition hover:text-[#F5F0E8]"
                    title="Archivar"
                  >
                    🗄
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule modal */}
      {selected && (
        <ScheduleModal
          clip={selected}
          connected={connectedPlatforms}
          onClose={() => setSelected(null)}
          onScheduled={() => {
            setClips((prev) => prev.map((c) => c.id === selected.id ? { ...c, status: 'scheduled' as const } : c))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function ScheduleModal({
  clip,
  connected,
  onClose,
  onScheduled,
}: {
  clip: Clip & { video_sources?: { title: string | null; thumbnail_url: string | null } | null }
  connected: Set<SocialPlatform>
  onClose: () => void
  onScheduled: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('#realestate #costablanca #luxury')
  const [platforms, setPlatforms] = useState<Set<SocialPlatform>>(new Set())
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const defaultDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  const [dateTime, setDateTime] = useState(defaultDate)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  async function handleSubmit() {
    setError(null)
    if (platforms.size === 0) {
      setError('Selecciona al menos una red social')
      return
    }
    if (!caption.trim()) {
      setError('Añade un caption')
      return
    }

    const fd = new FormData()
    fd.append('clip_id', clip.id)
    fd.append('caption', caption)
    fd.append('hashtags', hashtags)
    fd.append('scheduled_for', scheduleMode === 'now' ? new Date().toISOString() : new Date(dateTime).toISOString())
    platforms.forEach((p) => fd.append('platforms', p))

    startTransition(async () => {
      const res = await schedulePost(fd)
      if (res?.error) setError(res.error)
      else onScheduled()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#C9A84C]/25 bg-[#131313] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <p className="text-base font-bold text-[#F5F0E8]">📅 Programar publicación</p>
          <button onClick={onClose} className="text-[#9A9080] hover:text-[#F5F0E8]">✕</button>
        </div>

        <div className="grid max-h-[80vh] gap-5 overflow-y-auto p-5 sm:grid-cols-[220px_1fr]">
          {/* Preview */}
          <div>
            <div className="aspect-[9/16] overflow-hidden rounded-xl border border-white/8 bg-[#0A0A0A]">
              {clip.thumbnail_url && <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <p className="mt-2 text-xs font-semibold text-[#F5F0E8]">{clip.title}</p>
            <p className="mt-1 text-[10px] text-[#9A9080]">
              {clip.duration_seconds}s · Score {clip.virality_score?.toFixed(1) || '—'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Platforms */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                Redes sociales
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const active = platforms.has(p.id)
                  const isConnected = connected.has(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`relative rounded-xl border px-3 py-3 text-xs font-bold transition ${
                        active ? 'text-white' : 'border-white/10 bg-[#1C1C1C] text-[#9A9080] hover:text-[#F5F0E8]'
                      }`}
                      style={{
                        borderColor: active ? p.color : undefined,
                        background: active ? `${p.color}20` : undefined,
                      }}
                    >
                      <div className="text-xl">{p.emoji}</div>
                      <div>{p.label}</div>
                      {!isConnected && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                          !
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {[...platforms].some((p) => !connected.has(p)) && (
                <p className="mt-2 text-[10px] text-orange-400">
                  ⚠️ Alguna red seleccionada no está conectada. Ve a "Connections".
                </p>
              )}
            </div>

            {/* Caption */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                Caption
              </p>
              <textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escribe el texto de la publicación..."
                className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
              />
              <p className="mt-1 text-[10px] text-[#9A9080]">{caption.length} / 2200 caracteres</p>
            </div>

            {/* Hashtags */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                Hashtags
              </p>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
              />
            </div>

            {/* Schedule */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                Cuándo publicar
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode('now')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    scheduleMode === 'now' ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]' : 'border-white/10 text-[#9A9080]'
                  }`}
                >
                  🚀 Ahora
                </button>
                <button
                  onClick={() => setScheduleMode('later')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    scheduleMode === 'later' ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]' : 'border-white/10 text-[#9A9080]'
                  }`}
                >
                  📅 Programar
                </button>
              </div>
              {scheduleMode === 'later' && (
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={defaultDate}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                />
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full rounded-xl bg-[#C9A84C] py-3 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
            >
              {isPending ? 'Programando...' : scheduleMode === 'now' ? '🚀 Publicar ahora' : '📅 Añadir a la cola'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
