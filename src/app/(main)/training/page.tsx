import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrainingHub } from '@/features/training/components/TrainingHub'

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: videos }, { data: lastResult }] = await Promise.all([
    supabase
      .from('training_videos')
      .select('id, title, description, youtube_url, category, type, content, duration_minutes')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('training_results')
      .select('score, passed, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Training Academy</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Videos · Scripts · How-To SOPs · Knowledge Exam</p>
      </div>
      <TrainingHub
        videos={(videos as Parameters<typeof TrainingHub>[0]['videos']) || []}
        userId={user.id}
        lastResult={lastResult ?? null}
      />
    </div>
  )
}
