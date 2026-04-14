import Link from 'next/link'
import Image from 'next/image'
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
    .select('id, role, status, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved') redirect('/pending-approval')

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--border-gold)] hover:text-[var(--gold)]"
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Image src="/logo-cbi.png" alt="CBI" width={70} height={20} className="h-5 w-auto" priority />
          <span className="hidden text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] md:inline">
            90-Day Training
          </span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          {profile.full_name ?? profile.email}
        </div>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  )
}
