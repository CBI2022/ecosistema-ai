'use client'

import { useState } from 'react'
import { CORE_VIDEOS, type CoreVideoId } from '../data/constants'

function getLoomEmbedUrl(url: string | null) {
  if (!url) return null
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (match) return `https://www.loom.com/embed/${match[1]}`
  if (url.match(/loom\.com\/embed\/[a-zA-Z0-9]+/)) return url
  return null
}

export function VideoCard({
  id,
  ac,
  videoInfo,
}: {
  id: CoreVideoId
  ac: string
  videoInfo?: { kind: 'storage' | 'loom'; url: string } | null
}) {
  const v = CORE_VIDEOS.find(cv => cv.id === id)!
  const [open, setOpen] = useState(false)
  const url = videoInfo?.url ?? null
  const ready = !!url
  const loomEmbed = videoInfo?.kind === 'loom' ? getLoomEmbedUrl(url) : null
  const isLoom = !!loomEmbed
  const isStorage = videoInfo?.kind === 'storage'

  return (
    <div onClick={() => setOpen(p => !p)} style={{ cursor: 'pointer', background: ready ? `${ac}0D` : '#0C0B09', border: `1px solid ${ready ? ac + '35' : '#1C1A14'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8, transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>{ready ? '▶️' : '🎬'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: ready ? '#EEE5D5' : '#5A5040', fontWeight: 500 }}>{v.title}</div>
          <div style={{ fontSize: 11, color: ready ? ac : '#4A3820', marginTop: 2 }}>
            {v.duration} · {ready ? (isLoom ? 'Loom video' : 'Ready to watch') : 'Not yet recorded'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#2A2418' }}>{open ? '▴' : '▾'}</div>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${ready ? ac + '20' : '#1C1A14'}` }} onClick={e => e.stopPropagation()}>
          {ready ? (
            isLoom ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden' }}>
                <iframe src={loomEmbed!} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
              </div>
            ) : isStorage ? (
              <video controls src={url!} style={{ width: '100%', borderRadius: 10, background: '#000' }} />
            ) : (
              <a href={url!} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: ac, color: '#080807', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>▶ Watch Now</a>
            )
          ) : (
            <div style={{ fontSize: 13, color: '#6A5A48', lineHeight: 1.75 }}>📽 <strong style={{ color: '#8A6A38' }}>What to film:</strong> {v.brief}</div>
          )}
        </div>
      )}
    </div>
  )
}
