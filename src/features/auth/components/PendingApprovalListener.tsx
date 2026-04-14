'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PendingApprovalListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function start() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check inicial por si ya fue aprobado antes de suscribirse
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'approved') {
        router.replace('/dashboard')
        return
      }
      if (profile?.status === 'rejected') {
        router.replace('/account-rejected')
        return
      }

      // Suscripción Realtime al propio perfil
      channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new as { status?: string }
            if (next.status === 'approved') router.replace('/dashboard')
            else if (next.status === 'rejected') router.replace('/account-rejected')
          }
        )
        .subscribe()
    }

    start()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
