'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import confetti from 'canvas-confetti'
import {
  AGENT_WEEKS,
  GOALS_90D,
  PHASE_COLORS,
  PHASE_LABELS,
  TRAINING_VIDEOS,
  type GoalKey,
} from '../data/constants'
import {
  getAgentProgress,
  getTracker,
  getWeekVideos,
  saveAgentState,
  saveTracker,
  toggleAgentTask,
} from '../actions'
import { CommitmentScreen } from './CommitmentScreen'
import { DailyCheckIn } from './DailyCheckIn'

const LEVELS = [
  { min: 0,   icon: '🌱', title: 'Rookie',       color: '#6BAE94' },
  { min: 25,  icon: '⭐', title: 'Rising Star',   color: '#D4A853' },
  { min: 50,  icon: '🔥', title: 'Closer',        color: '#E07A3A' },
  { min: 75,  icon: '💎', title: 'Elite Agent',   color: '#A07BE0' },
  { min: 100, icon: '🏆', title: 'Legend',        color: '#FFD700' },
]

const MILESTONES = [
  { pct: 25, icon: '⭐', badge: 'Rising Star',   desc: 'Reached 25% of your 90-day journey!' },
  { pct: 50, icon: '🔥', badge: 'Halfway Hero',  desc: "You're 50% through — keep pushing!" },
  { pct: 75, icon: '💎', badge: 'Almost There',  desc: '75% done — the finish line is close!' },
  { pct: 100,icon: '🏆', badge: 'Legend',        desc: 'You completed the 90-day program!' },
]

function getLevel(pct: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) if (pct >= LEVELS[i].min) return LEVELS[i]
  return LEVELS[0]
}

function fireConfetti() {
  const end = Date.now() + 1500
  const colors = ['#D4A853', '#6BAE94', '#E07A3A', '#A07BE0', '#EEE5D5', '#FFD700']
  ;(function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

function fireBigConfetti() {
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#D4A853', '#6BAE94', '#E07A3A', '#A07BE0', '#FFD700'] })
  setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, colors: ['#D4A853', '#FFD700', '#EEE5D5'] }), 400)
  setTimeout(() => confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 }, colors: ['#6BAE94', '#A07BE0', '#E07A3A'] }), 800)
}

function fireGoalConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 }, colors: ['#6BAE94', '#EEE5D5', '#D4A853'] })
}

type TrackerNums = Record<GoalKey, number>
const ZERO: TrackerNums = { doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0, listings: 0 }

export function AgentDashboard({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(true)
  const [committed, setCommitted] = useState(false)
  const [wi, setWi] = useState(0)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'tasks' | 'videos' | 'script'>('tasks')
  const [showCheckin, setShowCheckin] = useState(false)
  const [today, setToday] = useState<TrackerNums>(ZERO)
  const [totals, setTotals] = useState<TrackerNums>(ZERO)
  const [trainingUrls, setTrainingUrls] = useState<Record<string, string>>({})
  const [celebration, setCelebration] = useState<{ type: 'week' | 'goal'; week?: number; label?: string } | null>(null)
  const [showMilestoneUnlock, setShowMilestoneUnlock] = useState<typeof MILESTONES[number] | null>(null)
  const [, start] = useTransition()

  const prevPctRef = useRef(0)
  const prevWeekDoneRef = useRef<Record<number, boolean>>({})
  const prevGoalDoneRef = useRef<Record<string, boolean>>({})
  const initialLoadRef = useRef(true)

  useEffect(() => {
    ;(async () => {
      const [p, t, v] = await Promise.all([getAgentProgress(), getTracker(), getWeekVideos()])
      setDone(p.progress)
      setCommitted(p.state.committed)
      setWi(p.state.current_week ?? 0)

      const totalT = AGENT_WEEKS.flatMap(w => w.tasks).length
      const doneC = Object.values(p.progress).filter(Boolean).length
      prevPctRef.current = Math.round((doneC / totalT) * 100)
      AGENT_WEEKS.forEach((w, i) => {
        const wd = w.tasks.filter((_, ti) => p.progress[`${i}-${ti}`]).length
        prevWeekDoneRef.current[i] = wd === w.tasks.length
      })

      setToday(t.today as TrackerNums)
      setTotals(t.totals as TrackerNums)
      ;(Object.keys(GOALS_90D) as GoalKey[]).forEach(k => {
        prevGoalDoneRef.current[k] = ((t.totals as TrackerNums)[k] ?? 0) >= GOALS_90D[k]
      })

      setTrainingUrls(v)
      setLoading(false)
      setTimeout(() => { initialLoadRef.current = false }, 500)
    })()
  }, [])

  const checkMilestone = useCallback((newPct: number) => {
    if (initialLoadRef.current) return
    const oldPct = prevPctRef.current
    for (const m of MILESTONES) {
      if (oldPct < m.pct && newPct >= m.pct) {
        fireBigConfetti()
        setShowMilestoneUnlock(m)
        setTimeout(() => setShowMilestoneUnlock(null), 4000)
        break
      }
    }
    prevPctRef.current = newPct
  }, [])

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4A853', fontSize: 14 }}>Loading...</div>
  }

  if (!committed) {
    return <CommitmentScreen agentName={userName} onComplete={() => setCommitted(true)} />
  }

  const week = AGENT_WEEKS[wi]
  const ac = PHASE_COLORS[week.phase]
  const totalTasks = AGENT_WEEKS.flatMap(w => w.tasks).length
  const doneCt = Object.values(done).filter(Boolean).length
  const pct = Math.round((doneCt / totalTasks) * 100)
  const wkDone = week.tasks.filter((_, i) => done[`${wi}-${i}`]).length
  const wkPct = Math.round((wkDone / week.tasks.length) * 100)
  const allDone = wkDone === week.tasks.length
  const wkTraining = TRAINING_VIDEOS.filter(v => v.week === wi && trainingUrls[v.id])
  const tabs = ['tasks', ...(wkTraining.length > 0 ? ['videos'] : []), ...(week.script ? ['script'] : [])] as const
  const level = getLevel(pct)
  const nextLevel = LEVELS.find(l => l.min > pct)

  const toggleTask = (taskIdx: number, completed: boolean) => {
    const key = `${wi}-${taskIdx}`
    const newDone = { ...done, [key]: completed }
    setDone(newDone)
    start(() => { void toggleAgentTask(wi, taskIdx, completed) })

    if (completed && !initialLoadRef.current) {
      const wkNowDone = week.tasks.every((_, ti) => ti === taskIdx ? true : !!newDone[`${wi}-${ti}`])
      if (wkNowDone && !prevWeekDoneRef.current[wi]) {
        prevWeekDoneRef.current[wi] = true
        fireConfetti()
        setCelebration({ type: 'week', week: week.week })
        setTimeout(() => setCelebration(null), 3000)
      }
    }
    if (!completed) prevWeekDoneRef.current[wi] = false

    const doneC = Object.values(newDone).filter(Boolean).length
    checkMilestone(Math.round((doneC / totalTasks) * 100))
  }

  const changeWeek = (newWi: number) => {
    setWi(newWi)
    setTab('tasks')
    start(() => { void saveAgentState(committed, newWi) })
  }

  const updateTracker = (field: GoalKey, value: number) => {
    const v = Math.max(0, value | 0)
    const updated = { ...today, [field]: v }
    const newTotals = { ...totals, [field]: (totals[field] ?? 0) - (today[field] ?? 0) + v }
    setToday(updated)
    setTotals(newTotals)
    start(() => { void saveTracker(updated) })

    if (!initialLoadRef.current) {
      const newTotal = newTotals[field] ?? 0
      const goal = GOALS_90D[field]
      if (newTotal >= goal && !prevGoalDoneRef.current[field]) {
        prevGoalDoneRef.current[field] = true
        fireGoalConfetti()
        const labels: Record<GoalKey, string> = { doors: 'Doors Knocked', contacts: 'New Contacts', appointments: 'Appointments', viewings: 'Viewings', offers: 'Offers', listings: 'New Listings' }
        setCelebration({ type: 'goal', label: labels[field] })
        setTimeout(() => setCelebration(null), 3000)
      }
      if (newTotal < goal) prevGoalDoneRef.current[field] = false
    }
  }

  const updateTotal = (field: GoalKey, newTotal: number) => {
    const currentTotal = totals[field] ?? 0
    const currentToday = today[field] ?? 0
    const baseTotal = currentTotal - currentToday
    const newToday = Math.max(0, newTotal - baseTotal)
    updateTracker(field, newToday)
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#09080A', minHeight: '100vh', color: '#DDD5C8', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .goal-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #EEE5D5; border: 2px solid #09080A; cursor: pointer; margin-top: -6px; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .goal-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #EEE5D5; border: 2px solid #09080A; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        @keyframes celebrateIn { 0% { transform: translateY(-30px) scale(0.8); opacity: 0; } 50% { transform: translateY(5px) scale(1.05); } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes milestoneGlow { 0%, 100% { box-shadow: 0 0 20px rgba(212,168,83,0.3); } 50% { box-shadow: 0 0 40px rgba(212,168,83,0.6); } }
        @keyframes badgePop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes levelPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {celebration && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, animation: 'celebrateIn 0.4s ease-out', background: 'linear-gradient(135deg, #1A1820 0%, #0D0C10 100%)', border: `2px solid ${ac}60`, borderRadius: 16, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${ac}30` }}>
          <span style={{ fontSize: 28, animation: 'badgePop 0.5s ease-out' }}>{celebration.type === 'week' ? '🎉' : '🎯'}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#EEE5D5' }}>{celebration.type === 'week' ? `Week ${celebration.week} Complete!` : 'Goal Hit!'}</div>
            <div style={{ fontSize: 11, color: ac }}>{celebration.type === 'week' ? 'All tasks done — amazing work!' : `${celebration.label} target reached!`}</div>
          </div>
        </div>
      )}

      {showMilestoneUnlock && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,8,10,0.85)', animation: 'celebrateIn 0.5s ease-out' }}>
          <div style={{ background: 'linear-gradient(135deg, #1A1820, #0D0C10)', border: `2px solid ${showMilestoneUnlock.pct === 100 ? '#FFD700' : '#D4A853'}60`, borderRadius: 24, padding: '40px 50px', textAlign: 'center', maxWidth: 340, animation: 'milestoneGlow 1.5s ease-in-out infinite' }}>
            <div style={{ fontSize: 60, marginBottom: 12, animation: 'badgePop 0.6s ease-out' }}>{showMilestoneUnlock.icon}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 8 }}>Milestone Unlocked</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#EEE5D5', marginBottom: 8 }}>{showMilestoneUnlock.badge}</div>
            <div style={{ fontSize: 13, color: '#8A8090', lineHeight: 1.6 }}>{showMilestoneUnlock.desc}</div>
            <div style={{ marginTop: 16, fontSize: 11, color: '#3A3040' }}>{showMilestoneUnlock.pct}% complete</div>
          </div>
        </div>
      )}

      {showCheckin && <DailyCheckIn agentName={userName} weekAction={week.action} onClose={() => setShowCheckin(false)} />}

      <div style={{ background: '#0C0B0E', borderBottom: '1px solid #1A1820', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 18, width: 32, height: 32, borderRadius: 10, background: `${level.color}18`, border: `1.5px solid ${level.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: pct >= 100 ? 'levelPulse 2s ease-in-out infinite' : 'none' }}>{level.icon}</div>
          <div>
            <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 700 }}>{userName}</div>
            <div style={{ fontSize: 10, color: level.color, fontWeight: 600 }}>{level.title}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#3A3040' }}>{pct}%</div>
          <button onClick={() => setShowCheckin(true)} style={{ background: '#D4A853', color: '#09080A', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>☀️ Check In</button>
        </div>
      </div>

      <div style={{ height: 4, background: '#191714', position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${level.color}, ${nextLevel ? nextLevel.color + '80' : '#FFD700'})`, transition: 'width 0.5s', backgroundSize: '200% 100%', animation: pct >= 100 ? 'shimmer 2s linear infinite' : 'none' }} />
        {MILESTONES.map(m => (
          <div key={m.pct} style={{ position: 'absolute', top: -3, left: `${m.pct}%`, transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: pct >= m.pct ? (m.pct === 100 ? '#FFD700' : '#D4A853') : '#1A1820', border: `2px solid ${pct >= m.pct ? '#09080A' : '#2A2430'}`, transition: 'all 0.3s', zIndex: 1 }} />
        ))}
      </div>

      <div style={{ background: '#0A090D', borderBottom: '1px solid #1A1820', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {AGENT_WEEKS.map((w, i) => {
          const wd = w.tasks.filter((_, ti) => done[`${i}-${ti}`]).length
          return (
            <button key={i} onClick={() => changeWeek(i)} style={{ background: 'transparent', border: 'none', borderBottom: `3px solid ${i === wi ? PHASE_COLORS[w.phase] : 'transparent'}`, padding: '10px 13px', cursor: 'pointer', color: i === wi ? PHASE_COLORS[w.phase] : '#2A2430', fontSize: 11, fontWeight: i === wi ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
              Wk {w.week}{wd === w.tasks.length && <span style={{ marginLeft: 3, color: '#6BAE94' }}>✓</span>}
            </button>
          )
        })}
      </div>

      <div key={wi} style={{ flex: 1, overflowY: 'auto', padding: '22px 16px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ac, textTransform: 'uppercase' }}>{PHASE_LABELS[week.phase]} · {week.days}</div>
          <div style={{ fontSize: 12, color: '#3A3040' }}>Hey {userName} 👋</div>
        </div>

        <div style={{ background: `${ac}12`, border: `1.5px solid ${ac}35`, borderRadius: 16, padding: '18px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', marginBottom: 6 }}>Your Priority This Week</div>
          <div style={{ fontSize: 17, color: '#EEE5D5', lineHeight: 1.4, fontWeight: 700 }}>{week.action}</div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1A1820', marginBottom: 14 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t as typeof tab)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? ac : 'transparent'}`, color: tab === t ? ac : '#3A3040', padding: '7px 14px', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', transition: 'all 0.15s', marginBottom: -1 }}>{t}</button>
          ))}
        </div>

        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {week.tasks.map((task, ti) => {
                const isDone = !!done[`${wi}-${ti}`]
                return (
                  <div key={ti} onClick={() => toggleTask(ti, !isDone)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', cursor: 'pointer', borderRadius: 12, background: isDone ? '#0E1410' : '#0D0C10', border: `1px solid ${isDone ? '#6BAE9430' : '#1A1820'}`, transition: 'all 0.15s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${isDone ? '#6BAE94' : '#2A2430'}`, background: isDone ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isDone && <span style={{ color: '#09080A', fontSize: 12, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: isDone ? '#3A4A3A' : '#C8C0B8', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none', flex: 1, transition: 'all 0.2s' }}>{task}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ background: '#0C0B0E', border: `1px solid ${ac}20`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#3A3040', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Week Target</div>
                <div style={{ fontSize: 13, color: ac, lineHeight: 1.6 }}>{week.target}</div>
              </div>
              {allDone && <div style={{ fontSize: 22 }}>🎉</div>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: '#1A1820', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${wkPct}%`, background: ac, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#3A3040' }}>{wkDone}/{week.tasks.length}</div>
            </div>
          </div>
        )}

        {tab === 'videos' && (
          <div>
            {wkTraining.length > 0 ? wkTraining.map(tv => {
              const loomUrl = trainingUrls[tv.id]
              const m = loomUrl?.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
              const embedUrl = m ? `https://www.loom.com/embed/${m[1]}` : null
              return (
                <div key={tv.id} style={{ background: `${ac}0D`, border: `1px solid ${ac}35`, borderRadius: 12, padding: '14px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>🎓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#EEE5D5', fontWeight: 500 }}>{tv.title}</div>
                      <div style={{ fontSize: 11, color: ac, marginTop: 2 }}>{tv.topic}</div>
                    </div>
                  </div>
                  {embedUrl ? (
                    <div style={{ marginTop: 10, position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden' }}>
                      <iframe src={embedUrl} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
                    </div>
                  ) : (
                    <a href={loomUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, background: ac, color: '#080807', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>▶ Watch Now</a>
                  )}
                </div>
              )
            }) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#3A3040', fontSize: 13 }}>No videos added for this week yet. Check back soon!</div>
            )}
          </div>
        )}

        {tab === 'script' && week.script && (
          <div style={{ background: '#0D0C10', border: `1px solid ${ac}25`, borderRadius: 14, padding: '18px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: ac, textTransform: 'uppercase', marginBottom: 10 }}>{week.script.label}</div>
            <div style={{ fontSize: 14, color: '#B8B0A8', lineHeight: 1.9, fontStyle: 'italic' }}>{week.script.text}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {wi > 0 && <button onClick={() => changeWeek(wi - 1)} style={{ flex: 1, background: '#0D0C10', border: '1px solid #1A1820', color: '#3A3040', padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13 }}>← Wk {AGENT_WEEKS[wi - 1].week}</button>}
          {wi < AGENT_WEEKS.length - 1 && (
            <button onClick={() => changeWeek(wi + 1)} style={{ flex: 2, background: ac, border: 'none', color: '#09080A', padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
              {allDone ? `✓ Done — Wk ${AGENT_WEEKS[wi + 1].week} →` : `Week ${AGENT_WEEKS[wi + 1].week} →`}
            </button>
          )}
        </div>

        {/* 90-Day Goal Tracker */}
        <div style={{ marginTop: 28, borderTop: '1px solid #1A1820', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', color: ac, textTransform: 'uppercase', fontWeight: 700 }}>🎯 90-Day Goals</div>
            {(() => {
              const fields: GoalKey[] = ['doors', 'contacts', 'appointments', 'viewings', 'offers', 'listings']
              const overallPct = Math.round(fields.reduce((sum, k) => sum + Math.min(((totals[k] ?? 0) / GOALS_90D[k]) * 100, 100), 0) / fields.length)
              return <span style={{ fontSize: 14, color: overallPct >= 100 ? '#6BAE94' : ac, fontWeight: 800 }}>{overallPct}%</span>
            })()}
          </div>

          {(() => {
            const fields: GoalKey[] = ['doors', 'contacts', 'appointments', 'viewings', 'offers', 'listings']
            const overallPct = Math.round(fields.reduce((sum, k) => sum + Math.min(((totals[k] ?? 0) / GOALS_90D[k]) * 100, 100), 0) / fields.length)
            return (
              <div style={{ width: '100%', height: 8, background: '#1A1820', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct >= 100 ? '#6BAE94' : `linear-gradient(90deg, ${ac}, ${ac}DD)`, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            )
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([
              { key: 'doors', label: 'Doors Knocked', icon: '🚪' },
              { key: 'contacts', label: 'New Contacts', icon: '📇' },
              { key: 'listings', label: 'New Listings', icon: '🏡' },
              { key: 'appointments', label: 'Appointments', icon: '📅' },
              { key: 'viewings', label: 'Viewings', icon: '🏠' },
              { key: 'offers', label: 'Offers', icon: '📝' },
            ] as { key: GoalKey; label: string; icon: string }[]).map(f => {
              const total = totals[f.key] ?? 0
              const goal = GOALS_90D[f.key]
              const goalPct = Math.min((total / goal) * 100, 100)
              const goalDone = total >= goal
              return (
                <div key={f.key} style={{ background: goalDone ? '#0E14100A' : '#0D0C10', border: `1px solid ${goalDone ? '#6BAE9430' : '#1A1820'}`, borderRadius: 12, padding: '14px', transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{f.icon}</span>
                      <span style={{ fontSize: 13, color: '#B8B0A8' }}>{f.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 20, color: goalDone ? '#6BAE94' : '#EEE5D5', fontWeight: 800 }}>{total}</span>
                      <span style={{ fontSize: 11, color: '#3A3040' }}>/ {goal}</span>
                      {goalDone && <span style={{ fontSize: 13, marginLeft: 4 }}>✅</span>}
                    </div>
                  </div>
                  <input
                    className="goal-slider"
                    type="range"
                    min={0}
                    max={goal}
                    value={Math.min(total, goal)}
                    onChange={e => updateTotal(f.key, parseInt(e.target.value, 10))}
                    style={{ width: '100%', height: 6, appearance: 'none', WebkitAppearance: 'none', background: `linear-gradient(to right, ${goalDone ? '#6BAE94' : ac} ${goalPct}%, #1A1820 ${goalPct}%)`, borderRadius: 3, outline: 'none', cursor: 'pointer' }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
