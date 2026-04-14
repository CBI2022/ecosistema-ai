'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Devuelve shoots existentes en un rango de fechas para bloquear overbooking
export async function getBookedSlots(fromDate: string, toDate: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('photo_shoots')
    .select('shoot_date, shoot_time, duration_hours, status')
    .gte('shoot_date', fromDate)
    .lte('shoot_date', toDate)
    .neq('status', 'cancelled')

  return (data || []).map((s) => ({
    date: s.shoot_date,
    time: s.shoot_time,
    duration: s.duration_hours || 2,
  }))
}

export async function bookShoot(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const shootDate = formData.get('shoot_date') as string
  const shootTime = formData.get('shoot_time') as string

  // Verificar overbooking — mismo día + hora
  const admin = createAdminClient()
  const { data: conflict } = await admin
    .from('photo_shoots')
    .select('id')
    .eq('shoot_date', shootDate)
    .eq('shoot_time', shootTime)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (conflict) {
    return { error: 'Ese slot ya está reservado. Elige otra hora.' }
  }

  const { error } = await supabase.from('photo_shoots').insert({
    agent_id: user.id,
    property_address: formData.get('property_address') as string,
    property_reference: (formData.get('property_reference') as string) || null,
    shoot_date: shootDate,
    shoot_time: shootTime,
    notes: (formData.get('notes') as string) || null,
    status: 'scheduled',
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/photographer')
  return { success: true }
}

export async function updateShootStatus(
  shootId: string,
  status: 'scheduled' | 'completed' | 'cancelled'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('photo_shoots')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', shootId)

  if (error) return { error: error.message }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}
