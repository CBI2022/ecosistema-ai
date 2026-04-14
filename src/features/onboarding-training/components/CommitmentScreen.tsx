'use client'

import { useState, useTransition } from 'react'
import { saveAgentState } from '../actions'

export function CommitmentScreen({ agentName, onCommit }: { agentName: string; onCommit: () => void }) {
  const [checked, setChecked] = useState(false)
  const [pending, start] = useTransition()

  const commit = () => {
    if (!checked || pending) return
    start(async () => {
      await saveAgentState(true, 0)
      onCommit()
    })
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-gold)] bg-[var(--card)] p-8 md:p-12">
        <div className="mb-2 text-[10px] tracking-[0.3em] text-[var(--gold)]">90-DAY COMMITMENT</div>
        <h1 className="mb-6 text-2xl font-bold text-[var(--text)] md:text-3xl">Welcome, {agentName}.</h1>
        <p className="mb-8 text-sm leading-relaxed text-[var(--text-muted)]">
          The next 90 days will change your career. You will knock hundreds of doors, hold real appointments, close your first listing, and take your first commission. But only if you commit fully — every day, without exception.
        </p>
        <label className="mb-8 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--gold)]"
          />
          <span className="text-sm text-[var(--text)]">
            I commit to the 90-day program. Every task, every day, every door.
          </span>
        </label>
        <button
          onClick={commit}
          disabled={!checked || pending}
          className="w-full rounded-xl bg-[var(--gold)] px-6 py-3 text-sm font-bold text-black transition hover:bg-[var(--gold-light)] disabled:opacity-40"
        >
          {pending ? 'Starting…' : 'Start My 90 Days'}
        </button>
      </div>
    </div>
  )
}
