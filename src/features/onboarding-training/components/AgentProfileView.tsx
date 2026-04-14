'use client'

import { useEffect, useState, useTransition } from 'react'
import { AGENT_WEEKS, DC_AGENT_TASKS, PHASE_COLORS, PHASE_LABELS } from '../data/constants'
import { getAgentProfile, getDcAgentTasks, toggleDcAgentTask } from '../actions'

interface AgentProfileData {
  agent: { id: string; full_name: string | null; email: string; created_at: string; committed: boolean; current_week: number }
  progress: Record<string, boolean>
  checkins: { date: string; morning_answer: string | null; evening_done: boolean | null; evening_note: string | null }[]
}

export function AgentProfileView({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [data, setData] = useState<AgentProfileData | null>(null)
  const [dcTasks, setDcTasks] = useState<Record<string, boolean>>({})
  const [wi, setWi] = useState(0)
  const [profileTab, setProfileTab] = useState<'agent' | 'dc' | 'checkins'>('agent')
  const [, start] = useTransition()

  useEffect(() => {
    ;(async () => {
      const [p, d] = await Promise.all([getAgentProfile(agentId), getDcAgentTasks(agentId)])
      setData(p as AgentProfileData)
      setDcTasks(d)
      setWi(p.agent.current_week ?? 0)
    })()
  }, [agentId])

  if (!data) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,8,10,0.97)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#D4A853', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  const agent = data.agent
  const progress = data.progress
  const checkins = data.checkins
  const name = agent.full_name ?? agent.email
  const totalTasks = AGENT_WEEKS.flatMap(w => w.tasks).length
  const doneCt = Object.values(progress).filter(Boolean).length
  const pct = Math.round((doneCt / totalTasks) * 100)
  const week = AGENT_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const wkDone = week.tasks.filter((_, i) => progress[`${wi}-${i}`]).length

  const toggle = (ti: number, val: boolean) => {
    const key = `${wi}-${ti}`
    setDcTasks(p => ({ ...p, [key]: val }))
    start(() => { void toggleDcAgentTask(agentId, wi, ti, val) })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,8,10,0.97)', zIndex: 100, overflowY: 'auto', padding: '20px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#D4A853', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>Agent Profile</div>
            <div style={{ fontSize: 22, color: '#EEE5D5', fontWeight: 800 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#3A3040', marginTop: 2 }}>{agent.email} · Joined {new Date(agent.created_at).toLocaleDateString()}</div>
          </div>
          <button onClick={onClose} style={{ background: '#1A1820', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Close</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Overall', value: `${pct}%`, color: '#D4A853' },
            { label: 'Tasks Done', value: `${doneCt}/${totalTasks}`, color: '#6BAE94' },
            { label: 'Current Week', value: `Week ${agent.current_week + 1}`, color: '#9B7EC8' },
            { label: 'Committed', value: agent.committed ? 'Yes' : 'No', color: agent.committed ? '#6BAE94' : '#E07B6A' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, color: s.color, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', overflowX: 'auto', gap: 4, marginBottom: 16 }}>
          {AGENT_WEEKS.map((w, i) => {
            const wd = w.tasks.filter((_, ti) => progress[`${i}-${ti}`]).length
            const wTotal = w.tasks.length
            return (
              <button key={i} onClick={() => setWi(i)} style={{ background: i === wi ? `${PHASE_COLORS[w.phase]}20` : '#0D0C10', border: `1px solid ${i === wi ? PHASE_COLORS[w.phase] + '50' : '#1A1820'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: i === wi ? PHASE_COLORS[w.phase] : '#3A3040', fontSize: 11, fontWeight: i === wi ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Wk {w.week} ({wd}/{wTotal})
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 16 }}>
          {([{ id: 'agent', label: 'Agent Tasks' }, { id: 'dc', label: 'My Checklist' }, { id: 'checkins', label: 'Check-ins' }] as const).map(t => (
            <button key={t.id} onClick={() => setProfileTab(t.id)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${profileTab === t.id ? ac : 'transparent'}`, color: profileTab === t.id ? ac : '#3A3040', padding: '7px 14px', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', marginBottom: -1 }}>{t.label}</button>
          ))}
        </div>

        {profileTab === 'agent' && (
          <div style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 16, padding: '18px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 6 }}>{PHASE_LABELS[week.phase]} · {week.days}</div>
            <div style={{ fontSize: 16, color: '#EEE5D5', fontWeight: 700, marginBottom: 14 }}>{week.action}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {week.tasks.map((task, ti) => {
                const isDone = !!progress[`${wi}-${ti}`]
                return (
                  <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: isDone ? '#0E1410' : '#0A090D', border: `1px solid ${isDone ? '#6BAE9425' : '#1A1820'}` }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isDone ? '#6BAE94' : '#2A2430'}`, background: isDone ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isDone && <span style={{ color: '#09080A', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: isDone ? '#4A5A4A' : '#B8B0A8', textDecoration: isDone ? 'line-through' : 'none' }}>{task}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${Math.round((wkDone / week.tasks.length) * 100)}%`, background: ac, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
            </div>
          </div>
        )}

        {profileTab === 'dc' && (
          <div style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 16, padding: '18px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 6 }}>Your tasks with {name} · Week {week.week}</div>
            <div style={{ fontSize: 14, color: '#EEE5D5', fontWeight: 700, marginBottom: 14 }}>{week.dc || 'Support this agent through the week.'}</div>
            {(DC_AGENT_TASKS[wi] ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DC_AGENT_TASKS[wi].map((task, ti) => {
                  const isDone = !!dcTasks[`${wi}-${ti}`]
                  return (
                    <div key={ti} onClick={() => toggle(ti, !isDone)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: isDone ? '#141210' : '#0A090D', border: `1px solid ${isDone ? '#D4A85330' : '#1A1820'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isDone ? '#D4A853' : '#2A2430'}`, background: isDone ? '#D4A853' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {isDone && <span style={{ color: '#09080A', fontSize: 11, fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: isDone ? '#5A4A3A' : '#B8B0A8', textDecoration: isDone ? 'line-through' : 'none', transition: 'all 0.2s' }}>{task}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#3A3040' }}>No specific tasks this week.</div>
            )}
            {DC_AGENT_TASKS[wi] && DC_AGENT_TASKS[wi].length > 0 && (() => {
              const dcWkDone = DC_AGENT_TASKS[wi].filter((_, i) => dcTasks[`${wi}-${i}`]).length
              const dcWkTotal = DC_AGENT_TASKS[wi].length
              return (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.round((dcWkDone / dcWkTotal) * 100)}%`, background: '#D4A853', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#3A3040' }}>{dcWkDone}/{dcWkTotal}</div>
                </div>
              )
            })()}
          </div>
        )}

        {profileTab === 'checkins' && (
          <div>
            {checkins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#3A3040', fontSize: 14 }}>No check-ins yet from this agent.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Total Check-ins', value: checkins.length, color: '#D4A853' },
                    { label: 'Completed', value: checkins.filter(c => c.evening_done).length, color: '#6BAE94' },
                    { label: 'Missed', value: checkins.filter(c => c.evening_done === false).length, color: '#E07B6A' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, color: s.color, fontWeight: 800 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {checkins.map((c, i) => (
                    <div key={i} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 14, padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 700 }}>{c.date}</div>
                        {c.evening_done !== null && (
                          <div style={{ fontSize: 11, color: c.evening_done ? '#6BAE94' : '#E07B6A', fontWeight: 700, background: c.evening_done ? '#6BAE9415' : '#E07B6A15', padding: '3px 10px', borderRadius: 6 }}>
                            {c.evening_done ? '✓ Completed' : '✗ Missed'}
                          </div>
                        )}
                      </div>
                      {c.morning_answer && (
                        <div style={{ background: '#0A090D', border: '1px solid #1A1820', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: '#D4A853', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Morning — One thing to move closer to first sale</div>
                          <div style={{ fontSize: 13, color: '#EEE5D5', lineHeight: 1.6 }}>{c.morning_answer}</div>
                        </div>
                      )}
                      {c.evening_note && (
                        <div style={{ background: '#0A090D', border: '1px solid #1A1820', borderRadius: 10, padding: '12px' }}>
                          <div style={{ fontSize: 10, color: '#9B7EC8', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{c.evening_done ? 'Evening — What happened & learned' : 'Evening — What got in the way'}</div>
                          <div style={{ fontSize: 13, color: '#EEE5D5', lineHeight: 1.6 }}>{c.evening_note}</div>
                        </div>
                      )}
                      {!c.morning_answer && !c.evening_note && c.evening_done === null && (
                        <div style={{ fontSize: 12, color: '#3A3040', fontStyle: 'italic' }}>No answers recorded for this day.</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
