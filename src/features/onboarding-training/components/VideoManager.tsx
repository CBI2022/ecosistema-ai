'use client'

import { useEffect, useState, useTransition } from 'react'
import { TRAINING_VIDEOS } from '../data/constants'
import { deleteWeekVideo, getWeekVideos, saveWeekVideo } from '../actions'

export function VideoManager() {
  const [videos, setVideos] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [, start] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const v = await getWeekVideos()
      setVideos(v)
      setLoading(false)
    })()
  }, [])

  const save = (id: string) => {
    const url = draft[id]?.trim()
    if (!url) return
    start(async () => {
      await saveWeekVideo(id, url)
      setVideos(v => ({ ...v, [id]: url }))
      setDraft(d => ({ ...d, [id]: '' }))
    })
  }

  const remove = (id: string) => {
    start(async () => {
      await deleteWeekVideo(id)
      setVideos(v => {
        const n = { ...v }
        delete n[id]
        return n
      })
    })
  }

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading…</div>

  const byWeek: Record<number, typeof TRAINING_VIDEOS> = {}
  for (const v of TRAINING_VIDEOS) {
    byWeek[v.week] ??= []
    byWeek[v.week].push(v)
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byWeek).map(([wk, list]) => (
        <div key={wk}>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Week {Number(wk) + 1}</div>
          <div className="flex flex-col gap-2">
            {list.map(tv => (
              <div key={tv.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-1 text-sm font-semibold text-[var(--text)]">{tv.title}</div>
                <div className="mb-3 text-xs text-[var(--text-muted)]">{tv.topic}</div>
                {videos[tv.id] ? (
                  <div className="flex items-center gap-2">
                    <a href={videos[tv.id]} target="_blank" rel="noreferrer" className="flex-1 truncate text-xs text-[var(--gold)] underline">
                      {videos[tv.id]}
                    </a>
                    <button onClick={() => remove(tv.id)} className="rounded border border-red-500/40 px-3 py-1 text-xs text-red-400">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft[tv.id] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, [tv.id]: e.target.value }))}
                      placeholder="https://loom.com/share/…"
                      className="flex-1 rounded border border-[var(--border)] bg-black/40 px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--gold)]"
                    />
                    <button onClick={() => save(tv.id)} className="rounded bg-[var(--gold)] px-4 py-2 text-xs font-bold text-black">
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
