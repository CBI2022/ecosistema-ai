'use client'

import { useState, useTransition } from 'react'
import { cancelScheduledPost, publishNow } from '@/actions/social'
import type { ScheduledPost, SocialPlatform } from '@/types/database'

interface Props {
  posts: Array<ScheduledPost & { clips?: { title: string | null; thumbnail_url: string | null; preview_url: string | null } | null }>
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  tiktok: '#69C9D0',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  queued: { bg: 'bg-[#C9A84C]/15', text: 'text-[#C9A84C]', label: 'En cola' },
  publishing: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Publicando' },
  published: { bg: 'bg-[#2ECC9A]/15', text: 'text-[#2ECC9A]', label: 'Publicado' },
  failed: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Fallido' },
  cancelled: { bg: 'bg-white/10', text: 'text-[#9A9080]', label: 'Cancelado' },
}

export function ScheduleTab({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState<string>('active')

  const active = posts.filter((p) => p.status === 'queued' || p.status === 'publishing')
  const history = posts.filter((p) => p.status === 'published' || p.status === 'failed' || p.status === 'cancelled')
  const shown = filter === 'active' ? active : filter === 'history' ? history : posts

  function updatePost(id: string, patch: Partial<ScheduledPost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function handleCancel(postId: string) {
    if (!window.confirm('¿Cancelar esta publicación programada?')) return
    updatePost(postId, { status: 'cancelled' })
    startTransition(async () => { await cancelScheduledPost(postId) })
  }

  function handlePublishNow(postId: string) {
    if (!window.confirm('¿Publicar ahora en todas las redes seleccionadas?')) return
    updatePost(postId, { status: 'publishing' })
    startTransition(async () => {
      const res = await publishNow(postId)
      if (res?.success) {
        updatePost(postId, { status: 'published' })
      } else {
        updatePost(postId, { status: 'failed', error_message: res?.errors?.join(' · ') || 'Error' })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'active', label: 'Activos', count: active.length },
          { id: 'history', label: 'Historial', count: history.length },
          { id: 'all', label: 'Todos', count: posts.length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              filter === f.id ? 'bg-[#C9A84C] text-black' : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === f.id ? 'bg-black/20' : 'bg-white/10'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">📅</div>
          <p className="text-sm font-semibold text-[#9A9080]">No hay publicaciones en esta vista</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((post) => {
            const status = STATUS_COLORS[post.status]
            return (
              <div
                key={post.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-[#131313] p-4"
              >
                {/* Thumbnail */}
                {post.clips?.thumbnail_url && (
                  <img
                    src={post.clips.thumbnail_url}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-[#F5F0E8]">
                      {post.clips?.title || 'Clip'}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-[#9A9080]">{post.caption}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#9A9080]">
                    <span>📅 {new Date(post.scheduled_for).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    <div className="flex gap-1">
                      {post.platforms.map((p) => (
                        <span
                          key={p}
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                          style={{ background: PLATFORM_COLORS[p as SocialPlatform] || '#9A9080' }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {post.error_message && (
                    <p className="mt-1 text-[10px] text-red-400">⚠ {post.error_message}</p>
                  )}
                  {post.published_urls && Object.keys(post.published_urls).length > 0 && (
                    <div className="mt-1 flex gap-2 text-[10px]">
                      {Object.entries(post.published_urls).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C9A84C] hover:underline"
                        >
                          🔗 {platform}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {post.status === 'queued' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="rounded-lg bg-[#2ECC9A]/15 px-3 py-1.5 text-xs font-bold text-[#2ECC9A] transition hover:bg-[#2ECC9A]/25"
                    >
                      🚀 Publicar ya
                    </button>
                    <button
                      onClick={() => handleCancel(post.id)}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
