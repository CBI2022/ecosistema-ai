'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleChecklistItem(itemId: string, isDone: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('checklist_items')
    .update({
      is_done: isDone,
      completed: isDone ? 1 : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/kpi')
  return { success: true }
}

export async function resetWeeklyPlan(weekStart: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('checklist_items')
    .update({ is_done: false, completed: 0, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('week_start', weekStart)

  if (error) return { error: error.message }

  revalidatePath('/kpi')
  return { success: true }
}
