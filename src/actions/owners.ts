'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function searchOwners(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const q = admin
    .from('owners')
    .select('id, full_name, email, phone, nif, language')
    .order('full_name', { ascending: true })
    .limit(20)

  if (query && query.trim()) {
    const search = `%${query.trim()}%`
    const { data } = await q.or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search},nif.ilike.${search}`)
    return { owners: data || [] }
  }
  const { data } = await q
  return { owners: data || [] }
}

export async function createOwner(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const firstName = ((formData.get('first_name') as string) || '').trim()
  const lastName = ((formData.get('last_name') as string) || '').trim()
  const phone = ((formData.get('phone') as string) || '').trim()
  const fullName = `${firstName} ${lastName}`.trim()

  // Obligatorios reales según Chloe: Nombre + Apellido + Teléfono
  // (Email opcional — los propietarios no siempre tienen / no siempre lo dan)
  if (!firstName) return { error: 'Nombre obligatorio' }
  if (!lastName) return { error: 'Apellido obligatorio' }
  if (!phone) return { error: 'Teléfono obligatorio (sin teléfono no podemos contactar al propietario)' }

  const admin = createAdminClient()
  const { data, error } = await admin.from('owners').insert({
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: fullName,
    email: ((formData.get('email') as string) || '').trim() || null,
    phone: ((formData.get('phone') as string) || '').trim() || null,
    nif: ((formData.get('nif') as string) || '').trim() || null,
    language: ((formData.get('language') as string) || '').trim() || null,
    notes: ((formData.get('notes') as string) || '').trim() || null,
    created_by: user.id,
  }).select('id, full_name, email, phone, nif, language').single()

  if (error) return { error: error.message }

  revalidatePath('/properties')
  return { owner: data }
}

export async function updateOwner(ownerId: string, patch: Partial<{
  first_name: string
  last_name: string
  email: string
  phone: string
  nif: string
  language: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  Object.entries(patch).forEach(([k, v]) => { if (v !== undefined) updates[k] = v })

  if (patch.first_name !== undefined || patch.last_name !== undefined) {
    const { data: existing } = await admin.from('owners').select('first_name, last_name').eq('id', ownerId).single()
    const fn = patch.first_name ?? existing?.first_name ?? ''
    const ln = patch.last_name ?? existing?.last_name ?? ''
    updates.full_name = `${fn} ${ln}`.trim()
  }

  const { error } = await admin.from('owners').update(updates).eq('id', ownerId)
  if (error) return { error: error.message }

  revalidatePath('/properties')
  return { success: true }
}
