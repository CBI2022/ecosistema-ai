'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { AGENT_WEEKS, PHASE_COLORS } from '../data/constants'
import { getAgentOverview } from '../actions'
import { AgentProfileView } from './AgentProfileView'

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

const TOTAL_TASKS = AGENT_WEEKS.flatMap(w => w.tasks).length

export function TeamDashboard({ onBack }: { onBack: () => void }) {
  const t = useTranslations('training')
  const [agents, setAgents] = useState<AgentOverview[] | null>(null)
  const [viewingAgentId, setViewingAgentId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'progress' | 'week' | 'checkins' | 'name'>('progress')

  useEffect(() => {
    getAgentOverview().then(a => setAgents(a as AgentOverview[]))
  }, [])

  if (!agents) {
    return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6BAE94', fontSize: 14 }}>{t('loadingTeamData')}</div>
  }

  const sorted = [...agents].sort((a, b) => {
    if (sortBy === 'progress') return b.completed_tasks - a.completed_tasks
    if (sortBy === 'week') return b.current_week - a.current_week
    if (sortBy === 'checkins') return b.completed_checkins - a.completed_checkins
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return 0
  })

  const teamTasks = agents.reduce((s, a) => s + a.completed_tasks, 0)
  const teamTotal = agents.length * TOTAL_TASKS
  const teamPct = teamTotal > 0 ? Math.round((teamTasks / teamTotal) * 100) : 0
  const committedCount = agents.filter(a => a.committed).length

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8' }}>
      {viewingAgentId && <AgentProfileView agentId={viewingAgentId} onClose={() => setViewingAgentId(null)} />}

      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6BAE94', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{t('teamDashboard')}</div>
          <div style={{ fontSize: 18, color: '#EEE5D5', fontWeight: 700 }}>{t('agentProgressTracker')}</div>
        </div>
        <button onClick={onBack} style={{ background: '#1A1820', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>← {t('back')}</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: t('agents'), value: agents.length, color: '#D4A853' },
            { label: t('committed'), value: `${committedCount}/${agents.length}`, color: '#6BAE94' },
            { label: t('teamProgress'), value: `${teamPct}%`, color: '#9B7EC8' },
            { label: t('tasksDone'), value: teamTasks, color: '#D4A853' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 14, padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, color: s.color, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#3A3040' }}>{t('sortBy')}</span>
          {([{ id: 'progress', label: t('sortProgress') }, { id: 'week', label: t('sortWeek') }, { id: 'checkins', label: t('checkins') }, { id: 'name', label: t('sortName') }] as const).map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} style={{ background: sortBy === s.id ? '#6BAE9420' : '#0D0C10', border: `1px solid ${sortBy === s.id ? '#6BAE9450' : '#1A1820'}`, color: sortBy === s.id ? '#6BAE94' : '#3A3040', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: sortBy === s.id ? 700 : 400 }}>{s.label}</button>
          ))}
        </div>

        {agents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3A3040', fontSize: 14 }}>{t('noAgentsYet')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sorted.map(agent => {
              const pct = Math.round((agent.completed_tasks / TOTAL_TASKS) * 100)
              const phase = AGENT_WEEKS[agent.current_week]?.phase ?? 0
              const ac = PHASE_COLORS[phase]
              const daysSinceJoined = Math.floor((Date.now() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div key={agent.id} onClick={() => setViewingAgentId(agent.id)} style={{ background: '#0D0C10', border: '1px solid #1A1820', borderRadius: 16, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ac}20`, border: `1px solid ${ac}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {agent.committed ? '🧑‍💼' : '⏳'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, color: '#EEE5D5', fontWeight: 700 }}>{agent.name}</span>
                        <span style={{ fontSize: 11, color: '#3A3040' }}>{agent.email}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#4A4050', marginTop: 2 }}>
                        {t('weekDayCommitted', { week: agent.current_week + 1, day: daysSinceJoined + 1, status: agent.committed ? t('committed') : t('notYetCommitted') })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, color: ac, fontWeight: 800 }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: '#3A3040' }}>{t('tasksCount', { done: agent.completed_tasks, total: TOTAL_TASKS })}</div>
                    </div>
                  </div>

                  <div style={{ height: 6, background: '#1A1820', borderRadius: 3, marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${ac}, #EEE5D5)`, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {AGENT_WEEKS.map((w, i) => {
                      const wp = agent.week_progress[i]
                      const wDone = wp ? wp.done : 0
                      const wTotal = w.tasks.length
                      const wPct = Math.round((wDone / wTotal) * 100)
                      const wColor = PHASE_COLORS[w.phase]
                      return (
                        <div key={i} title={t('weekProgressTooltip', { week: w.week, done: wDone, total: wTotal })} style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${wPct}%`, background: wColor, borderRadius: 2 }} />
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: '#4A4050' }}>
                      {t('checkinsLabel')} <span style={{ color: agent.completed_checkins > 0 ? '#6BAE94' : '#3A3040', fontWeight: 600 }}>{t('completedCount', { count: agent.completed_checkins })}</span>
                      <span style={{ color: '#2A2430' }}> {t('totalCount', { count: agent.total_checkins })}</span>
                    </div>
                    {agent.last_checkin && (
                      <div style={{ fontSize: 11, color: '#4A4050' }}>
                        {t('lastLabel')} <span style={{ color: '#6A6070' }}>{agent.last_checkin.date}</span>
                        {agent.last_checkin.evening_done !== null && (
                          <span style={{ color: agent.last_checkin.evening_done ? '#6BAE94' : '#E07B6A', marginLeft: 4 }}>
                            {agent.last_checkin.evening_done ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    )}
                    {agent.last_checkin?.morning_answer && (
                      <div style={{ fontSize: 11, color: '#D4A853', fontStyle: 'italic', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        &ldquo;{agent.last_checkin.morning_answer}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
