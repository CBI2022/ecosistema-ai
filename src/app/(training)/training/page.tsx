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
    return <AgentDashboard userName={name} />
  }
  if (profile.role === 'dc' || profile.role === 'admin') {
    return <DCDashboard userName={name} userRole={profile.role} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09080A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', color: '#DDD5C8', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#D4A853', textTransform: 'uppercase', marginBottom: 10 }}>Training</div>
        <h2 style={{ fontSize: 22, color: '#EEE5D5', marginBottom: 10 }}>Not available for your role</h2>
        <p style={{ fontSize: 14, color: '#6A6070', lineHeight: 1.6 }}>The 90-day program is for agents, DCs and admins only.</p>
      </div>
    </div>
  )
}
