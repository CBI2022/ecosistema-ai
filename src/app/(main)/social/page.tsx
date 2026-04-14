import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SocialDashboard } from '@/features/social/components/SocialDashboard'

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; platform?: string }>
}) {
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

  const params = await searchParams
  const activeTab = params.tab || 'overview'
  const activePlatform = params.platform || 'all'

  // Load all data in parallel
  const [
    { data: clips },
    { data: scheduledPosts },
    { data: accounts },
    { data: metrics },
    { data: recentVideos },
  ] = await Promise.all([
    admin
      .from('clips')
      .select('*, video_sources(title, thumbnail_url)')
      .in('status', ['available', 'scheduled', 'published'])
      .order('virality_score', { ascending: false, nullsFirst: false })
      .limit(60),
    admin
      .from('scheduled_posts')
      .select('*, clips(title, thumbnail_url, preview_url)')
      .order('scheduled_for', { ascending: true })
      .limit(50),
    admin.from('social_accounts').select('*'),
    admin
      .from('platform_metrics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(30),
    admin
      .from('video_sources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Social Media Command Center</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          Instagram · YouTube · TikTok — solo visible para admins
        </p>
      </div>

      <SocialDashboard
        initialTab={activeTab}
        initialPlatform={activePlatform}
        clips={clips || []}
        scheduledPosts={scheduledPosts || []}
        accounts={accounts || []}
        metrics={metrics || []}
        recentVideos={recentVideos || []}
      />
    </div>
  )
}
