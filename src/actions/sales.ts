'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function logSale(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const commission = Number(formData.get('commission'))
  const salePrice = Number(formData.get('sale_price')) || commission

  const { error } = await supabase.from('sales').insert({
    agent_id: user.id,
    property_address: (formData.get('property_address') as string) || null,
    sale_price: salePrice,
    commission: commission,
    closing_date:
      (formData.get('closing_date') as string) ||
      new Date().toISOString().split('T')[0],
    notes: (formData.get('notes') as string) || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteSale(saleId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .eq('agent_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/kpi')
  return { success: true }
}

export async function updateSale(saleId: string, updates: {
  property_address?: string | null
  commission?: number
  closing_date?: string
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const patch: Record<string, unknown> = {}
  if (updates.property_address !== undefined) patch.property_address = updates.property_address
  if (updates.commission !== undefined) {
    patch.commission = updates.commission
    patch.sale_price = updates.commission
  }
  if (updates.closing_date !== undefined) patch.closing_date = updates.closing_date
  if (updates.notes !== undefined) patch.notes = updates.notes

  const { error } = await supabase
    .from('sales')
    .update(patch)
    .eq('id', saleId)
    .eq('agent_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/kpi')
  return { success: true }
}
