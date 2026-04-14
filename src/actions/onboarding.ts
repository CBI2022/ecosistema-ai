'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Step 1: Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      full_name:
        `${formData.get('first_name')} ${formData.get('last_name')}`.trim(),
      phone: formData.get('phone') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Step 2: Upsert goals
  const { error: goalsError } = await supabase.from('user_goals').upsert({
    user_id: user.id,
    monthly_income_goal: Number(formData.get('monthly_income_goal')) || 0,
    closings_per_month: Number(formData.get('closings_per_month')) || 0,
    listings_per_month: Number(formData.get('listings_per_month')) || 0,
    appointments_per_week: Number(formData.get('appointments_per_week')) || 0,
    calls_per_day: Number(formData.get('calls_per_day')) || 0,
    followups_per_day: Number(formData.get('followups_per_day')) || 0,
    updated_at: new Date().toISOString(),
  })

  if (goalsError) return { error: goalsError.message }

  // Step 3: Upsert motivation
  const { error: motivationError } = await supabase
    .from('user_motivation')
    .upsert({
      user_id: user.id,
      why: formData.get('why') as string,
      dream_life: formData.get('dream_life') as string,
      motto: formData.get('motto') as string,
      updated_at: new Date().toISOString(),
    })

  if (motivationError) return { error: motivationError.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
