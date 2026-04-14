'use client'

import { useState, useTransition } from 'react'
import { saveCheckin } from '../actions'

export function DailyCheckIn({
  weekAction,
  onClose,
}: {
  weekAction: string
  onClose: () => void
}) {
  const [step, setStep] = useState<'morning' | 'evening' | 'done'>('morning')
  const [morning, setMorning] = useState('')
  const [eveningDone, setEveningDone] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()

  const submitMorning = () => {
    if (pending) return
    start(async () => {
      if (morning.trim()) await saveCheckin({ morningAnswer: morning.trim() })
      setStep('evening')
    })
  }

  const submitEvening = () => {
    if (pending || eveningDone === null) return
    start(async () => {
      await saveCheckin({ eveningDone, eveningNote: note.trim() || undefined })
      setStep('done')
      setTimeout(onClose, 1500)
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-gold)] bg-[var(--card)] p-8">
        {step === 'morning' && (
          <>
            <div className="mb-2 text-[10px] tracking-[0.3em] text-[var(--gold)]">☀️ MORNING</div>
            <h3 className="mb-2 text-lg font-bold text-[var(--text)]">Today&apos;s priority</h3>
            <p className="mb-4 text-xs text-[var(--text-muted)]">{weekAction}</p>
            <textarea
              value={morning}
              onChange={e => setMorning(e.target.value)}
              rows={3}
              placeholder="What is the ONE thing you will do before lunch?"
              className="mb-4 w-full resize-none rounded-lg border border-[var(--border)] bg-black/40 p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--gold)]"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)]">
                Later
              </button>
              <button
                onClick={submitMorning}
                disabled={pending}
                className="flex-[2] rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
              >
                {pending ? '…' : 'Continue'}
              </button>
            </div>
          </>
        )}
        {step === 'evening' && (
          <>
            <div className="mb-2 text-[10px] tracking-[0.3em] text-[var(--gold)]">🌙 EVENING</div>
            <h3 className="mb-4 text-lg font-bold text-[var(--text)]">Did you do it?</h3>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setEveningDone(true)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${eveningDone === true ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
              >
                ✅ Yes
              </button>
              <button
                onClick={() => setEveningDone(false)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${eveningDone === false ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
              >
                ❌ No
              </button>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="What blocked you? (optional)"
              className="mb-4 w-full resize-none rounded-lg border border-[var(--border)] bg-black/40 p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--gold)]"
            />
            <button
              onClick={submitEvening}
              disabled={pending || eveningDone === null}
              className="w-full rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
            >
              {pending ? '…' : 'Save'}
            </button>
          </>
        )}
        {step === 'done' && (
          <div className="py-8 text-center">
            <div className="mb-2 text-4xl">✓</div>
            <div className="text-sm text-[var(--text)]">Logged. See you tomorrow.</div>
          </div>
        )}
      </div>
    </div>
  )
}
