'use client'

import { useState, useTransition } from 'react'
import { saveAgentState } from '../actions'

export function CommitmentScreen({ agentName, onComplete }: { agentName: string; onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [said, setSaid] = useState(false)
  const [pending, start] = useTransition()
  const stmt = `I am ${agentName}. I am a top-performing property agent on the Costa Blanca. I find listings that others miss. I close deals that others don't. In 90 days I will make my first sale. I commit to showing up every day, knocking every door, and doing the work — no matter what.`

  const commit = () => {
    if (!said || pending) return
    start(async () => {
      await saveAgentState(true, 0)
      onComplete()
    })
  }

  const btn = (active: boolean, onClick: () => void, text: string) => (
    <button onClick={onClick} style={{ width: '100%', background: active ? '#D4A853' : '#1A1820', color: active ? '#09080A' : '#2A2430', border: 'none', borderRadius: 14, padding: '15px', fontSize: 16, fontWeight: 800, cursor: active ? 'pointer' : 'default', transition: 'all 0.2s', marginTop: 16 }}>{text}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      {step === 0 && (
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>🔑</div>
          <div style={{ fontSize: 11, letterSpacing: '0.35em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 14 }}>Before you begin</div>
          <h1 style={{ fontSize: 28, color: '#EEE5D5', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>Your 90-day journey starts right now.</h1>
          <p style={{ fontSize: 15, color: '#6A6070', lineHeight: 1.85, marginBottom: 32 }}>This is not a training programme. This is a commitment to yourself. The agents who follow this plan get their first sale. The ones who don&apos;t — don&apos;t. It&apos;s that simple.</p>
          {btn(true, () => setStep(1), "I'm ready →")}
        </div>
      )}
      {step === 1 && (
        <div style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 14 }}>Your Commitment, {agentName}</div>
          <div style={{ background: '#100F14', border: '1px solid #D4A85335', borderRadius: 16, padding: '28px 24px', marginBottom: 18, textAlign: 'left' }}>
            <p style={{ fontSize: 17, color: '#D4A853', lineHeight: 1.95, fontWeight: 500 }}>{stmt}</p>
          </div>
          <p style={{ fontSize: 13, color: '#4A4050', marginBottom: 14 }}>Read this out loud. Not in your head. Out loud.</p>
          <div onClick={() => setSaid(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: said ? '#0E1410' : '#100F14', border: `1px solid ${said ? '#6BAE9450' : '#1A1820'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${said ? '#6BAE94' : '#2A2430'}`, background: said ? '#6BAE94' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              {said && <span style={{ color: '#09080A', fontSize: 12, fontWeight: 800 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: said ? '#6BAE94' : '#4A4050' }}>I said it out loud. I mean it.</span>
          </div>
          {btn(said && !pending, commit, pending ? 'Starting…' : 'I commit — Start Day 1 →')}
        </div>
      )}
    </div>
  )
}
