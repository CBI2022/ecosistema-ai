'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface TeamViewToggleProps {
  teamView: boolean
}

export function TeamViewToggle({ teamView }: TeamViewToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticTeam, setOptimisticTeam] = useState(teamView)
  const [pendingTarget, setPendingTarget] = useState<'mine' | 'team' | null>(null)

  // Sincroniza estado óptimo con la prop tras llegar la respuesta del server.
  if (!isPending && optimisticTeam !== teamView) {
    setOptimisticTeam(teamView)
    setPendingTarget(null)
  }

  function go(target: 'mine' | 'team') {
    if (pendingTarget === target) return
    if (target === 'team' && optimisticTeam) return
    if (target === 'mine' && !optimisticTeam) return

    setOptimisticTeam(target === 'team')
    setPendingTarget(target)
    startTransition(() => {
      router.push(target === 'team' ? '/dashboard?view=team' : '/dashboard')
    })
  }

  const common =
    'relative flex-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] transition active:scale-[0.98]'
  const activeCls = 'bg-[#C9A84C] text-black shadow-[0_2px_12px_rgba(201,168,76,0.30)]'
  const idleCls = 'text-[#9A9080] hover:text-[#F5F0E8]'

  return (
    <div className="mb-5 flex gap-2 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
      {/* Prefetch invisible para cachear la otra vista */}
      <Link
        href={optimisticTeam ? '/dashboard' : '/dashboard?view=team'}
        prefetch
        className="hidden"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => go('mine')}
        className={`${common} ${!optimisticTeam ? activeCls : idleCls}`}
        aria-pressed={!optimisticTeam}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {pendingTarget === 'mine' && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          <span>👤 Mis datos</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => go('team')}
        className={`${common} ${optimisticTeam ? activeCls : idleCls}`}
        aria-pressed={optimisticTeam}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {pendingTarget === 'team' && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          <span>👥 Vista equipo</span>
        </span>
      </button>
    </div>
  )
}
