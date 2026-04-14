'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function addExclusiveHome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') return { error: 'Not authorized' }

  const coverImageFile = formData.get('cover_image') as File | null
  let coverImageUrl: string | null = null

  if (coverImageFile && coverImageFile.size > 0) {
    const ext = coverImageFile.name.split('.').pop() || 'jpg'
    const path = `exclusive-homes/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(path, coverImageFile, { contentType: coverImageFile.type, upsert: false })
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path)
      coverImageUrl = publicUrl
    }
  }

  const featuresRaw = formData.get('features') as string
  const features = featuresRaw ? featuresRaw.split(',').map((f) => f.trim()).filter(Boolean) : []

  const { error } = await supabase.from('exclusive_homes').insert({
    title: formData.get('title') as string,
    location: (formData.get('location') as string) || null,
    price: parseFloat(formData.get('price') as string) || null,
    bedrooms: parseInt(formData.get('bedrooms') as string) || null,
    bathrooms: parseInt(formData.get('bathrooms') as string) || null,
    area_m2: parseInt(formData.get('area_m2') as string) || null,
    description: (formData.get('description') as string) || null,
    cover_image: coverImageUrl,
    features,
    is_active: true,
    added_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateExclusiveHome(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') return { error: 'Not authorized' }

  const coverImageFile = formData.get('cover_image') as File | null
  let coverImageUrl: string | undefined = undefined

  if (coverImageFile && coverImageFile.size > 0) {
    const ext = coverImageFile.name.split('.').pop() || 'jpg'
    const path = `exclusive-homes/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(path, coverImageFile, { contentType: coverImageFile.type, upsert: false })
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path)
      coverImageUrl = publicUrl
    }
  }

  const featuresRaw = formData.get('features') as string
  const features = featuresRaw ? featuresRaw.split(',').map((f) => f.trim()).filter(Boolean) : []

  const updateData: Record<string, unknown> = {
    title: formData.get('title') as string,
    location: (formData.get('location') as string) || null,
    price: parseFloat(formData.get('price') as string) || null,
    bedrooms: parseInt(formData.get('bedrooms') as string) || null,
    bathrooms: parseInt(formData.get('bathrooms') as string) || null,
    area_m2: parseInt(formData.get('area_m2') as string) || null,
    description: (formData.get('description') as string) || null,
    features,
    updated_at: new Date().toISOString(),
  }
  if (coverImageUrl) updateData.cover_image = coverImageUrl

  const { error } = await supabase.from('exclusive_homes').update(updateData).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExclusiveHome(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'secretary') return { error: 'Not authorized' }

  const { error } = await supabase.from('exclusive_homes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleExclusiveHomeActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('exclusive_homes').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
