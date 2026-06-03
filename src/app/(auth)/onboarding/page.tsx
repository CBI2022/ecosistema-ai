import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

export default async function OnboardingPage() {
  const t = await getTranslations('auth')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si ya completó onboarding, ir al dashboard
  const { data: goals } = await supabase
    .from('user_goals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (goals) redirect('/dashboard')

  return (
    <div className="py-2">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          {t('completeProfile')}
        </h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          {t('completeProfileSubtitle')}
        </p>
      </div>
      <OnboardingWizard />
    </div>
  )
}
