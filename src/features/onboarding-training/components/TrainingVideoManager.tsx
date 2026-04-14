'use client'

import { useEffect, useState, useTransition } from 'react'
import { PHASE_COLORS, TRAINING_VIDEOS } from '../data/constants'
import { deleteWeekVideo, getWeekVideos, saveWeekVideo } from '../actions'

const WEEK_LABELS = [
  'Week 1 — Prospecting Start', 'Week 2 — Prospecting Intensity', 'Week 3 — First Appointment',
  'Week 4 — Getting Signatures', 'Week 5 — Buyer Leads', 'Week 6 — First Viewings',
  'Week 7 — Pipeline Management', 'Week 8 — Urgency & Offers', 'Week 9 — Viewing Volume',
  'Week 10 — Negotiation', 'Week 11 — Closing', 'Week 12 — Graduation',
]

export function TrainingVideoManager({ onClose }: { onClose: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      setUrls(await getWeekVideos())
    })()
  }, [])

  const saveUrl = (videoId: string) => {
    const url = (inputs[videoId] ?? '').trim()
    if (!url) return
    setSaving(videoId); setSuccess('')
    start(async () => {
      await saveWeekVideo(videoId, url)
      setUrls(p => ({ ...p, [videoId]: url }))
      setEditing(p => ({ ...p, [videoId]: false }))
      setInputs(p => ({ ...p, [videoId]: '' }))
      setSuccess('Video saved')
      setSaving(null)
      setTimeout(() => setSuccess(''), 2000)
    })
  }

  const removeUrl = (videoId: string) => {
    start(async () => {
      await deleteWeekVideo(videoId)
      setUrls(p => { const n = { ...p }; delete n[videoId]; return n })
    })
  }

  const totalAdded = Object.keys(urls).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,8,10,0.97)', zIndex: 100, overflowY: 'auto', padding: '20px' }}>
      <div style={{ maxWidth: 750, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#D4A853', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>Training Videos</div>
            <div style={{ fontSize: 22, color: '#EEE5D5', fontWeight: 800 }}>Agent Weekly Videos</div>
            <div style={{ fontSize: 12, color: '#3A3040', marginTop: 4 }}>{totalAdded}/24 videos added</div>
          </div>
          <button onClick={onClose} style={{ background: '#1A1820', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Close</button>
        </div>

        {success && <div style={{ background: '#0A1A10', border: '1px solid #205A30', borderRadius: 10, padding: '10px 14px', color: '#6BAE94', fontSize: 13, marginBottom: 16 }}>{success}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 6, background: '#1A1820', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${Math.round((totalAdded / 24) * 100)}%`, background: '#D4A853', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#3A3040' }}>{Math.round((totalAdded / 24) * 100)}%</div>
        </div>

        {Array.from({ length: 12 }, (_, weekIdx) => {
          const weekVideos = TRAINING_VIDEOS.filter(v => v.week === weekIdx)
          const phase = weekIdx < 4 ? 0 : weekIdx < 8 ? 1 : 2
          const ac = PHASE_COLORS[phase]
          const weekAdded = weekVideos.filter(v => urls[v.id]).length

          return (
            <div key={weekIdx} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: ac, fontWeight: 700 }}>{WEEK_LABELS[weekIdx]}</div>
                <div style={{ fontSize: 11, color: weekAdded === 2 ? '#6BAE94' : '#3A3040' }}>
                  {weekAdded === 2 ? '✓ Both added' : `${weekAdded}/2 added`}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weekVideos.map(v => {
                  const hasUrl = !!urls[v.id]
                  const isEditing = !!editing[v.id]
                  const isSaving = saving === v.id

                  return (
                    <div key={v.id} style={{ background: '#0D0C10', border: `1px solid ${hasUrl ? '#6BAE9430' : '#1A1820'}`, borderRadius: 14, padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: hasUrl ? '#6BAE9420' : `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <span style={{ fontSize: 14 }}>{hasUrl ? '✓' : '🎬'}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 600 }}>{v.title}</div>
                          <div style={{ fontSize: 12, color: '#4A4050', marginTop: 4, lineHeight: 1.5 }}>{v.topic}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {hasUrl && !isEditing && (
                            <>
                              <a href={urls[v.id]} target="_blank" rel="noopener noreferrer" style={{ background: '#6BAE9420', border: '1px solid #6BAE9440', color: '#6BAE94', borderRadius: 8, padding: '6px 10px', fontSize: 11, textDecoration: 'none', cursor: 'pointer' }}>Watch</a>
                              <button onClick={() => removeUrl(v.id)} style={{ background: 'transparent', border: '1px solid #3A1A1A', color: '#E07B6A', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                            </>
                          )}
                          {!isEditing && (
                            <button onClick={() => { setEditing(p => ({ ...p, [v.id]: true })); setInputs(p => ({ ...p, [v.id]: urls[v.id] ?? '' })) }} style={{ background: hasUrl ? '#2A2430' : ac, color: hasUrl ? '#6A6070' : '#09080A', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              {hasUrl ? 'Change' : 'Add Loom Link'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                          <input
                            value={inputs[v.id] ?? ''}
                            onChange={e => setInputs(p => ({ ...p, [v.id]: e.target.value }))}
                            placeholder="Paste Loom link (https://www.loom.com/share/...)"
                            autoFocus
                            style={{ flex: 1, background: '#100F14', border: '1px solid #2A2430', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EEE5D5', outline: 'none' }}
                          />
                          <button onClick={() => saveUrl(v.id)} disabled={isSaving || !(inputs[v.id] ?? '').trim()} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                            {isSaving ? '...' : 'Save'}
                          </button>
                          <button onClick={() => setEditing(p => ({ ...p, [v.id]: false }))} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
