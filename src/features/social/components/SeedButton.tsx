'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { seedDemoClips } from '@/actions/social'

export function SeedButton() {
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const res = await seedDemoClips()
    setLoading(false)
    if (res?.success) startTransition(() => router.refresh())
    else if (res && 'skipped' in res) router.refresh()
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="rounded-xl bg-[#C9A84C] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
    >
      {loading ? 'Cargando...' : '✨ Cargar datos demo'}
    </button>
  )
}
