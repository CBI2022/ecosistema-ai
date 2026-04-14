'use client'

import { useState } from 'react'
import { saveCheckin } from '../actions'

export function DailyCheckIn({
  agentName,
  weekAction,
  onClose,
}: {
  agentName: string
  weekAction: string
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'morning' | 'locked' | 'evening'>('morning')
  const [morningQ, setMorningQ] = useState('')
  const [eveningDone, setEveningDone] = useState<boolean | null>(null)
  const [eveningNote, setEveningNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    await saveCheckin({
      morningAnswer: morningQ || undefined,
      eveningDone: eveningDone ?? undefined,
      eveningNote: eveningNote || undefined,
    })
    setSubmitted(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,8,10,0.97)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {submitted ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>{eveningDone ? '🔥' : '💪'}</div>
          <div style={{ fontSize: 22, color: '#EEE5D5', fontWeight: 700 }}>{eveningDone ? "That's what winners do." : 'Tomorrow is a new day.'}</div>
          <div style={{ fontSize: 14, color: '#4A4050', marginTop: 8 }}>See you tomorrow, {agentName}.</div>
        </div>
      ) : (
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {([{ id: 'morning', label: '☀️ Morning' }, { id: 'evening', label: '🌙 Evening' }] as const).map(p => (
              <button key={p.id} onClick={() => setPhase(p.id)} style={{ flex: 1, background: phase === p.id ? '#D4A853' : '#100F14', border: `1px solid ${phase === p.id ? '#D4A853' : '#1A1820'}`, color: phase === p.id ? '#09080A' : '#3A3040', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: phase === p.id ? 700 : 400 }}>{p.label}</button>
            ))}
          </div>
          {phase === 'morning' && (
            <div>
              <h3 style={{ fontSize: 20, color: '#EEE5D5', fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>What is the ONE thing you will do today that moves you closer to your first sale?</h3>
              <div style={{ fontSize: 12, color: '#3A3040', marginBottom: 14 }}>This week: <span style={{ color: '#D4A853' }}>{weekAction}</span></div>
              <textarea value={morningQ} onChange={e => setMorningQ(e.target.value)} placeholder="Write it down. Be specific." rows={3} style={{ width: '100%', background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px', fontSize: 14, color: '#EEE5D5', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
              <button onClick={() => morningQ.trim() && (saveCheckin({ morningAnswer: morningQ.trim() }), setPhase('locked'))} style={{ marginTop: 12, width: '100%', background: morningQ.trim() ? '#D4A853' : '#1A1820', color: morningQ.trim() ? '#09080A' : '#2A2430', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: morningQ.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>Commit to it →</button>
            </div>
          )}
          {phase === 'locked' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
              <h3 style={{ fontSize: 18, color: '#EEE5D5', fontWeight: 700, marginBottom: 10 }}>Locked in.</h3>
              <div style={{ background: '#100F14', border: '1px solid #D4A85330', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#D4A853', lineHeight: 1.7 }}>{morningQ}</div>
              </div>
              <p style={{ fontSize: 13, color: '#4A4050', marginBottom: 16 }}>Now go do it. Come back tonight.</p>
              <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2A2430', color: '#6A6070', borderRadius: 12, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          )}
          {phase === 'evening' && (
            <div>
              <h3 style={{ fontSize: 20, color: '#EEE5D5', fontWeight: 700, marginBottom: 16 }}>Did you do it?</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[{ v: true, label: '✅ Yes', color: '#6BAE94' }, { v: false, label: '❌ No', color: '#E07B6A' }].map(o => (
                  <button key={String(o.v)} onClick={() => setEveningDone(o.v)} style={{ flex: 1, background: eveningDone === o.v ? `${o.color}20` : '#100F14', border: `2px solid ${eveningDone === o.v ? o.color : '#1A1820'}`, color: eveningDone === o.v ? o.color : '#3A3040', borderRadius: 12, padding: '14px', cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s' }}>{o.label}</button>
                ))}
              </div>
              {eveningDone !== null && (
                <>
                  <textarea value={eveningNote} onChange={e => setEveningNote(e.target.value)} placeholder={eveningDone ? 'What happened? What did you learn?' : 'What got in the way? What will you do differently tomorrow?'} rows={3} style={{ width: '100%', background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px', fontSize: 14, color: '#EEE5D5', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: 12 }} />
                  <button onClick={submit} style={{ width: '100%', background: '#9B7EC8', color: '#09080A', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Done for today →</button>
                </>
              )}
            </div>
          )}
          <button onClick={onClose} style={{ marginTop: 12, width: '100%', background: 'transparent', border: 'none', color: '#2A2430', cursor: 'pointer', fontSize: 12 }}>Close</button>
        </div>
      )}
    </div>
  )
}
