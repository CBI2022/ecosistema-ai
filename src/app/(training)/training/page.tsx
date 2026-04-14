import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentDashboard } from '@/features/onboarding-training/components/AgentDashboard'
import { DCDashboard } from '@/features/onboarding-training/components/DCDashboard'

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const name = profile.full_name ?? profile.email

  if (profile.role === 'agent') {
    return <AgentDashboard userId={profile.id} userName={name} />
  }

  if (profile.role === 'dc' || profile.role === 'admin') {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {profile.role === 'admin' ? 'Admin' : 'Director Comercial'}
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">90-Day Training</h1>
        </div>
        <DCDashboard />
      </div>
    )
  }

  // Secretary / photographer — not part of the onboarding program
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Training</div>
      <h2 className="mb-2 text-xl font-bold text-[var(--text)]">Not available for your role</h2>
      <p className="text-sm text-[var(--text-muted)]">
        The 90-day program is for agents and directors. Ask Bruno or Darcy if you think you should have access.
      </p>
    </div>
  )
}
