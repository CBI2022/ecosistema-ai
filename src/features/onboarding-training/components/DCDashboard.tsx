'use client'

import { useEffect, useState, useTransition } from 'react'
import { DC_WEEKS, PHASE_COLORS, PHASE_LABELS, TRAINING_VIDEOS } from '../data/constants'
import {
  getAgentOverview,
  getDcProgress,
  getWeekVideos,
  toggleDcTask,
} from '../actions'
import { AgentProfileView } from './AgentProfileView'
import { DCMorningPrompt } from './DCMorningPrompt'
import { TeamDashboard } from './TeamDashboard'
import { TrainingVideoManager } from './TrainingVideoManager'

interface AgentOverview {
  id: string
  name: string
  email: string
  created_at: string
  committed: boolean
  current_week: number
  completed_tasks: number
  total_checkins: number
  completed_checkins: number
  last_checkin: { date: string; evening_done: boolean | null; morning_answer: string | null } | null
  week_progress: Record<number, { done: number; total: number }>
}

export function DCDashboard({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const [loading, setLoading] = useState(true)
  const [wi, setWi] = useState(0)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'tasks' | 'videos'>('tasks')
  const [showPrompt, setShowPrompt] = useState(false)
  const [agentOverview, setAgentOverview] = useState<AgentOverview[]>([])
  const [viewingAgentId, setViewingAgentId] = useState<string | null>(null)
  const [showTeamDashboard, setShowTeamDashboard] = useState(false)
  const [showTrainingVideos, setShowTrainingVideos] = useState(false)
  const [trainingUrls, setTrainingUrls] = useState<Record<string, string>>({})
  const [, start] = useTransition()

  const reloadTraining = () => { getWeekVideos().then(setTrainingUrls) }

  useEffect(() => {
    ;(async () => {
      const [prog, overview, vids] = await Promise.all([getDcProgress(), getAgentOverview(), getWeekVideos()])
      setDone(prog)
      setAgentOverview(overview as AgentOverview[])
      setTrainingUrls(vids)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6BAE94', fontSize: 14 }}>Loading...</div>

  const week = DC_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const totalTasks = DC_WEEKS.flatMap(w => w.tasks).length
  const doneCt = Object.values(done).filter(Boolean).length
  const pct = Math.round((doneCt / totalTasks) * 100)
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length
  const wkPct = Math.round((wkDone / week.tasks.length) * 100)
  const allDone = wkDone === week.tasks.length
  const wkTraining = TRAINING_VIDEOS.filter(v => v.week === wi && trainingUrls[v.id])
  const tabs = ['tasks', ...(wkTraining.length > 0 ? ['videos'] : [])] as const

  const toggle = (ti: number, val: boolean) => {
    const key = `${wi}-${ti}`
    setDone(p => ({ ...p, [key]: val }))
    start(() => { void toggleDcTask(wi, ti, val) })
  }

  if (showTeamDashboard) return <TeamDashboard onBack={() => setShowTeamDashboard(false)} />

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8', display: 'flex', flexDirection: 'column' }}>
      {showTrainingVideos && <TrainingVideoManager onClose={() => { setShowTrainingVideos(false); reloadTraining() }} />}
      {showPrompt && <DCMorningPrompt onClose={() => setShowPrompt(false)} />}
      {viewingAgentId && <AgentProfileView agentId={viewingAgentId} onClose={() => setViewingAgentId(null)} />}

      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 700 }}>{isAdmin ? '🏡' : '👩‍💼'} {userName}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: '#3A3040' }}>{pct}% done</div>
          <button onClick={() => setShowTrainingVideos(true)} style={{ background: '#E07B6A', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🎬 Training Videos</button>
          <button onClick={() => setShowTeamDashboard(true)} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📊 Team</button>
          <button onClick={() => setShowPrompt(true)} style={{ background: '#6BAE94', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🌅 My Focus</button>
        </div>
      </div>

      <div style={{ height: 3, background: '#191714' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6BAE94,#EEE5D5)', transition: 'width 0.5s' }} />
      </div>

      <div style={{ background: '#0A090D', borderBottom: '1px solid #1A1820', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {DC_WEEKS.map((w, i) => {
          const wd = w.tasks.filter((_, ti) => done[`${i}-${ti}`]).length
          return (
            <button key={i} onClick={() => { setWi(i); setTab('tasks') }} style={{ background: 'transparent', border: 'none', borderBottom: `3px solid ${i === wi ? PHASE_COLORS[w.phase] : 'transparent'}`, padding: '10px 13px', cursor: 'pointer', color: i === wi ? PHASE_COLORS[w.phase] : '#2A2430', fontSize: 11, fontWeight: i === wi ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
              Wk {w.week}{wd === w.tasks.length && <span style={{ marginLeft: 3, color: '#6BAE94' }}>✓</span>}
            </button>
          )
        })}
      </div>

      <div key={wi} style={{ flex: 1, overflowY: 'auto', padding: '22px 18px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ac, textTransform: 'uppercase', marginBottom: 8 }}>{PHASE_LABELS[week.phase]} · {week.days}</div>

        <div style={{ background: `${ac}12`, border: `1.5px solid ${ac}35`, borderRadius: 16, padding: '20px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 8 }}>Your Focus This Week</div>
          <div style={{ fontSize: 19, color: '#EEE5D5', lineHeight: 1.4, fontWeight: 700 }}>{week.action}</div>
        </div>

        {agentOverview.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#3A3040', textTransform: 'uppercase', marginBottom: 12 }}>Agent Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {agentOverview.map(agent => (
                <div key={agent.id} onClick={() => setViewingAgentId(agent.id)} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 600, marginBottom: 6 }}>{agent.name} <span style={{ fontSize: 10, color: '#3A3040' }}>→ View</span></div>
                  <div style={{ fontSize: 11, color: '#3A3040', marginBottom: 2 }}>Week {agent.current_week + 1} · {agent.completed_tasks} tasks done</div>
                  <div style={{ fontSize: 11, color: agent.committed ? '#6BAE94' : '#D4A853' }}>{agent.committed ? '✓ Committed' : '⏳ Not yet committed'}</div>
                  {agent.last_checkin && <div style={{ fontSize: 10, color: '#2A2430', marginTop: 4 }}>Last check-in: {agent.last_checkin.date}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t as typeof tab)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? ac : 'transparent'}`, color: tab === t ? ac : '#3A3040', padding: '7px 14px', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', transition: 'all 0.15s', marginBottom: -1 }}>{t}</button>
          ))}
        </div>

        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {week.tasks.map((task, ti) => {
                const isDone = !!done[`${wi}-${ti}`]
                return (
                  <div key={ti} onClick={() => toggle(ti, !isDone)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', cursor: 'pointer', borderRadius: 14, background: isDone ? '#0E1410' : '#0D0C10', border: `1px solid ${isDone ? '#6BAE9430' : '#1A1820'}`, transition: 'all 0.15s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: `2px solid ${isDone ? '#6BAE94' : '#2A2430'}`, background: isDone ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isDone && <span style={{ color: '#09080A', fontSize: 13, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: isDone ? '#3A4A3A' : '#C8C0B8', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none', flex: 1, transition: 'all 0.2s' }}>{task}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ background: '#0C0B0E', border: `1px solid ${ac}20`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Week Target</div>
              <div style={{ fontSize: 13, color: ac, lineHeight: 1.6 }}>{week.target}</div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${wkPct}%`, background: ac, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
            </div>
          </div>
        )}

        {tab === 'videos' && (
          <div>
            {wkTraining.map(tv => {
              const loomUrl = trainingUrls[tv.id]
              const m = loomUrl?.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
              const embedUrl = m ? `https://www.loom.com/embed/${m[1]}` : null
              return (
                <div key={tv.id} style={{ background: `${ac}0D`, border: `1px solid ${ac}35`, borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>🎓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 500 }}>{tv.title}</div>
                      <div style={{ fontSize: 11, color: ac, marginTop: 2 }}>{tv.topic}</div>
                    </div>
                  </div>
                  {embedUrl ? (
                    <div style={{ marginTop: 12, position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden' }}>
                      <iframe src={embedUrl} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
                    </div>
                  ) : (
                    <a href={loomUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, background: ac, color: '#080807', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>▶ Watch Now</a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {wi > 0 && <button onClick={() => { setWi(wi - 1); setTab('tasks') }} style={{ flex: 1, background: '#0D0C10', border: '1px solid #1A1820', color: '#3A3040', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 13 }}>← Week {DC_WEEKS[wi - 1].week}</button>}
          {wi < DC_WEEKS.length - 1 && (
            <button onClick={() => { setWi(wi + 1); setTab('tasks') }} style={{ flex: 2, background: ac, border: 'none', color: '#09080A', padding: '13px', borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
              {allDone ? `✓ Week done — Week ${DC_WEEKS[wi + 1].week} →` : `Week ${DC_WEEKS[wi + 1].week} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
