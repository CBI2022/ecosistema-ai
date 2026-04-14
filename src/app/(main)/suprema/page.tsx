import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SupremaDashboard } from '@/features/suprema/components/SupremaDashboard'

export default async function SupremaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch jobs with property and agent info via joins
  const { data: rawJobs } = await admin
    .from('suprema_jobs')
    .select(`
      *,
      properties(reference, title, zone),
      profiles!suprema_jobs_agent_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const jobs = (rawJobs || []).map((j) => {
    const p = j.properties as { reference?: string; title?: string; zone?: string } | null
    const a = j.profiles as { full_name?: string } | null
    return {
      id: j.id,
      property_id: j.property_id,
      agent_id: j.agent_id,
      status: j.status as 'queued' | 'running' | 'done' | 'error',
      logs: j.logs as string[] | null,
      error_message: j.error_message,
      started_at: j.started_at,
      completed_at: j.completed_at,
      created_at: j.created_at,
      property_reference: p?.reference ?? null,
      property_title: p?.title ?? null,
      property_zone: p?.zone ?? null,
      agent_name: a?.full_name ?? null,
    }
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Suprema Automation</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Automate property publishing to the Suprema portal · Browser automation</p>
      </div>
      <SupremaDashboard jobs={jobs} />
    </div>
  )
}
