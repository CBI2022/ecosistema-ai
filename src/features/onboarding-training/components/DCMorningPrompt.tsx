'use client'

import { useState } from 'react'
import { saveDcPrompt } from '../actions'

export function DCMorningPrompt({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'q' | 'wins'>('q')
  const [q, setQ] = useState('')
  const [wins, setWins] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    await saveDcPrompt({ focusAnswer: q, winAnswer: wins })
    setSubmitted(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,8,10,0.97)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {submitted ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>💚</div>
          <div style={{ fontSize: 22, color: '#EEE5D5', fontWeight: 700 }}>Your agents are lucky to have you.</div>
          <div style={{ fontSize: 14, color: '#4A4050', marginTop: 8, marginBottom: 24 }}>Now go make one of them better today.</div>
          <button onClick={onClose} style={{ background: '#6BAE94', color: '#09080A', border: 'none', borderRadius: 12, padding: '12px 28px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Let&apos;s go →</button>
        </div>
      ) : (
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {([{ id: 'q', label: '🌅 My Focus' }, { id: 'wins', label: '🏆 Win Board' }] as const).map(t => (
              <button key={t.id} onClick={() => setStep(t.id)} style={{ flex: 1, background: step === t.id ? '#6BAE94' : '#100F14', border: `1px solid ${step === t.id ? '#6BAE94' : '#1A1820'}`, color: step === t.id ? '#09080A' : '#3A3040', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: step === t.id ? 700 : 400 }}>{t.label}</button>
            ))}
          </div>
          {step === 'q' && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.25em', color: '#6BAE94', textTransform: 'uppercase', marginBottom: 10 }}>The Law of Addition — Maxwell</div>
              <h3 style={{ fontSize: 20, color: '#EEE5D5', fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>What is the ONE thing you can do today to make one agent better?</h3>
              <p style={{ fontSize: 13, color: '#4A4050', marginBottom: 16, lineHeight: 1.6 }}>Not five agents. One agent. One thing. That&apos;s how trust is built.</p>
              <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="Which agent? What will you do?" rows={3} style={{ width: '100%', background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px', fontSize: 14, color: '#EEE5D5', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
              <button onClick={() => q.trim() && setStep('wins')} style={{ marginTop: 12, width: '100%', background: q.trim() ? '#6BAE94' : '#1A1820', color: q.trim() ? '#09080A' : '#2A2430', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: q.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>Next →</button>
            </div>
          )}
          {step === 'wins' && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.25em', color: '#6BAE94', textTransform: 'uppercase', marginBottom: 10 }}>The Law of Victory — Maxwell</div>
              <h3 style={{ fontSize: 20, color: '#EEE5D5', fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>What&apos;s a win to celebrate with the team today?</h3>
              <p style={{ fontSize: 13, color: '#4A4050', marginBottom: 16, lineHeight: 1.6 }}>First door knock. First appointment. First listing signed. Anything. Small wins build a winning culture.</p>
              <textarea value={wins} onChange={e => setWins(e.target.value)} placeholder="Who did something worth celebrating?" rows={3} style={{ width: '100%', background: '#100F14', border: '1px solid #2A2430', borderRadius: 12, padding: '14px', fontSize: 14, color: '#EEE5D5', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
              <button onClick={submit} style={{ marginTop: 12, width: '100%', background: '#6BAE94', color: '#09080A', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Done — let&apos;s go →</button>
            </div>
          )}
          <button onClick={onClose} style={{ marginTop: 12, width: '100%', background: 'transparent', border: 'none', color: '#2A2430', cursor: 'pointer', fontSize: 12 }}>Close</button>
        </div>
      )}
    </div>
  )
}
