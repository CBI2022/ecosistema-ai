'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateAnnualGoal(annualGoal: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (typeof annualGoal !== 'number' || annualGoal < 0) {
    return { error: 'Valor inválido' }
  }

  const admin = createAdminClient()

  // Upsert: si existe user_goals lo actualiza, si no lo crea
  const { data: existing } = await admin
    .from('user_goals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('user_goals')
      .update({
        annual_revenue_goal: annualGoal,
        monthly_income_goal: Math.round(annualGoal / 12),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin.from('user_goals').insert({
      user_id: user.id,
      annual_revenue_goal: annualGoal,
      monthly_income_goal: Math.round(annualGoal / 12),
      closings_per_month: 0,
      listings_per_month: 0,
      appointments_per_week: 0,
      calls_per_day: 0,
      followups_per_day: 0,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/kpi')
  return { success: true }
}
