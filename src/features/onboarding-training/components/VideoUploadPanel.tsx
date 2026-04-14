'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CORE_VIDEOS, type CoreVideoId } from '../data/constants'
import { getCoreVideos, saveCoreVideoLoom, uploadCoreVideo } from '../actions'

type VideoInfo = { kind: 'storage' | 'loom'; url: string } | null

export function VideoUploadPanel() {
  const [videos, setVideos] = useState<Record<string, VideoInfo>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loomInputs, setLoomInputs] = useState<Record<string, string>>({})
  const [showLoom, setShowLoom] = useState<Record<string, boolean>>({})
  const [, start] = useTransition()
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const refresh = () => { getCoreVideos().then(v => setVideos(v as Record<string, VideoInfo>)) }
  useEffect(() => { refresh() }, [])

  const handleUpload = (id: CoreVideoId, file: File) => {
    setError(''); setSuccess(''); setUploading(id)
    const fd = new FormData()
    fd.append('file', file)
    start(async () => {
      try {
        await uploadCoreVideo(id, fd)
        setSuccess(`${CORE_VIDEOS.find(v => v.id === id)!.title} uploaded successfully`)
        refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      }
      setUploading(null)
    })
  }

  const saveLoom = (id: CoreVideoId) => {
    const url = (loomInputs[id] ?? '').trim()
    if (!url) return
    setError(''); setSuccess(''); setUploading(id)
    start(async () => {
      try {
        await saveCoreVideoLoom(id, url)
        setSuccess(`${CORE_VIDEOS.find(v => v.id === id)!.title} — Loom link saved`)
        setShowLoom(p => ({ ...p, [id]: false }))
        setLoomInputs(p => ({ ...p, [id]: '' }))
        refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
      setUploading(null)
    })
  }

  return (
    <div>
      {error && <div style={{ background: '#1A0A0A', border: '1px solid #5A2020', borderRadius: 10, padding: '10px 14px', color: '#E07B6A', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ background: '#0A1A10', border: '1px solid #205A30', borderRadius: 10, padding: '10px 14px', color: '#6BAE94', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CORE_VIDEOS.map(v => {
          const info = videos[v.id]
          const hasUrl = !!info
          const isUploading = uploading === v.id
          const isLoom = info?.kind === 'loom'

          return (
            <div key={v.id} style={{ background: '#0D0C10', border: `1px solid ${hasUrl ? '#6BAE9430' : '#1A1820'}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#3A3040', fontWeight: 700 }}>{v.id.toUpperCase()}</span>
                    <span style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 600 }}>{v.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#3A3040' }}>{v.duration}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {hasUrl ? (
                    <>
                      <div style={{ fontSize: 12, color: '#6BAE94', fontWeight: 600 }}>{isLoom ? '✓ Loom' : '✓ Uploaded'}</div>
                      <a href={info!.url} target="_blank" rel="noopener noreferrer" style={{ background: '#6BAE9420', border: '1px solid #6BAE9440', color: '#6BAE94', borderRadius: 8, padding: '6px 12px', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>Watch</a>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#D4A853' }}>Not added</div>
                  )}

                  <button onClick={() => setShowLoom(p => ({ ...p, [v.id]: !p[v.id] }))} style={{ background: '#9B7EC820', border: '1px solid #9B7EC840', color: '#9B7EC8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Loom Link</button>

                  <input
                    ref={el => { fileRefs.current[v.id] = el }}
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(v.id, f); e.target.value = '' }}
                  />
                  <button
                    onClick={() => fileRefs.current[v.id]?.click()}
                    disabled={isUploading}
                    style={{
                      background: isUploading ? '#1A1820' : (hasUrl ? '#2A2430' : '#D4A853'),
                      color: isUploading ? '#3A3040' : (hasUrl ? '#6A6070' : '#09080A'),
                      border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                      cursor: isUploading ? 'default' : 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {isUploading ? 'Saving...' : (hasUrl ? 'Replace File' : 'Upload File')}
                  </button>
                </div>
              </div>

              {showLoom[v.id] && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input
                    value={loomInputs[v.id] ?? ''}
                    onChange={e => setLoomInputs(p => ({ ...p, [v.id]: e.target.value }))}
                    placeholder="Paste Loom link here (e.g. https://www.loom.com/share/...)"
                    style={{ flex: 1, background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EEE5D5', outline: 'none' }}
                  />
                  <button onClick={() => saveLoom(v.id)} disabled={isUploading || !(loomInputs[v.id] ?? '').trim()} style={{ background: '#9B7EC8', color: '#09080A', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Save</button>
                </div>
              )}

              <div style={{ fontSize: 12, color: '#4A4050', marginTop: 8, lineHeight: 1.6 }}>📽 {v.brief}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
