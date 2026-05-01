'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Lunes de la semana del día dado, en formato YYYY-MM-DD
function weekStartOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // ISO: lunes = 1
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function dayOfWeekIso(date: Date): number {
  // ISO: lunes = 1 ... domingo = 7
  const day = date.getDay()
  return day === 0 ? 7 : day
}

// Trae los items marcados como done HOY para el usuario actual.
// Devuelve un Set de category (que usamos como "item_id" del checklist diario).
export async function getTodaysChecklistDone(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date()
  const ws = weekStartOf(today)
  const dow = dayOfWeekIso(today)

  const { data } = await supabase
    .from('checklist_items')
    .select('category, is_done')
    .eq('user_id', user.id)
    .eq('week_start', ws)
    .eq('day_of_week', dow)
    .eq('is_done', true)

  return (data ?? []).map((r) => r.category as string).filter(Boolean)
}

// Marca/desmarca un item del checklist diario hoy.
export async function toggleDailyChecklistItem(itemId: string, isDone: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const today = new Date()
  const ws = weekStartOf(today)
  const dow = dayOfWeekIso(today)

  const { error } = await supabase
    .from('checklist_items')
    .upsert(
      {
        user_id: user.id,
        week_start: ws,
        day_of_week: dow,
        category: itemId,
        is_done: isDone,
        completed: isDone ? 1 : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start,day_of_week,category' },
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
