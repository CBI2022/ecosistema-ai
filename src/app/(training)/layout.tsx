import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import './training.css'

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
    <div className="training-root">
      <Link
        href="/dashboard"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 9500,
          background: 'rgba(26,24,32,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #2A2430',
          color: '#9A9080',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 600,
          textDecoration: 'none',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        ← Dashboard
      </Link>
      {children}
    </div>
  )
}
