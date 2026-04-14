import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function TrainingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending-approval')

  return (
    <div style={{ background: '#09080A', minHeight: '100vh' }}>
      <Link
        href="/dashboard"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 9500,
          background: 'rgba(26,24,32,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #2A2430',
          color: '#9A9080',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 600,
          textDecoration: 'none',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        ← Dashboard
      </Link>
      {children}
    </div>
  )
}
