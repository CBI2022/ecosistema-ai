'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addCompetitor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('competitors').insert({
    type: formData.get('type') as 'agency' | 'agent',
    name: formData.get('name') as string,
    agency_name: (formData.get('agency_name') as string) || null,
    zone: formData.get('zone') as string,
    phone: (formData.get('phone') as string) || null,
    whatsapp: (formData.get('whatsapp') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    notes: (formData.get('notes') as string) || null,
    added_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/competitors')
  return { success: true }
}

export async function updateCompetitor(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('competitors').update({
    type: formData.get('type') as 'agency' | 'agent',
    name: formData.get('name') as string,
    agency_name: (formData.get('agency_name') as string) || null,
    zone: formData.get('zone') as string,
    phone: (formData.get('phone') as string) || null,
    whatsapp: (formData.get('whatsapp') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    notes: (formData.get('notes') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/competitors')
  return { success: true }
}

export async function deleteCompetitor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('competitors').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/competitors')
  return { success: true }
}
