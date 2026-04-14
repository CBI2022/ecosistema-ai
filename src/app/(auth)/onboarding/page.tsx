import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

export default async function OnboardingPage() {
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
          Completa tu perfil
        </h1>
        <p className="mt-1 text-sm text-[#F5F0E8]/40">
          Solo tardará 2 minutos
        </p>
      </div>
      <OnboardingWizard />
    </div>
  )
}
